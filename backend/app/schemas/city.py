from typing import Optional
from pydantic import BaseModel

class CityCreate(BaseModel):
    name: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class CityResponse(BaseModel):
    id: int
    name: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    class Config:
        from_attributes = True