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

    city_names = []
    for city_id in full_path:
        city = db.query(City).filter(City.id == city_id).first()
        city_names.append(city.name if city else f"ID {city_id}")

    return {
        "distance": total_distance,
        "path": city_names,
    }