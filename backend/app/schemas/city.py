from pydantic import BaseModel

class CityCreate(BaseModel):
    name: str


class CityResponse(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True