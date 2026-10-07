from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.user import User
from app.models.user_profile import UserProfile
from app.routes.auth import get_current_user


router = APIRouter(
    prefix="/api/onboarding",
    tags=["Onboarding"],
)


class OnboardingRequest(BaseModel):
    cricket_level: str
    favorite_format: str | None = None
    favorite_team: str | None = None
    accepted_terms: bool
    accepted_privacy: bool


@router.post("")
async def complete_onboarding(
    payload: OnboardingRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):

    if payload.cricket_level not in {
        "beginner",
        "intermediate",
        "advanced",
    }:
        return {
            "success": False,
            "message": "Invalid cricket level.",
        }

    if not payload.accepted_terms:
        return {
            "success": False,
            "message": "You must accept the Terms and Conditions.",
        }

    if not payload.accepted_privacy:
        return {
            "success": False,
            "message": "You must accept the Privacy Policy.",
        }

    profile = db.execute(
        select(UserProfile).where(
            UserProfile.user_id == user.id
        )
    ).scalar_one_or_none()

    if profile is None:

        profile = UserProfile(
            user_id=user.id,
        )

        db.add(profile)

    profile.cricket_level = payload.cricket_level
    profile.favorite_format = payload.favorite_format
    profile.favorite_team = payload.favorite_team

    profile.accepted_terms = True
    profile.accepted_privacy = True

    profile.terms_accepted_at = (
        datetime.now(timezone.utc)
    )

    profile.onboarding_completed = True

    db.commit()

    return {
        "success": True,
        "message": "Onboarding completed successfully.",
        "user_id": user.id,
    }