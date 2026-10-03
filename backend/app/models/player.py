from datetime import date

from sqlalchemy import Date, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.models_base import Base, TimestampMixin


class Player(TimestampMixin, Base):
    __tablename__ = "players"

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

    team_id: Mapped[int | None] = mapped_column(
        ForeignKey("teams.id"),
        nullable=True,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
        index=True,
    )

    first_name: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    last_name: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    date_of_birth: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    batting_hand: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )

    bowling_hand: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )

    role: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    country: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    photo_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    team = relationship(
        "Team",
        back_populates="players",
        foreign_keys=[team_id],
    )