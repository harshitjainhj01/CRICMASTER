from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.login_event import LoginEvent
from app.models.stake_points import StakePoints
from app.models.user import User
from app.models.user_profile import UserProfile
from app.services.firebase_auth import (
    FirebaseAuthError,
    verify_firebase_token,
)


router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"],
)


bearer_scheme = HTTPBearer(
    auto_error=False
)


class AuthSessionResponse(BaseModel):
    success: bool
    user_id: int
    firebase_uid: str
    display_name: str | None
    email: str | None
    phone: str | None
    provider: str
    points: int
    onboarding_completed: bool


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(
        bearer_scheme
    ),
    db: Session = Depends(get_db),
) -> User:

    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="Authentication required",
        )

    try:
        decoded = verify_firebase_token(
            credentials.credentials
        )

    except FirebaseAuthError as exc:
        raise HTTPException(
            status_code=401,
            detail=str(exc),
        ) from exc

    firebase_uid = decoded.get("uid")

    if not firebase_uid:
        raise HTTPException(
            status_code=401,
            detail="Firebase token does not contain a UID",
        )

    user = db.execute(
        select(User).where(
            User.auth_uid == firebase_uid
        )
    ).scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="CRICMASTER user account not found",
        )

    return user


@router.post(
    "/session",
    response_model=AuthSessionResponse,
)
async def create_session(
    request: Request,
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Depends(
        bearer_scheme
    ),
):

    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="Firebase ID token is required",
        )

    try:
        decoded = verify_firebase_token(
            credentials.credentials
        )

    except FirebaseAuthError as exc:
        raise HTTPException(
            status_code=401,
            detail=str(exc),
        ) from exc

    firebase_uid = decoded["uid"]

    firebase_data = decoded.get(
        "firebase",
        {},
    )

    provider = firebase_data.get(
        "sign_in_provider",
        "unknown",
    )

    email = decoded.get("email")
    phone = decoded.get("phone_number")
    display_name = decoded.get("name")

    user = db.execute(
        select(User).where(
            User.auth_uid == firebase_uid
        )
    ).scalar_one_or_none()

    if user is None:

        user = User(
            auth_uid=firebase_uid,
            email=email,
            phone=phone,
            display_name=display_name,
            auth_provider=provider,
            role="user",
            is_active=True,
            last_login_at=datetime.now(timezone.utc),
        )

        db.add(user)
        db.flush()

        profile = UserProfile(
            user_id=user.id
        )

        points = StakePoints(
            user_id=user.id,
            points=1000,
        )

        db.add(profile)
        db.add(points)

    else:

        if email:
            user.email = email

        if phone:
            user.phone = phone

        if display_name:
            user.display_name = display_name

        user.auth_provider = provider

        user.last_login_at = (
            datetime.now(timezone.utc)
        )


    # Repair partially-created accounts before recording the login event.
    db.flush()
    existing_profile = db.execute(
        select(UserProfile).where(UserProfile.user_id == user.id)
    ).scalar_one_or_none()
    if existing_profile is None:
        db.add(UserProfile(user_id=user.id))

    existing_points = db.execute(
        select(StakePoints).where(StakePoints.user_id == user.id)
    ).scalar_one_or_none()
    if existing_points is None:
        db.add(StakePoints(user_id=user.id, points=1000))

    login_event = LoginEvent(
        user_id=user.id,
        provider=provider,
        ip_address=(
            request.client.host
            if request.client
            else None
        ),
        user_agent=request.headers.get(
            "user-agent"
        ),
    )

    db.add(login_event)

    db.commit()

    db.refresh(user)


    profile = db.execute(
        select(UserProfile).where(UserProfile.user_id == user.id)
    ).scalar_one_or_none()
    if profile is None:
        profile = UserProfile(user_id=user.id)
        db.add(profile)

    points = db.execute(
        select(StakePoints).where(StakePoints.user_id == user.id)
    ).scalar_one_or_none()
    if points is None:
        points = StakePoints(user_id=user.id, points=1000)
        db.add(points)

    db.commit()

    return AuthSessionResponse(
        success=True,
        user_id=user.id,
        firebase_uid=firebase_uid,
        display_name=user.display_name,
        email=user.email,
        phone=user.phone,
        provider=provider,
        points=points.points,
        onboarding_completed=profile.onboarding_completed,
    )


@router.get(
    "/me",
    response_model=AuthSessionResponse,
)
async def get_me(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):

    profile = db.execute(
        select(UserProfile).where(UserProfile.user_id == user.id)
    ).scalar_one_or_none()
    if profile is None:
        profile = UserProfile(user_id=user.id)
        db.add(profile)

    points = db.execute(
        select(StakePoints).where(StakePoints.user_id == user.id)
    ).scalar_one_or_none()
    if points is None:
        points = StakePoints(user_id=user.id, points=1000)
        db.add(points)

    db.commit()
    db.refresh(profile)
    db.refresh(points)

    return AuthSessionResponse(
        success=True,
        user_id=user.id,
        firebase_uid=user.auth_uid or "",
        display_name=user.display_name,
        email=user.email,
        phone=user.phone,
        provider=user.auth_provider,
        points=points.points,
        onboarding_completed=profile.onboarding_completed,
    )


@router.post("/logout")
async def logout():
    return {
        "success": True,
        "message": "Sign out from Firebase on the client.",
    }