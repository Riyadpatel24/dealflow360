from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class ApprovalStep(Base):

    __tablename__ = "approval_steps"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    approval_request_id: Mapped[int] = mapped_column(
        ForeignKey("approval_requests.id"),
        nullable=False,
    )

    approver_role: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    sequence: Mapped[int] = mapped_column(
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="PENDING",
    )

    approved_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )
    action_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
