import os
import json
import logging
from typing import Any, Optional
import redis

logger = logging.getLogger(__name__)

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", None)

try:
    redis_client = redis.Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        password=REDIS_PASSWORD,
        decode_responses=True,
        socket_connect_timeout=0.2,
        socket_timeout=0.2,
    )
except Exception as e:
    logger.warning(f"Failed to initialize Redis client: {e}")
    redis_client = None


def get_cache(key: str) -> Optional[Any]:
    """Retrieve and deserialize a value from Redis cache."""
    if not redis_client:
        return None
    try:
        data = redis_client.get(key)
        if data:
            logger.info(f"⚡ Redis Cache HIT for key: {key}")
            return json.loads(data)
    except Exception as e:
        logger.warning(f"Redis get_cache error for key '{key}': {e}")
    return None


def set_cache(key: str, value: Any, ttl_seconds: int = 3600) -> bool:
    """Serialize and store a value in Redis cache with TTL."""
    if not redis_client:
        return False
    try:
        serialized = json.dumps(value)
        redis_client.set(key, serialized, ex=ttl_seconds)
        logger.info(f"💾 Redis Cache SET for key: {key} (TTL: {ttl_seconds}s)")
        return True
    except Exception as e:
        logger.warning(f"Redis set_cache error for key '{key}': {e}")
        return False


def invalidate_cache_pattern(pattern: str = "route:*") -> int:
    """Invalidate all keys matching the given pattern."""
    if not redis_client:
        return 0
    try:
        keys = redis_client.keys(pattern)
        if keys:
            count = redis_client.delete(*keys)
            logger.info(f"🧹 Redis invalidated {count} keys for pattern '{pattern}'")
            return count
    except Exception as e:
        logger.warning(f"Redis invalidate_cache_pattern error for pattern '{pattern}': {e}")
    return 0


def is_redis_online() -> bool:
    """Ping Redis server to check availability."""
    if not redis_client:
        return False
    try:
        return redis_client.ping()
    except Exception:
        return False
