from sqlalchemy.orm import Session

from app.models.approval_request import ApprovalRequest
from app.models.approval_step import ApprovalStep
from app.models.risk_evaluation import RiskEvaluation
from app.models.quotation import Quotation
from app.models.user import User
from app.services.operations import audit


def create_approval_request(
    db: Session,
    quotation_id: int,
):

    risk_evaluation = (
        db.query(RiskEvaluation)
        .filter(
            RiskEvaluation.quotation_id
            == quotation_id
        )
        .order_by(
            RiskEvaluation.id.desc()
        )
        .first()
    )


    if risk_evaluation is None:

        raise ValueError(
            "Risk evaluation not found"
        )


    if risk_evaluation.risk_level == "LOW":

        return None


    existing_request = (
        db.query(ApprovalRequest)
        .filter(
            ApprovalRequest.quotation_id
            == quotation_id,

            ApprovalRequest.status
            == "PENDING",
        )
        .first()
    )


    if existing_request is not None:
        # Repair legacy requests created before sequential step gating existed.
        active = (
            db.query(ApprovalStep)
            .filter(ApprovalStep.approval_request_id == existing_request.id)
            .order_by(ApprovalStep.sequence)
            .first()
        )
        if active and active.status == "PENDING":
            for waiting_step in (
                db.query(ApprovalStep)
                .filter(ApprovalStep.approval_request_id == existing_request.id, ApprovalStep.sequence > active.sequence, ApprovalStep.status == "PENDING")
                .all()
            ):
                waiting_step.status = "WAITING"
        quotation = db.get(Quotation, quotation_id)
        if quotation and quotation.status in {"Draft", "DRAFT", "SUBMITTED"}:
            quotation.status = "UNDER_APPROVAL"
        return existing_request


    approval_request = ApprovalRequest(
        quotation_id=quotation_id,
        status="PENDING",
    )


    db.add(
        approval_request
    )

    db.flush()


    manager_step = ApprovalStep(
        approval_request_id=
            approval_request.id,

        approver_role="SALES_MANAGER",

        sequence=1,

        status="PENDING",
    )


    finance_step = ApprovalStep(
        approval_request_id=
            approval_request.id,

        approver_role="FINANCE",

        sequence=2,

        status="WAITING",
    )


    db.add(manager_step)

    db.add(finance_step)

    quotation = db.get(Quotation, quotation_id)
    if quotation:
        quotation.status = "UNDER_APPROVAL"
    db.flush()


    return approval_request


def act_on_approval(db: Session, quotation_id: int, step_id: int, user: User, action: str, reason: str | None):
    """Apply a sequential approval decision atomically."""
    action = action.upper()
    if action not in {"APPROVE", "REJECT", "RETURN"}:
        raise ValueError("Action must be APPROVE, REJECT, or RETURN")
    step = db.get(ApprovalStep, step_id)
    request = db.query(ApprovalRequest).filter(ApprovalRequest.quotation_id == quotation_id, ApprovalRequest.status == "PENDING").order_by(ApprovalRequest.id.desc()).first()
    quotation = db.get(Quotation, quotation_id)
    if not step or not request or step.approval_request_id != request.id or not quotation or step.status != "PENDING":
        raise ValueError("Approval step is not currently actionable")
    required_role = step.approver_role.upper().replace(" ", "_")
    role_match = (required_role == "SALES_MANAGER" and user.role in {"SALES_MANAGER", "ADMIN"}) or (required_role == "FINANCE" and user.role in {"FINANCE", "ADMIN"})
    if not role_match: raise ValueError("You are not authorized for this approval step")
    if action != "APPROVE" and not reason: raise ValueError("A reason is required for rejection or return")
    from datetime import datetime
    step.action_by_user_id, step.approved_at, step.reason = user.id, datetime.utcnow(), reason
    if action == "REJECT":
        step.status, request.status, quotation.status = "REJECTED", "REJECTED", "REJECTED"
    elif action == "RETURN":
        step.status, request.status, quotation.status = "RETURNED", "RETURNED_FOR_REVISION", "RETURNED_FOR_REVISION"
    else:
        step.status = "APPROVED"
        next_step = db.query(ApprovalStep).filter(ApprovalStep.approval_request_id == request.id, ApprovalStep.sequence == step.sequence + 1).one_or_none()
        if next_step: next_step.status = "PENDING"
        else: request.status, quotation.status = "APPROVED", "APPROVED"
    audit(db, user.id, "approval_request", request.id, action, reason)
    db.commit()
    return {"approval_request": request, "step": step, "quotation_status": quotation.status}
