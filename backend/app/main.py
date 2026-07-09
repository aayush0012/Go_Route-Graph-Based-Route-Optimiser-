from fastapi import FastAPI

from app.api.user import router as user_router
from app.database.base import Base
from app.database.database import engine
from app.api.city import router as city_router
from app.models import User, City,Road
Base.metadata.create_all(bind=engine)
from app.api.road import router as road_router
from app.api.route import router as route_router
from fastapi.middleware.cors import CORSMiddleware
app = FastAPI(
    title="Go Route API",
    version="1.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(route_router)
app.include_router(user_router)
app.include_router(city_router)
app.include_router(road_router)
@app.get("/")
def home():
    return {"message": "Welcome to GoRoute 🚗"}