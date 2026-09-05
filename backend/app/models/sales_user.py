from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class SalesUser(Base):
    __tablename__ = "sales_users"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        unique=True,
        nullable=False,
    )

    sales_region: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    user = relationship(
        "User",
        back_populates="sales_profile",
    )