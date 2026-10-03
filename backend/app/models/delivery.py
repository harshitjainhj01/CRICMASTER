from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.models_base import Base, TimestampMixin


class Delivery(TimestampMixin, Base):
    __tablename__ = "deliveries"

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

    match_id: Mapped[int] = mapped_column(
        ForeignKey("matches.id"),
        nullable=False,
        index=True,
    )

    innings_id: Mapped[int | None] = mapped_column(
        ForeignKey("innings.id"),
        nullable=True,
        index=True,
    )

    over_number: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    ball_number: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    striker_id: Mapped[int | None] = mapped_column(
        ForeignKey("players.id"),
        nullable=True,
    )

    non_striker_id: Mapped[int | None] = mapped_column(
        ForeignKey("players.id"),
        nullable=True,
    )

    bowler_id: Mapped[int | None] = mapped_column(
        ForeignKey("players.id"),
        nullable=True,
    )

    runs_batter: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    runs_extras: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    runs_total: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    extra_type: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    is_wicket: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    dismissal_kind: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    commentary: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    match = relationship(
        "Match",
        back_populates="deliveries",
    )

    innings = relationship(
        "Innings",
    )

    striker = relationship(
        "Player",
        foreign_keys=[striker_id],
    )

    non_striker = relationship(
        "Player",
        foreign_keys=[non_striker_id],
    )

    bowler = relationship(
        "Player",
        foreign_keys=[bowler_id],
    )