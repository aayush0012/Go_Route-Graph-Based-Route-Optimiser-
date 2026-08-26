from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.user import User
from app.schemas.route import RouteRequest
from app.services.route_service import calculate_route
from app.api.user import get_current_user

router = APIRouter(
    prefix="/route",
    tags=["Route"],
)


@router.post("/")
def find_shortest_route(
    route_req: RouteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return calculate_route(route_req, db, current_user.id)