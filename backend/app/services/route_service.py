import time
from collections import defaultdict
from typing import Dict, List, Tuple, Any, Optional
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.city import City
from app.models.road import Road
from app.schemas.route import RouteRequest
from app.services.pathfinding import dijkstra, a_star, haversine_distance, solve_tsp


def get_effective_road_distance(
    road: Road,
    coords: Dict[int, Tuple[Optional[float], Optional[float]]],
) -> float:
    """
    Computes the effective distance for a road edge:
    Prioritizes actual curated highway road distance.
    Falls back to GPS coordinate Haversine distance if road distance is not set.
    """
    user_dist = float(road.distance) if road.distance is not None else 0.0
    if user_dist > 0:
        return user_dist

    c1 = coords.get(road.source_city_id)
    c2 = coords.get(road.destination_city_id)
    return haversine_distance(c1, c2)



def get_or_build_graph(db: Session, user_id: int) -> Tuple[Dict[int, List[Tuple[int, float]]], Dict[int, Tuple[Optional[float], Optional[float]]]]:
    cities = db.query(City).filter(City.user_id == user_id).all()
    city_coords = {c.id: (c.latitude, c.longitude) for c in cities}

    roads = db.query(Road).filter(Road.user_id == user_id).all()
    graph = defaultdict(list)
    for road in roads:
        eff_dist = get_effective_road_distance(road, city_coords)
        graph[road.source_city_id].append((road.destination_city_id, eff_dist))
        if road.is_bidirectional:
            graph[road.destination_city_id].append((road.source_city_id, eff_dist))

    return graph, city_coords


def compute_route_from_graph(
    request: RouteRequest,
    db: Session,
    user_id: int,
    graph: Dict[int, List[Tuple[int, float]]],
    city_coords: Optional[Dict[int, Tuple[Optional[float], Optional[float]]]] = None,
) -> Dict[str, Any]:
    source = db.query(City).filter(
        City.id == request.source_city_id,
        City.user_id == user_id
    ).first()
    
    destination = db.query(City).filter(
        City.id == request.destination_city_id,
        City.user_id == user_id
    ).first()

    if not source or not destination:
        raise HTTPException(
            status_code=404,
            detail="Source or Destination city not found in your workspace",
        )

    if city_coords is None:
        cities = db.query(City).filter(City.user_id == user_id).all()
        city_coords = {c.id: (c.latitude, c.longitude) for c in cities}

    algo = (request.algorithm or "dijkstra").lower()
    has_stops = bool(request.stops and len(request.stops) > 0)

    # 1. Compute TSP optimal sequence if multiple stops are present
    tsp_data = None
    best_stops = request.stops or []
    if has_stops:
        tsp_result = solve_tsp(
            graph=graph,
            source=request.source_city_id,
            stops=request.stops or [],
            destination=request.destination_city_id,
            coordinates=city_coords,
            algo=algo,
        )
        if tsp_result is not None:
            best_stops, tsp_opt_dist, tsp_opt_path = tsp_result
            tsp_data = {
                "optimized_stops": best_stops,
                "optimized_distance": round(tsp_opt_dist, 2),
                "optimized_path_nodes": tsp_opt_path,
            }

    # Decide active waypoints sequence
    active_stops = best_stops if (request.optimize_stops and has_stops) else (request.stops or [])
    waypoints = [request.source_city_id] + active_stops + [request.destination_city_id]
    total_distance = 0.0
    full_path = []

    for i in range(len(waypoints) - 1):
        start_node = waypoints[i]
        end_node = waypoints[i + 1]

        if start_node == end_node:
            continue

        if algo == "a_star":
            res = a_star(graph, start_node, end_node, coordinates=city_coords)
        else:
            res = dijkstra(graph, start_node, end_node)

        if res is None:
            c_start = db.query(City).filter(City.id == start_node, City.user_id == user_id).first()
            c_end = db.query(City).filter(City.id == end_node, City.user_id == user_id).first()
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

    # Compute direct route for comparison
    direct_res = None
    if algo == "a_star":
        direct_res = a_star(graph, request.source_city_id, request.destination_city_id, coordinates=city_coords)
    else:
        direct_res = dijkstra(graph, request.source_city_id, request.destination_city_id)

    cities = db.query(City).filter(City.user_id == user_id).all()
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
    for road in db.query(Road).filter(Road.user_id == user_id).all():
        eff_dist = get_effective_road_distance(road, city_coords)
        road_distances[(road.source_city_id, road.destination_city_id)] = eff_dist
        if road.is_bidirectional:
            road_distances[(road.destination_city_id, road.source_city_id)] = eff_dist

    segments = []
    for i in range(len(full_path) - 1):
        s_id = full_path[i]
        d_id = full_path[i + 1]
        dist = road_distances.get((s_id, d_id), 0.0)
        s_city = city_map.get(s_id)
        d_city = city_map.get(d_id)
        segments.append({
            "source": city_name_map.get(s_id, f"ID {s_id}"),
            "destination": city_name_map.get(d_id, f"ID {d_id}"),
            "distance": round(dist, 2),
            "source_coords": [s_city.latitude, s_city.longitude] if s_city and s_city.latitude is not None else None,
            "dest_coords": [d_city.latitude, d_city.longitude] if d_city and d_city.latitude is not None else None,
        })

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
            d_id = opt_path[i + 1]
            dist = road_distances.get((s_id, d_id), 0.0)
            s_city = city_map.get(s_id)
            d_city = city_map.get(d_id)
            opt_segments.append({
                "source": city_name_map.get(s_id, f"ID {s_id}"),
                "destination": city_name_map.get(d_id, f"ID {d_id}"),
                "distance": round(dist, 2),
                "source_coords": [s_city.latitude, s_city.longitude] if s_city and s_city.latitude is not None else None,
                "dest_coords": [d_city.latitude, d_city.longitude] if d_city and d_city.latitude is not None else None,
            })

        optimal_route_data = {
            "distance": round(opt_dist, 2),
            "path": opt_city_names,
            "path_nodes": opt_path_nodes,
            "segments": opt_segments,
        }

        diff_dist = max(0.0, total_distance - opt_dist)
        diff_pct = round(((total_distance - opt_dist) / opt_dist) * 100, 1) if opt_dist > 0 else 0
        diff_time = round((diff_dist / 70.0) * 60)
        diff_fuel = round((diff_dist * 8.0) / 100.0, 1)

        comparison_data = {
            "has_stops": has_stops,
            "user_distance": round(total_distance, 2),
            "optimal_distance": round(opt_dist, 2),
            "extra_distance": round(diff_dist, 2),
            "extra_distance_pct": diff_pct,
            "extra_time_minutes": diff_time,
            "extra_fuel_liters": diff_fuel,
            "is_identical": round(total_distance, 2) == round(opt_dist, 2) and full_path == opt_path,
        }

    # Compute TSP savings metrics if stops were reordered
    tsp_savings = None
    if tsp_data and has_stops and len(request.stops or []) >= 1:
        tsp_opt_dist = tsp_data["optimized_distance"]
        unoptimized_dist = total_distance if not request.optimize_stops else None
        
        # If user ran with optimize_stops=True, calculate what the unoptimized distance would have been
        if unoptimized_dist is None:
            # compute unoptimized manual distance
            raw_unopt = 0.0
            unopt_waypoints = [request.source_city_id] + (request.stops or []) + [request.destination_city_id]
            for j in range(len(unopt_waypoints) - 1):
                if unopt_waypoints[j] != unopt_waypoints[j + 1]:
                    r = a_star(graph, unopt_waypoints[j], unopt_waypoints[j + 1], coordinates=city_coords) if algo == "a_star" else dijkstra(graph, unopt_waypoints[j], unopt_waypoints[j + 1])
                    if r:
                        raw_unopt += r[0]
            unoptimized_dist = round(raw_unopt, 2)

        saved_km = max(0.0, round(unoptimized_dist - tsp_opt_dist, 2))
        saved_pct = round((saved_km / unoptimized_dist) * 100, 1) if unoptimized_dist > 0 else 0.0
        saved_fuel = round(saved_km / 16.0, 1)
        saved_toll = round(saved_km * 1.8)

        opt_stop_names = [city_name_map.get(sid, f"ID {sid}") for sid in tsp_data["optimized_stops"]]

        tsp_savings = {
            "is_optimized": bool(request.optimize_stops),
            "original_stops": request.stops or [],
            "optimized_stops": tsp_data["optimized_stops"],
            "optimized_stop_names": opt_stop_names,
            "unoptimized_distance": unoptimized_dist,
            "optimized_distance": tsp_opt_dist,
            "saved_distance_km": saved_km,
            "savings_percentage": saved_pct,
            "saved_fuel_liters": saved_fuel,
            "saved_toll_inr": saved_toll,
            "can_save": saved_km > 0.5 and (request.stops != tsp_data["optimized_stops"]),
        }

    return {
        "distance": round(total_distance, 2),
        "path": city_names,
        "path_nodes": path_nodes,
        "segments": segments,
        "optimal_route": optimal_route_data,
        "comparison": comparison_data,
        "tsp_savings": tsp_savings,
    }


def calculate_route(request: RouteRequest, db: Session, user_id: int) -> Dict[str, Any]:
    graph, city_coords = get_or_build_graph(db, user_id)
    return compute_route_from_graph(request, db, user_id, graph, city_coords)


