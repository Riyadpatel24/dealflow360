from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class ApprovalRequest(Base):

    __tablename__ = "approval_requests"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    quotation_id: Mapped[int] = mapped_column(
        ForeignKey("quotations.id"),
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="PENDING",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )