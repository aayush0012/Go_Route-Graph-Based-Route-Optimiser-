import heapq

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

def bellman_ford(graph, source, destination):
    nodes = set()
    for u in graph:
        nodes.add(u)
        for v, _ in graph[u]:
            nodes.add(v)

    distance = {node: float("inf") for node in nodes}
    distance[source] = 0
    parent = {source: None}

    for _ in range(len(nodes) - 1):
        for u in graph:
            for v, w in graph[u]:
                if distance[u] != float("inf") and distance[u] + w < distance[v]:
                    distance[v] = distance[u] + w
                    parent[v] = u

    if distance.get(destination, float("inf")) == float("inf"):
        return None

    path = []
    current = destination
    while current is not None:
        path.append(current)
        current = parent.get(current)
    path.reverse()
    return distance[destination], path


def a_star(graph, source, destination):

    def heuristic(node):
        return 0

   
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
