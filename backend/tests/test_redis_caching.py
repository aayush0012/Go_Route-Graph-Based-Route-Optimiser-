import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.database import get_db, SessionLocal
from app.models.city import City
from app.models.road import Road
from app.services.cache_service import invalidate_all_caches, check_rate_limit, is_redis_available

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_and_teardown_db():
    db = SessionLocal()
    # Ensure test cities and roads exist
    c1 = db.query(City).filter(City.name == "TestCityA").first()
    if not c1:
        c1 = City(name="TestCityA", latitude=28.61, longitude=77.20)
        db.add(c1)
    
    c2 = db.query(City).filter(City.name == "TestCityB").first()
    if not c2:
        c2 = City(name="TestCityB", latitude=19.07, longitude=72.87)
        db.add(c2)
    
    db.commit()
    db.refresh(c1)
    db.refresh(c2)

    r1 = db.query(Road).filter(Road.source_city_id == c1.id, Road.destination_city_id == c2.id).first()
    if not r1:
        r1 = Road(source_city_id=c1.id, destination_city_id=c2.id, distance=100, is_bidirectional=True)
        db.add(r1)
        db.commit()

    invalidate_all_caches()
    
    yield {"c1": c1, "c2": c2}
    
    db.close()


def test_a_route_cache_miss_and_hit(setup_and_teardown_db):
    c1 = setup_and_teardown_db["c1"]
    c2 = setup_and_teardown_db["c2"]
    
    payload = {
        "source_city_id": c1.id,
        "destination_city_id": c2.id,
        "algorithm": "dijkstra",
        "stops": []
    }

    # First request: Cache MISS
    res1 = client.post("/route/", json=payload)
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["distance"] == 100
    assert data1["cached"] is False

    # Second request: Cache HIT (if Redis is online)
    res2 = client.post("/route/", json=payload)
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["distance"] == 100
    if is_redis_available():
        assert data2["cached"] is True


def test_b_different_route_parameters(setup_and_teardown_db):
    c1 = setup_and_teardown_db["c1"]
    c2 = setup_and_teardown_db["c2"]

    payload1 = {"source_city_id": c1.id, "destination_city_id": c2.id, "algorithm": "dijkstra"}
    payload2 = {"source_city_id": c1.id, "destination_city_id": c2.id, "algorithm": "a_star"}

    res1 = client.post("/route/", json=payload1)
    res2 = client.post("/route/", json=payload2)

    assert res1.status_code == 200
    assert res2.status_code == 200


def test_c_cache_invalidation_on_road_mutation(setup_and_teardown_db):
    c1 = setup_and_teardown_db["c1"]
    c2 = setup_and_teardown_db["c2"]

    payload = {"source_city_id": c1.id, "destination_city_id": c2.id, "algorithm": "dijkstra"}

    # Prime cache
    res1 = client.post("/route/", json=payload)
    assert res1.status_code == 200

    # Invalidate cache directly
    deleted = invalidate_all_caches()
    
    # Next request should be Cache MISS
    res2 = client.post("/route/", json=payload)
    assert res2.status_code == 200
    assert res2.json()["cached"] is False


def test_d_rate_limiting():
    client_id = "test_rate_limit_user"
    
    if not is_redis_available():
        pytest.skip("Redis offline, rate limiting fails open.")

    # Execute 30 requests
    for _ in range(30):
        allowed, _ = check_rate_limit(client_id, limit=30, window_seconds=60)
        assert allowed is True

    # 31st request must be blocked
    allowed_31, _ = check_rate_limit(client_id, limit=30, window_seconds=60)
    assert allowed_31 is False
