from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.models_base import Base, TimestampMixin


class Venue(TimestampMixin, Base):
    __tablename__ = "venues"

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
    )

    city: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    country: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    capacity: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    image_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    matches = relationship(
        "Match",
        back_populates="venue",
    )