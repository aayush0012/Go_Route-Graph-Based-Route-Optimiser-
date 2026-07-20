import math
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.city import City
from app.models.road import Road
from app.schemas.road import RoadCreate

router = APIRouter(
    prefix="/roads",
    tags=["Roads"],
)


def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> int:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    a = max(0.0, min(1.0, a))
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return max(1, int(round(R * c)))


@router.post("/")
def create_road(
    road: RoadCreate,
    db: Session = Depends(get_db),
):

    source = db.query(City).filter(
        City.id == road.source_city_id
    ).first()

    destination = db.query(City).filter(
        City.id == road.destination_city_id
    ).first()

    if not source or not destination:
        raise HTTPException(
            status_code=404,
            detail="Invalid city id",
        )

    final_distance = road.distance
    if final_distance is None or final_distance <= 0:
        if (source.latitude is not None and source.longitude is not None and
            destination.latitude is not None and destination.longitude is not None):
            final_distance = calculate_haversine_distance(
                source.latitude, source.longitude,
                destination.latitude, destination.longitude
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=f"GPS coordinates unavailable for '{source.name}' or '{destination.name}'. Please enter distance manually."
            )

    new_road = Road(
        source_city_id=road.source_city_id,
        destination_city_id=road.destination_city_id,
        distance=int(final_distance),
        is_bidirectional=road.is_bidirectional,
    )

    db.add(new_road)
    db.commit()
    db.refresh(new_road)

    return new_road


@router.get("/")
def get_all_roads(
    db: Session = Depends(get_db),
):
    return db.query(Road).all()


@router.delete("/{road_id}")
def delete_road(
    road_id: int,
    db: Session = Depends(get_db),
):

    road = db.query(Road).filter(
        Road.id == road_id
    ).first()

    if not road:
        raise HTTPException(
            status_code=404,
            detail="Road not found",
        )

    db.delete(road)
    db.commit()

    return {
        "message": "Road deleted successfully"
    }