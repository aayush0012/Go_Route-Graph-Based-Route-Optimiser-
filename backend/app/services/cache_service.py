import json
import logging
import time
from typing import Any, Optional, Dict, List, Tuple
import redis

from app.core.config import (
    REDIS_URL,
    REDIS_HOST,
    REDIS_PORT,
    ROUTE_CACHE_TTL,
    GRAPH_CACHE_TTL,
    RATE_LIMIT_REQUESTS,
    RATE_LIMIT_WINDOW,
)

logger = logging.getLogger("routeiq.cache")
logging.basicConfig(level=logging.INFO)

_last_failed_time = 0.0
FAILURE_COOLDOWN_SEC = 5.0

# Connection pool setup with non-blocking socket timeouts
try:
    if REDIS_URL and REDIS_URL.startswith("redis://"):
        pool = redis.ConnectionPool.from_url(
            REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=0.15,
            socket_timeout=0.15,
        )
    else:
        pool = redis.ConnectionPool(
            host=REDIS_HOST,
            port=REDIS_PORT,
            decode_responses=True,
            socket_connect_timeout=0.15,
            socket_timeout=0.15,
        )
    redis_client = redis.Redis(connection_pool=pool)
    logger.info("⚡ Redis connection pool initialized.")
except Exception as err:
    logger.warning(f"⚠️ Failed to initialize Redis pool: {err}")
    redis_client = None


def is_redis_available() -> bool:
    global _last_failed_time
    if not redis_client or (time.time() - _last_failed_time < FAILURE_COOLDOWN_SEC):
        return False
    try:
        res = redis_client.ping()
        return bool(res)
    except Exception:
        _last_failed_time = time.time()
        return False


# --- 1. Route Result Caching ---

def build_route_cache_key(source_id: int, dest_id: int, stops: Optional[List[int]], algo: str) -> str:
    stops_str = ",".join(map(str, sorted(stops))) if stops else "none"
    algo_str = (algo or "dijkstra").lower()
    return f"route:{source_id}:{dest_id}:{stops_str}:{algo_str}"


def get_route_result(cache_key: str) -> Optional[Dict[str, Any]]:
    global _last_failed_time
    if not is_redis_available():
        return None
    try:
        data = redis_client.get(cache_key)
        if data:
            logger.info(f"⚡ [Cache HIT] Route key: {cache_key}")
            return json.loads(data)
        logger.info(f"🔍 [Cache MISS] Route key: {cache_key}")
    except Exception as err:
        _last_failed_time = time.time()
        logger.warning(f"⚠️ Redis get_route_result fallback (Error: {err})")
    return None


def set_route_result(cache_key: str, value: Dict[str, Any], ttl: int = ROUTE_CACHE_TTL) -> bool:
    global _last_failed_time
    if not is_redis_available():
        return False
    try:
        serialized = json.dumps(value)
        redis_client.set(cache_key, serialized, ex=ttl)
        logger.info(f"💾 [Cache STORE] Route key: {cache_key} (TTL: {ttl}s)")
        return True
    except Exception as err:
        _last_failed_time = time.time()
        logger.warning(f"⚠️ Redis set_route_result fallback (Error: {err})")
        return False


# --- 2. Graph Caching ---

GRAPH_CACHE_KEY = "graph:adjacency_matrix"


def get_graph_cache() -> Optional[Dict[int, List[Tuple[int, int]]]]:
    global _last_failed_time
    if not is_redis_available():
        return None
    try:
        data = redis_client.get(GRAPH_CACHE_KEY)
        if data:
            raw_dict = json.loads(data)
            restored_graph: Dict[int, List[Tuple[int, int]]] = {}
            for node_str, neighbors in raw_dict.items():
                restored_graph[int(node_str)] = [
                    (int(dest), int(weight)) for dest, weight in neighbors
                ]
            logger.info(f"⚡ [Graph Cache HIT] Loaded graph with {len(restored_graph)} nodes.")
            return restored_graph
        logger.info("🔍 [Graph Cache MISS] Graph not cached.")
    except Exception as err:
        _last_failed_time = time.time()
        logger.warning(f"⚠️ Redis get_graph_cache fallback (Error: {err})")
    return None


def set_graph_cache(graph: Dict[int, List[Tuple[int, int]]], ttl: int = GRAPH_CACHE_TTL) -> bool:
    global _last_failed_time
    if not is_redis_available():
        return False
    try:
        serializable_graph = {
            str(node): [[dest, weight] for dest, weight in neighbors]
            for node, neighbors in graph.items()
        }
        serialized = json.dumps(serializable_graph)
        redis_client.set(GRAPH_CACHE_KEY, serialized, ex=ttl)
        logger.info(f"💾 [Graph Cache STORE] Saved graph ({len(graph)} nodes, TTL: {ttl}s).")
        return True
    except Exception as err:
        _last_failed_time = time.time()
        logger.warning(f"⚠️ Redis set_graph_cache fallback (Error: {err})")
        return False


# --- 3. Cache Invalidation ---

def invalidate_all_caches() -> int:
    global _last_failed_time
    if not is_redis_available():
        return 0
    try:
        route_keys = redis_client.keys("route:*")
        all_keys = list(route_keys) + [GRAPH_CACHE_KEY]
        deleted_count = 0
        if all_keys:
            deleted_count = redis_client.delete(*all_keys)
        logger.info(f"🧹 [Cache Invalidate] Cleared {deleted_count} cache keys.")
        return deleted_count
    except Exception as err:
        _last_failed_time = time.time()
        logger.warning(f"⚠️ Redis invalidate_all_caches fallback (Error: {err})")
        return 0


# --- 4. Rate Limiting ---

def check_rate_limit(client_id: str, limit: int = RATE_LIMIT_REQUESTS, window_seconds: int = RATE_LIMIT_WINDOW) -> Tuple[bool, int]:
    global _last_failed_time
    if not is_redis_available():
        return True, 0
    try:
        current_window = int(time.time() // window_seconds)
        key = f"ratelimit:{client_id}:{current_window}"
        
        pipe = redis_client.pipeline()
        pipe.incr(key)
        pipe.expire(key, window_seconds + 5)
        results = pipe.execute()
        
        current_count = results[0]
        if current_count > limit:
            logger.warning(f"🚫 [Rate Limit Exceeded] Client '{client_id}': {current_count}/{limit} reqs")
            return False, current_count
        return True, current_count
    except Exception as err:
        _last_failed_time = time.time()
        logger.warning(f"⚠️ Redis check_rate_limit fallback (Error: {err})")
        return True, 0
