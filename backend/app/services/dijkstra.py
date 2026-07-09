import heapq
def dijkstra(graph, source, destination):

    pq = [(0, source)]

    distance = {node: float("inf") for node in graph}
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

            if new_distance < distance[neighbour]:

                distance[neighbour] = new_distance

                parent[neighbour] = node

                heapq.heappush(
                    pq,
                    (new_distance, neighbour)
                )

    if distance[destination] == float("inf"):
        return None

    path = []

    current = destination

    while current is not None:

        path.append(current)

        current = parent[current]

    path.reverse()

    return distance[destination], path