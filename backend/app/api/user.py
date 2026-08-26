from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.user import User
from app.models.city import City
from app.schemas.user import UserCreate, UserLogin
from app.utils.jwt import create_access_token, verify_access_token
from app.utils.security import hash_password, verify_password
from app.services.workspace_service import seed_user_workspace

router = APIRouter(tags=["Authentication"])

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Reusable FastAPI dependency to extract and return the authenticated User model."""
    email = verify_access_token(credentials.credentials)
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )
    return user


@router.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    new_user = User(
        username=user.username,
        email=user.email,
        password=hash_password(user.password)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Automatically clone master network for new user's private sandbox
    seed_user_workspace(new_user.id, db)

    return {
        "message": "User Registered Successfully"
    }


@router.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user.email).first()
    if not existing_user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    if not verify_password(user.password, existing_user.password):
        raise HTTPException(
            status_code=401,
            detail="Invalid password"
        )

    # Ensure existing user has initial data seeded
    has_cities = db.query(City).filter(City.user_id == existing_user.id).first()
    if not has_cities:
        seed_user_workspace(existing_user.id, db)

    token = create_access_token(
        {
            "sub": existing_user.email
        }
    )

    return {
        "access_token": token,
        "token_type": "bearer"
    }


@router.post("/login/guest")
def guest_login(db: Session = Depends(get_db)):
    guest_email = "guest@goroute.com"
    guest_user = db.query(User).filter(User.email == guest_email).first()

    if not guest_user:
        guest_user = User(
            username="Guest User",
            email=guest_email,
            password=hash_password("guest_secure_placeholder_password_123")
        )
        db.add(guest_user)
        db.commit()
        db.refresh(guest_user)

    # Ensure guest user has initial data seeded
    has_cities = db.query(City).filter(City.user_id == guest_user.id).first()
    if not has_cities:
        seed_user_workspace(guest_user.id, db)

    token = create_access_token(
        {
            "sub": guest_user.email
        }
    )

    return {
        "access_token": token,
        "token_type": "bearer"
    }


@router.get("/me")
def get_current_user_profile(
    current_user: User = Depends(get_current_user)
):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email
    }