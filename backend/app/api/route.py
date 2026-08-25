from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.schemas.route import RouteRequest
from app.services.route_service import calculate_route
from app.services.cache_service import check_rate_limit

router = APIRouter(
    prefix="/route",
    tags=["Route"],
)


def get_client_identifier(request: Request) -> str:
    # Check for Authorization Bearer token header
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        if token:
            return f"user:{token[:16]}"
    
    # Fallback to client IP
    client_ip = request.client.host if request.client else "127.0.0.1"
    return f"ip:{client_ip}"


@router.post("/")
def find_shortest_route(
    route_req: RouteRequest,
    req: Request,
    db: Session = Depends(get_db),
):
    # 1. Rate Limiting Check
    client_id = get_client_identifier(req)
    is_allowed, count = check_rate_limit(client_id, limit=30, window_seconds=60)
    if not is_allowed:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Maximum 30 route requests per minute allowed.",
        )

    # 2. Route calculation execution via Route Service
    return calculate_route(route_req, db)