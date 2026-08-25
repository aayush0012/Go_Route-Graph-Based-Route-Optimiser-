import os

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))

# Cache TTL Settings (in seconds)
ROUTE_CACHE_TTL = int(os.getenv("ROUTE_CACHE_TTL", "3600"))      # 1 hour
GRAPH_CACHE_TTL = int(os.getenv("GRAPH_CACHE_TTL", "86400"))     # 24 hours

# Rate Limiting Settings
RATE_LIMIT_REQUESTS = int(os.getenv("RATE_LIMIT_REQUESTS", "30")) # 30 requests
RATE_LIMIT_WINDOW = int(os.getenv("RATE_LIMIT_WINDOW", "60"))     # per 60 seconds
