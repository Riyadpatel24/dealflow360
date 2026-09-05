from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class RiskEvaluation(Base):

    __tablename__ = "risk_evaluations"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    quotation_id: Mapped[int] = mapped_column(
        ForeignKey("quotations.id"),
        nullable=False,
    )

    risk_level: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    worst_deviation: Mapped[Decimal] = mapped_column(
        Numeric(5, 2),
        nullable=False,
    )

    reason: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )