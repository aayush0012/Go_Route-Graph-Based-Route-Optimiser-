from pydantic import BaseModel
from typing import Optional, List


class RouteRequest(BaseModel):
    source_city_id: int
    destination_city_id: int
    algorithm: Optional[str] = "dijkstra"
    stops: Optional[List[int]] = []