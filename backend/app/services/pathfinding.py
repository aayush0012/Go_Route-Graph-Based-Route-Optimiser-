import heapq
import math
from typing import Dict, Optional, Tuple


def haversine_distance(
    coord1: Optional[Tuple[Optional[float], Optional[float]]],
    coord2: Optional[Tuple[Optional[float], Optional[float]]],
) -> float:
    """
    Calculate the great-circle distance between two points on the Earth (in km)
    using the Haversine formula.
    coord = (latitude, longitude)
    """
    if not coord1 or not coord2:
        return 0.0

    lat1, lon1 = coord1
    lat2, lon2 = coord2

    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return 0.0

    # Earth radius in kilometers
    R = 6371.0

    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)


def dijkstra(graph, source, destination):
    pq = [(0, source)]
    distance = {node: float("inf") for node in graph}

    for u in graph:
        for v, _ in graph[u]:
            if v not in distance:
                distance[v] = float("inf")
    distance[source] = 0
    parent = {source: None}

    while pq:
        dist, node = heapq.heappop(pq)
        if node == destination:
            break
        if dist > distance[node]:
            continue
        for neighbour, weight in graph[node]:
            new_distance = dist + weight
            if new_distance < distance.get(neighbour, float("inf")):
                distance[neighbour] = new_distance
                parent[neighbour] = node
                heapq.heappush(pq, (new_distance, neighbour))

    if distance.get(destination, float("inf")) == float("inf"):
        return None

    path = []
    current = destination
    while current is not None:
        path.append(current)
        current = parent.get(current)
    path.reverse()
    return distance[destination], path


def a_star(graph, source, destination, coordinates: Optional[Dict[int, Tuple[Optional[float], Optional[float]]]] = None):
    dest_coord = coordinates.get(destination) if coordinates else None

    def heuristic(node):
        if not coordinates or not dest_coord:
            return 0.0
        node_coord = coordinates.get(node)
        return haversine_distance(node_coord, dest_coord)

    open_set = [(heuristic(source), source)]
    g_score = {node: float("inf") for node in graph}

    for u in graph:
        for v, _ in graph[u]:
            if v not in g_score:
                g_score[v] = float("inf")
    g_score[source] = 0

    f_score = {node: float("inf") for node in g_score}
    f_score[source] = heuristic(source)

    parent = {source: None}
    closed_set = set()

    while open_set:
        _, current = heapq.heappop(open_set)

        if current == destination:
            break

        if current in closed_set:
            continue
        closed_set.add(current)

        for neighbour, weight in graph[current]:
            tentative_g_score = g_score[current] + weight
            if tentative_g_score < g_score.get(neighbour, float("inf")):
                parent[neighbour] = current
                g_score[neighbour] = tentative_g_score
                f_score[neighbour] = tentative_g_score + heuristic(neighbour)
                heapq.heappush(open_set, (f_score[neighbour], neighbour))

    if g_score.get(destination, float("inf")) == float("inf"):
        return None

    path = []
    current = destination
    while current is not None:
        path.append(current)
        current = parent.get(current)
    path.reverse()
    return g_score[destination], path

