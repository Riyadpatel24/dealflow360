from sqlalchemy import Boolean, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class Product(Base):

    __tablename__ = "products"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    category: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    unit_price: Mapped[float] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    is_subscription: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )

    cost_price: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    subscription_plan_id: Mapped[int | None] = mapped_column(ForeignKey("subscription_plans.id"), nullable=True)
