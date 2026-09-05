from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class RiskLine(Base):

    __tablename__ = "risk_lines"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    risk_evaluation_id: Mapped[int] = mapped_column(
        ForeignKey("risk_evaluations.id"),
        nullable=False,
    )

    quotation_line_id: Mapped[int] = mapped_column(
        ForeignKey("quotation_lines.id"),
        nullable=False,
    )

    risk_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    requested_discount: Mapped[Decimal] = mapped_column(
        Numeric(5, 2),
        nullable=False,
    )

    allowed_discount: Mapped[Decimal] = mapped_column(
        Numeric(5, 2),
        nullable=False,
    )

    deviation: Mapped[Decimal] = mapped_column(
        Numeric(5, 2),
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    reason: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )