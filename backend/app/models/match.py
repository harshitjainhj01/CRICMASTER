from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.models_base import Base, TimestampMixin


class Match(TimestampMixin, Base):
    __tablename__ = "matches"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    provider_id: Mapped[int | None] = mapped_column(
        Integer,
        unique=True,
        nullable=True,
        index=True,
    )

    series_id: Mapped[int | None] = mapped_column(
        ForeignKey("series.id"),
        nullable=True,
        index=True,
    )

    venue_id: Mapped[int | None] = mapped_column(
        ForeignKey("venues.id"),
        nullable=True,
        index=True,
    )

    local_team_id: Mapped[int | None] = mapped_column(
        ForeignKey("teams.id"),
        nullable=True,
        index=True,
    )

    visitor_team_id: Mapped[int | None] = mapped_column(
        ForeignKey("teams.id"),
        nullable=True,
        index=True,
    )

    winner_team_id: Mapped[int | None] = mapped_column(
        ForeignKey("teams.id"),
        nullable=True,
        index=True,
    )

    name: Mapped[str | None] = mapped_column(
        String(250),
        nullable=True,
    )

    format: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )

    status: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        index=True,
    )

    season_name: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        index=True,
    )

    starts_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )

    ends_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    result_text: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    raw_data: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
    )

    series = relationship(
        "Series",
        back_populates="matches",
    )

    venue = relationship(
        "Venue",
        back_populates="matches",
    )

    local_team = relationship(
        "Team",
        foreign_keys=[local_team_id],
    )

    visitor_team = relationship(
        "Team",
        foreign_keys=[visitor_team_id],
    )

    winner_team = relationship(
        "Team",
        foreign_keys=[winner_team_id],
    )

    innings = relationship(
        "Innings",
        back_populates="match",
        cascade="all, delete-orphan",
    )

    deliveries = relationship(
        "Delivery",
        back_populates="match",
        cascade="all, delete-orphan",
    )