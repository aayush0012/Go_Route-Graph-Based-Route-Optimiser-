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


def solve_tsp(
    graph: Dict[int, list],
    source: int,
    stops: list,
    destination: int,
    coordinates: Optional[Dict[int, Tuple[Optional[float], Optional[float]]]] = None,
    algo: str = "a_star",
) -> Optional[Tuple[list, float, list]]:
    """
    Solves the Fixed-Endpoint Traveling Salesperson Problem (TSP).
    Finds the optimal permutation of intermediate `stops` to minimize the total path distance
    starting at `source` and terminating at `destination`.

    Returns:
        (optimal_ordered_stops, total_distance, full_path_nodes)
    """
    if not stops:
        fn = a_star if algo == "a_star" else dijkstra
        res = fn(graph, source, destination, coordinates=coordinates) if algo == "a_star" else fn(graph, source, destination)
        if res is None:
            return None
        dist, path = res
        return [], dist, path

    unique_stops = [s for s in stops if s != source and s != destination]
    if not unique_stops:
        fn = a_star if algo == "a_star" else dijkstra
        res = fn(graph, source, destination, coordinates=coordinates) if algo == "a_star" else fn(graph, source, destination)
        if res is None:
            return None
        dist, path = res
        return [], dist, path

    # All critical nodes
    all_points = [source] + unique_stops + ([destination] if destination != source else [])
    points_set = list(dict.fromkeys(all_points))

    # Precompute all-pairs shortest paths among critical nodes
    pairwise_dist = {}
    pairwise_path = {}

    path_fn = a_star if algo == "a_star" else dijkstra

    for u in points_set:
        for v in points_set:
            if u == v:
                pairwise_dist[(u, v)] = 0.0
                pairwise_path[(u, v)] = [u]
            else:
                if algo == "a_star":
                    res = path_fn(graph, u, v, coordinates=coordinates)
                else:
                    res = path_fn(graph, u, v)

                if res is None:
                    # If disconnected, fallback to direct search failure
                    return None
                dist, path = res
                pairwise_dist[(u, v)] = dist
                pairwise_path[(u, v)] = path

    k = len(unique_stops)

    # 1. Exact Bitmask Dynamic Programming for k <= 10 stops (Held-Karp variant)
    if k <= 10:
        # dp[mask][last_idx] = (min_dist, prev_idx)
        # mask: bitmask of visited unique_stops (0 to (1<<k) - 1)
        dp = {}

        # Base cases: start from source to each first stop
        for i in range(k):
            mask = 1 << i
            stop_id = unique_stops[i]
            d = pairwise_dist.get((source, stop_id), float("inf"))
            dp[(mask, i)] = (d, -1)

        # Iterate over subset sizes
        for mask in range(1, 1 << k):
            for i in range(k):
                if not (mask & (1 << i)):
                    continue
                current_dist, _ = dp.get((mask, i), (float("inf"), -1))
                if current_dist == float("inf"):
                    continue

                stop_i = unique_stops[i]
                # Try transitioning to next stop j
                for j in range(k):
                    if mask & (1 << j):
                        continue
                    next_mask = mask | (1 << j)
                    stop_j = unique_stops[j]
                    step_cost = pairwise_dist.get((stop_i, stop_j), float("inf"))
                    new_dist = current_dist + step_cost

                    existing_dist, _ = dp.get((next_mask, j), (float("inf"), -1))
                    if new_dist < existing_dist:
                        dp[(next_mask, j)] = (new_dist, i)

        # Connect the last stop to destination
        full_mask = (1 << k) - 1
        best_total = float("inf")
        best_last = -1

        for i in range(k):
            cost_to_last, _ = dp.get((full_mask, i), (float("inf"), -1))
            if cost_to_last == float("inf"):
                continue
            last_stop_id = unique_stops[i]
            to_dest = pairwise_dist.get((last_stop_id, destination), float("inf"))
            total = cost_to_last + to_dest
            if total < best_total:
                best_total = total
                best_last = i

        if best_last == -1:
            return None

        # Reconstruct optimal sequence of unique_stops
        ordered_indices = []
        curr_mask = full_mask
        curr_idx = best_last

        while curr_idx != -1:
            ordered_indices.append(curr_idx)
            _, prev_idx = dp[(curr_mask, curr_idx)]
            curr_mask = curr_mask ^ (1 << curr_idx)
            curr_idx = prev_idx

        ordered_indices.reverse()
        best_stops = [unique_stops[idx] for idx in ordered_indices]

    else:
        # 2. Heuristic: Greedy Nearest Neighbor + 2-Opt for large stop counts (k > 10)
        unvisited = set(range(k))
        current_node = source
        tour_indices = []

        while unvisited:
            next_idx = min(unvisited, key=lambda idx: pairwise_dist.get((current_node, unique_stops[idx]), float("inf")))
            tour_indices.append(next_idx)
            unvisited.remove(next_idx)
            current_node = unique_stops[next_idx]

        def calculate_tour_distance(indices):
            d = pairwise_dist.get((source, unique_stops[indices[0]]), float("inf"))
            for idx in range(len(indices) - 1):
                d += pairwise_dist.get((unique_stops[indices[idx]], unique_stops[indices[idx + 1]]), float("inf"))
            d += pairwise_dist.get((unique_stops[indices[-1]], destination), float("inf"))
            return d

        improved = True
        best_distance = calculate_tour_distance(tour_indices)

        while improved:
            improved = False
            for i in range(len(tour_indices) - 1):
                for j in range(i + 1, len(tour_indices)):
                    new_indices = tour_indices[:i] + tour_indices[i:j + 1][::-1] + tour_indices[j + 1:]
                    new_dist = calculate_tour_distance(new_indices)
                    if new_dist < best_distance - 1e-6:
                        best_distance = new_dist
                        tour_indices = new_indices
                        improved = True
                        break
                if improved:
                    break

        best_stops = [unique_stops[idx] for idx in tour_indices]
        best_total = best_distance

    # Reconstruct the full node-by-node path
    full_path_nodes = []
    current_point = source

    for stop_id in best_stops:
        segment_path = pairwise_path.get((current_point, stop_id), [current_point, stop_id])
        if not full_path_nodes:
            full_path_nodes.extend(segment_path)
        else:
            full_path_nodes.extend(segment_path[1:])
        current_point = stop_id

    final_segment = pairwise_path.get((current_point, destination), [current_point, destination])
    if not full_path_nodes:
        full_path_nodes.extend(final_segment)
    else:
        full_path_nodes.extend(final_segment[1:])

    return best_stops, round(best_total, 2), full_path_nodes


