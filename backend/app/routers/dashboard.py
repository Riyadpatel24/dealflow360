from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db, require_role
from app.models.operations import Backorder, Fulfillment, Invoice
from app.models.quotation import Quotation
from app.models.risk_evaluation import RiskEvaluation
from app.models.user import User

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
)


@router.get("/me")
def dashboard_me(
    current_user: User = Depends(get_current_user),
):
    return {
        "message": "Authenticated successfully",
        "user": current_user.name,
        "role": current_user.role,
    }


@router.get("/admin")
def admin_dashboard(
    current_user: User = Depends(require_role("ADMIN")),
):
    return {
        "message": "Admin dashboard access granted",
        "user": current_user.name,
        "role": current_user.role,
    }


@router.get("/sales")
def sales_dashboard(
    current_user: User = Depends(
        require_role("SALES", "SALES_MANAGER", "FINANCE")
    ),
):
    return {
        "message": "Sales workspace access granted",
        "user": current_user.name,
        "role": current_user.role,
    }


@router.get("/customer")
def customer_dashboard(
    current_user: User = Depends(require_role("CUSTOMER")),
):
    return {
        "message": "Customer portal access granted",
        "user": current_user.name,
        "role": current_user.role,
        "customer_id": current_user.customer_id,
    }


@router.get("/deal-health")
def deal_health(
    db: Session = Depends(get_db),
    _: User = Depends(require_role("ADMIN", "SALES", "SALES_MANAGER", "FINANCE")),
):
    """Return explainable health signals derived from live deal state."""
    quotations = db.query(Quotation).order_by(Quotation.updated_at.desc()).all()
    rows = []

    for quote in quotations:
        risk = (
            db.query(RiskEvaluation)
            .filter(RiskEvaluation.quotation_id == quote.id)
            .order_by(RiskEvaluation.id.desc())
            .first()
        )
        open_backorders = (
            db.query(Backorder)
            .filter(
                Backorder.quotation_id == quote.id,
                Backorder.status == "OPEN",
            )
            .count()
        )
        shipped_units = (
            db.query(Fulfillment)
            .filter(
                Fulfillment.quotation_id == quote.id,
                Fulfillment.status == "SHIPPED",
            )
            .all()
        )
        invoice_count = (
            db.query(Invoice)
            .filter(Invoice.quotation_id == quote.id)
            .count()
        )

        reasons = []
        if risk and risk.risk_level == "HIGH":
            reasons.append(f"High commercial risk: {risk.reason}")
        if quote.status == "UNDER_APPROVAL":
            reasons.append("Waiting for sequential approval")
        if open_backorders:
            reasons.append(f"{open_backorders} open backorder(s)")
        if quote.status in {"DRAFT", "SENT"}:
            age_days = (datetime.utcnow() - quote.updated_at).days
            if age_days >= 3:
                reasons.append(f"No recent movement for {age_days} days")

        if quote.status in {"CANCELLED", "REJECTED"}:
            health = "BLOCKED"
            action = "Resolve the commercial blocker before progressing the deal."
        elif quote.status == "UNDER_APPROVAL" or (risk and risk.risk_level == "HIGH"):
            health = "AT_RISK"
            action = "Review risk and complete the required approval step."
        elif open_backorders:
            health = "WATCH"
            action = "Consolidate open backorders when stock becomes available."
        elif quote.status in {"FULFILLED", "INVOICED", "PAID"}:
            health = "HEALTHY"
            action = "No operational blocker. Continue revenue collection or close the deal."
        else:
            health = "HEALTHY"
            action = "Continue the normal quote-to-cash workflow."

        rows.append(
            {
                "quotation_id": quote.id,
                "quotation_number": quote.quotation_number,
                "customer_id": quote.customer_id,
                "status": quote.status,
                "currency": quote.currency,
                "health": health,
                "risk_level": risk.risk_level if risk else None,
                "risk_reason": risk.reason if risk else None,
                "worst_deviation": float(risk.worst_deviation) if risk else 0,
                "open_backorders": open_backorders,
                "shipped_fulfillment_lines": len(shipped_units),
                "invoice_count": invoice_count,
                "reasons": reasons,
                "recommended_action": action,
                "updated_at": quote.updated_at,
            }
        )

    counts = {
        "total": len(rows),
        "healthy": sum(row["health"] == "HEALTHY" for row in rows),
        "watch": sum(row["health"] == "WATCH" for row in rows),
        "at_risk": sum(row["health"] == "AT_RISK" for row in rows),
        "blocked": sum(row["health"] == "BLOCKED" for row in rows),
    }

    return {"summary": counts, "deals": rows}
