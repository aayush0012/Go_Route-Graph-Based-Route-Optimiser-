import urllib.request
import json
import urllib.parse
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.city import City
from app.models.road import Road
from app.models.user import User
from app.schemas.city import CityCreate, CityResponse
from app.api.user import get_current_user
from app.services.workspace_service import reset_user_workspace

router = APIRouter(
    prefix="/cities",
    tags=["Cities"]
)

DEFAULT_CITY_COORDINATES = {
    "delhi": (28.6139, 77.2090),
    "new delhi": (28.6139, 77.2090),
    "mumbai": (19.0760, 72.8777),
    "bengaluru": (12.9716, 77.5946),
    "bangalore": (12.9716, 77.5946),
    "chennai": (13.0827, 80.2707),
    "kolkata": (22.5726, 88.3639),
    "hyderabad": (17.3850, 78.4867),
    "pune": (18.5204, 73.8567),
    "jaipur": (26.9124, 75.7873),
    "ahmedabad": (23.0225, 72.5714),
    "mysore": (12.2958, 76.6394),
    "mysuru": (12.2958, 76.6394),
    "chandigarh": (30.7333, 76.7794),
    "surat": (21.1702, 72.8311),
    "lucknow": (26.8467, 80.9462),
    "agra": (27.1767, 78.0081),
    "varanasi": (25.3176, 82.9739),
    "goa": (15.2993, 74.1240),
    "kochi": (9.9312, 76.2673),
    "indore": (22.7196, 75.8577),
    "bhopal": (23.2599, 77.4126),
    "patna": (25.5941, 85.1376),
    "nagpur": (21.1458, 79.0882),
    "vadodara": (22.3072, 73.1812),
    "visakhapatnam": (17.6868, 83.2185),
    "coimbatore": (11.0168, 76.9558),
    "madurai": (9.9252, 78.1198),
    "guwahati": (26.1445, 91.7362),
    "ranchi": (23.3441, 85.3096),
    "shimla": (31.1048, 77.1734),
    "dehradun": (30.3165, 78.0322),
    "amritsar": (31.6340, 74.8723),
    "jodhpur": (26.2389, 73.0243),
    "udaipur": (24.5854, 73.7125),
    "kanpur": (26.4499, 80.3319),
    "nashik": (19.9975, 73.7898),
    "thiruvananthapuram": (8.5241, 76.9366),
    "trivandrum": (8.5241, 76.9366),
}


def geocode_city_name(city_name: str):
    """
    Query OpenStreetMap Nominatim for GPS coordinates.
    """
    try:
        encoded_query = urllib.parse.quote(f"{city_name}, India")
        url = f"https://nominatim.openstreetmap.org/search?q={encoded_query}&format=json&limit=1"
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "GoRoutePlannerApp/1.0 (contact@goroute.internal)"}
        )
        with urllib.request.urlopen(req, timeout=3.0) as response:
            if response.status == 200:
                data = json.loads(response.read().decode("utf-8"))
                if data and len(data) > 0:
                    lat = float(data[0]["lat"])
                    lon = float(data[0]["lon"])
                    return lat, lon
    except Exception:
        pass
    return None, None


@router.post("/", response_model=CityResponse)
def create_city(
    city: CityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    clean_name = city.name.strip()
    if not clean_name:
        raise HTTPException(
            status_code=400,
            detail="City name cannot be empty."
        )

    # Check duplicates in current user's workspace only
    existing_city = db.query(City).filter(
        City.user_id == current_user.id,
        func.lower(City.name) == clean_name.lower()
    ).first()

    if existing_city:
        raise HTTPException(
            status_code=400,
            detail=f"City '{existing_city.name}' already exists in your workspace."
        )

    lat = city.latitude
    lng = city.longitude

    if lat is None or lng is None:
        key = clean_name.lower()
        if key in DEFAULT_CITY_COORDINATES:
            lat, lng = DEFAULT_CITY_COORDINATES[key]
        else:
            g_lat, g_lng = geocode_city_name(clean_name)
            if g_lat is not None and g_lng is not None:
                lat, lng = g_lat, g_lng

    new_city = City(
        user_id=current_user.id,
        name=clean_name,
        latitude=lat,
        longitude=lng
    )

    db.add(new_city)
    db.commit()
    db.refresh(new_city)

    return new_city


@router.get("/", response_model=List[CityResponse])
def get_all_cities(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(City).filter(City.user_id == current_user.id).all()


@router.delete("/{city_id}")
def delete_city(
    city_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    city = db.query(City).filter(
        City.id == city_id,
        City.user_id == current_user.id
    ).first()

    if not city:
        raise HTTPException(
            status_code=404,
            detail="City not found in your workspace"
        )

    # Delete all connected roads in user's workspace
    db.query(Road).filter(
        Road.user_id == current_user.id,
        (Road.source_city_id == city_id) | (Road.destination_city_id == city_id)
    ).delete(synchronize_session=False)

    db.delete(city)
    db.commit()

    return {
        "message": "City deleted successfully"
    }


@router.post("/reset-to-master")
def reset_workspace_to_master(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reset_user_workspace(current_user.id, db)
    return {
        "message": "Workspace successfully restored to Official Master Logistics Network!"
    }