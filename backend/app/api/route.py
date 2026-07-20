from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.city import City
from app.models.road import Road
from app.schemas.route import RouteRequest
from app.services.pathfinding import dijkstra, bellman_ford, a_star

router = APIRouter(
    prefix="/route",
    tags=["Route"],
)


@router.post("/")
def find_shortest_route(
    request: RouteRequest,
    db: Session = Depends(get_db),
):

    source = db.query(City).filter(
        City.id == request.source_city_id
    ).first()

    destination = db.query(City).filter(
        City.id == request.destination_city_id
    ).first()

    if not source or not destination:
        raise HTTPException(
            status_code=404,
            detail="City not found",
        )

    roads = db.query(Road).all()

    graph = defaultdict(list)

    for road in roads:

        graph[road.source_city_id].append(
            (
                road.destination_city_id,
                road.distance,
            )
        )

        if road.is_bidirectional:

            graph[road.destination_city_id].append(
                (
                    road.source_city_id,
                    road.distance,
                )
            )

    import time
    start_time = time.perf_counter()

    waypoints = [request.source_city_id] + (request.stops or []) + [request.destination_city_id]
    
    total_distance = 0
    full_path = []
    algo = request.algorithm.lower() if request.algorithm else "dijkstra"

    for i in range(len(waypoints) - 1):
        start_node = waypoints[i]
        end_node = waypoints[i + 1]

        if start_node == end_node:
            continue

        if algo == "bellman_ford":
            res = bellman_ford(graph, start_node, end_node)
        elif algo == "a_star":
            res = a_star(graph, start_node, end_node)
        else:
            res = dijkstra(graph, start_node, end_node)

        if res is None:
            c_start = db.query(City).filter(City.id == start_node).first()
            c_end = db.query(City).filter(City.id == end_node).first()
            start_name = c_start.name if c_start else f"ID {start_node}"
            end_name = c_end.name if c_end else f"ID {end_node}"
            raise HTTPException(
                status_code=404,
                detail=f"No route found between {start_name} and {end_name}",
            )

        dist, path = res
        total_distance += dist

        if i == 0:
            full_path.extend(path)
        else:
            full_path.extend(path[1:])

    # Compute optimal direct route without intermediate stops for comparison
    direct_res = None
    if algo == "bellman_ford":
        direct_res = bellman_ford(graph, request.source_city_id, request.destination_city_id)
    elif algo == "a_star":
        direct_res = a_star(graph, request.source_city_id, request.destination_city_id)
    else:
        direct_res = dijkstra(graph, request.source_city_id, request.destination_city_id)

    cities = db.query(City).all()
    city_map = {city.id: city for city in cities}
    city_name_map = {city.id: city.name for city in cities}

    city_names = [city_name_map.get(city_id, f"ID {city_id}") for city_id in full_path]

    path_nodes = []
    for city_id in full_path:
        c = city_map.get(city_id)
        if c:
            path_nodes.append({
                "id": c.id,
                "name": c.name,
                "lat": c.latitude,
                "lng": c.longitude
            })

    road_distances = {}
    for road in db.query(Road).all():
        road_distances[(road.source_city_id, road.destination_city_id)] = road.distance
        if road.is_bidirectional:
            road_distances[(road.destination_city_id, road.source_city_id)] = road.distance

    segments = []
    for i in range(len(full_path) - 1):
        s_id = full_path[i]
        d_id = full_path[i+1]
        dist = road_distances.get((s_id, d_id), 0)
        s_city = city_map.get(s_id)
        d_city = city_map.get(d_id)
        segments.append({
            "source": city_name_map.get(s_id, f"ID {s_id}"),
            "destination": city_name_map.get(d_id, f"ID {d_id}"),
            "distance": dist,
            "source_coords": [s_city.latitude, s_city.longitude] if s_city and s_city.latitude is not None else None,
            "dest_coords": [d_city.latitude, d_city.longitude] if d_city and d_city.latitude is not None else None,
        })

    # Build optimal direct route data structure
    optimal_route_data = None
    comparison_data = None

    if direct_res:
        opt_dist, opt_path = direct_res
        opt_city_names = [city_name_map.get(city_id, f"ID {city_id}") for city_id in opt_path]
        opt_path_nodes = []
        for city_id in opt_path:
            c = city_map.get(city_id)
            if c:
                opt_path_nodes.append({
                    "id": c.id,
                    "name": c.name,
                    "lat": c.latitude,
                    "lng": c.longitude
                })

        opt_segments = []
        for i in range(len(opt_path) - 1):
            s_id = opt_path[i]
            d_id = opt_path[i+1]
            dist = road_distances.get((s_id, d_id), 0)
            s_city = city_map.get(s_id)
            d_city = city_map.get(d_id)
            opt_segments.append({
                "source": city_name_map.get(s_id, f"ID {s_id}"),
                "destination": city_name_map.get(d_id, f"ID {d_id}"),
                "distance": dist,
                "source_coords": [s_city.latitude, s_city.longitude] if s_city and s_city.latitude is not None else None,
                "dest_coords": [d_city.latitude, d_city.longitude] if d_city and d_city.latitude is not None else None,
            })

        optimal_route_data = {
            "distance": opt_dist,
            "path": opt_city_names,
            "path_nodes": opt_path_nodes,
            "segments": opt_segments,
        }

        diff_dist = max(0, total_distance - opt_dist)
        diff_pct = round(((total_distance - opt_dist) / opt_dist) * 100, 1) if opt_dist > 0 else 0
        diff_time = round((diff_dist / 70.0) * 60)
        diff_fuel = round((diff_dist * 8.0) / 100.0, 1)

        comparison_data = {
            "has_stops": bool(request.stops and len(request.stops) > 0),
            "user_distance": total_distance,
            "optimal_distance": opt_dist,
            "extra_distance": round(diff_dist, 2),
            "extra_distance_pct": diff_pct,
            "extra_time_minutes": diff_time,
            "extra_fuel_liters": diff_fuel,
            "is_identical": total_distance == opt_dist and full_path == opt_path,
        }

    return {
        "distance": total_distance,
        "path": city_names,
        "path_nodes": path_nodes,
        "segments": segments,
        "optimal_route": optimal_route_data,
        "comparison": comparison_data
    }