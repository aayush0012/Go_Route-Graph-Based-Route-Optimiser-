import pytest
from app.services.pathfinding import haversine_distance, dijkstra, a_star


def test_haversine_distance():
    # Delhi to Mumbai approximate coords
    delhi = (28.6139, 77.2090)
    mumbai = (19.0760, 72.8777)
    dist = haversine_distance(delhi, mumbai)
    # Straight-line distance is ~1148 km
    assert 1100 < dist < 1200

    # None / Missing coords fallback to 0.0
    assert haversine_distance(None, mumbai) == 0.0
    assert haversine_distance(delhi, None) == 0.0
    assert haversine_distance((None, None), mumbai) == 0.0


def test_a_star_shortest_path():
    # Graph with 3 cities: A(1) -> B(2) -> C(3), and A(1) -> C(3)
    coords = {
        1: (28.6139, 77.2090),  # A
        2: (27.1767, 78.0081),  # B (Agra)
        3: (26.8467, 80.9462),  # C (Lucknow)
    }

    graph = {
        1: [(2, 200), (3, 600)],
        2: [(1, 200), (3, 300)],
        3: [(1, 600), (2, 300)]
    }

    # Dijkstra vs A*
    d_dist, d_path = dijkstra(graph, 1, 3)
    a_dist, a_path = a_star(graph, 1, 3, coordinates=coords)

    assert d_dist == 500
    assert d_path == [1, 2, 3]
    assert a_dist == 500
    assert a_path == [1, 2, 3]


def test_min_distance_selection():
    from app.services.route_service import get_effective_road_distance

    class DummyRoad:
        def __init__(self, s, d, dist):
            self.source_city_id = s
            self.destination_city_id = d
            self.distance = dist

    coords = {
        1: (28.6139, 77.2090), # Delhi
        2: (28.5355, 77.3910), # Noida (~20-25 km straight line)
    }

    # Case 1: User distance is larger than coord distance -> min picks coord distance
    road1 = DummyRoad(1, 2, 100)
    eff1 = get_effective_road_distance(road1, coords)
    assert eff1 < 100
    assert 15 < eff1 < 35

    # Case 2: User distance is smaller than coord distance -> min picks user distance
    road2 = DummyRoad(1, 2, 10)
    eff2 = get_effective_road_distance(road2, coords)
    assert eff2 == 10.0
