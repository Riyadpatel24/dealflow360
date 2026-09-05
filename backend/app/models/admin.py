from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Admin(Base):
    __tablename__ = "admins"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        unique=True,
        nullable=False,
    )

    admin_level: Mapped[str] = mapped_column(
        String(50),
        default="STANDARD",
        nullable=False,
    )

    user = relationship(
        "User",
        back_populates="admin_profile",
    )