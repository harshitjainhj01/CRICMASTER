from sqlalchemy import Float, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.models_base import Base, TimestampMixin


class Innings(TimestampMixin, Base):
    __tablename__ = "innings"

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

    team_id: Mapped[int | None] = mapped_column(
        ForeignKey("teams.id"),
        nullable=True,
        index=True,
    )

    innings_number: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    runs: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    wickets: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    overs: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
    )

    match = relationship(
        "Match",
        back_populates="innings",
    )

    team = relationship(
        "Team",
    )