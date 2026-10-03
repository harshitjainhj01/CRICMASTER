from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.models_base import Base, TimestampMixin


class Series(TimestampMixin, Base):
    __tablename__ = "series"

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

    name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        index=True,
    )

    format: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )

    season_name: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    matches = relationship(
        "Match",
        back_populates="series",
    )