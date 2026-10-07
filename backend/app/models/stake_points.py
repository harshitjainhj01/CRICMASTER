from app.database.models_base import Base, TimestampMixin

from sqlalchemy import ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship


class StakePoints(TimestampMixin, Base):
    __tablename__ = "stake_points"

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

    points: Mapped[int] = mapped_column(
        Integer,
        default=1000,
        nullable=False,
    )

    user = relationship(
        "User",
        back_populates="stake_points",
    )