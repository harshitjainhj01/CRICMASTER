from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.models_base import Base, TimestampMixin


class UserProfile(TimestampMixin, Base):
    __tablename__ = "user_profiles"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        unique=True,
        nullable=False,
        index=True,
    )

    cricket_level: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )

    favorite_format: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )

    favorite_team: Mapped[str | None] = mapped_column(
        String(120),
        nullable=True,
    )

    profile_image_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    accepted_terms: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    accepted_privacy: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    terms_accepted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    onboarding_completed: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    user = relationship(
        "User",
        back_populates="profile",
    )