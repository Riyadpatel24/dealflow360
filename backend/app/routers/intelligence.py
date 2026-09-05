from datetime import date, datetime, timedelta
from decimal import Decimal
import json
import re

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_role
from app.core.security import hash_password, verify_password
from app.database.connection import SessionLocal
from app.models.customer import Customer
from app.models.notification import Notification
from app.models.operations import AuditEvent, Backorder, Fulfillment, Inventory, Invoice, Payment, Shipment, Subscription
from app.models.product import Product
from app.models.quotation import Quotation
from app.models.quotation_line import QuotationLine
from app.models.risk_evaluation import RiskEvaluation
from app.models.user import User

router = APIRouter(prefix="/intelligence", tags=["Intelligence"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _customer_scope(db: Session, user: User, customer_id: int) -> Customer:
    customer = db.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    if user.role == "CUSTOMER" and user.customer_id != customer_id:
        raise HTTPException(status_code=403, detail="Customer scope violation")
    return customer


def _quote_total(db: Session, quotation_id: int) -> Decimal:
    rows = db.query(QuotationLine).filter(QuotationLine.quotation_id == quotation_id).all()
    total = Decimal("0")
    for line in rows:
        total += Decimal(str(line.quantity)) * Decimal(str(line.unit_price)) * (Decimal("1") - Decimal(str(line.discount_percent)) / Decimal("100"))
    return total


def _audit(db: Session, user_id: int | None, entity: str, entity_id: int, action: str, details: dict | None = None):
    db.add(AuditEvent(user_id=user_id, entity=entity, entity_id=entity_id, action=action, details=json.dumps(details or {})))


@router.get("/notifications")
def notifications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(Notification).filter(Notification.user_id == current_user.id).order_by(Notification.created_at.desc()).limit(50).all()
    unread = sum(1 for row in rows if not row.is_read)
    return {"unread": unread, "items": [{"id": n.id, "title": n.title, "message": n.message, "kind": n.kind, "entity": n.entity, "entity_id": n.entity_id, "is_read": n.is_read, "created_at": n.created_at.isoformat()} for n in rows]}


@router.post("/notifications/{notification_id}/read")
def mark_notification_read(notification_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Notification not found")
    item.is_read = True
    db.commit()
    return {"ok": True}


@router.post("/notifications/read-all")
def mark_all_notifications_read(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(Notification).filter(Notification.user_id == current_user.id, Notification.is_read.is_(False)).update({Notification.is_read: True}, synchronize_session=False)
    db.commit()
    return {"ok": True}


@router.get("/audit")
def audit_trail(limit: int = Query(100, ge=1, le=500), current_user: User = Depends(require_role("ADMIN", "SALES_MANAGER", "FINANCE")), db: Session = Depends(get_db)):
    rows = db.query(AuditEvent).order_by(AuditEvent.created_at.desc()).limit(limit).all()
    return {"items": [{"id": a.id, "user_id": a.user_id, "entity": a.entity, "entity_id": a.entity_id, "action": a.action, "details": a.details, "created_at": a.created_at.isoformat()} for a in rows]}


@router.get("/search")
def global_search(q: str = Query(..., min_length=2, max_length=100), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    term = f"%{q.strip()}%"
    customers = db.query(Customer).filter(or_(Customer.name.ilike(term), Customer.email.ilike(term))).limit(8).all()
    products = db.query(Product).filter(or_(Product.name.ilike(term), Product.category.ilike(term))).limit(8).all()
    quotes_q = db.query(Quotation).filter(Quotation.quotation_number.ilike(term))
    if current_user.role == "CUSTOMER":
        quotes_q = quotes_q.filter(Quotation.customer_id == current_user.customer_id)
    quotes = quotes_q.limit(8).all()
    if current_user.role == "CUSTOMER":
        customers = [c for c in customers if c.id == current_user.customer_id]
    return {"customers": [{"id": c.id, "name": c.name, "email": c.email, "tier": c.tier} for c in customers], "products": [{"id": p.id, "name": p.name, "category": p.category, "unit_price": float(p.unit_price)} for p in products], "quotations": [{"id": q.id, "quotation_number": q.quotation_number, "customer_id": q.customer_id, "status": q.status, "total": float(_quote_total(db, q.id))} for q in quotes]}


@router.get("/customers/{customer_id}/360")
def customer_360(customer_id: int, current_user: User = Depends(require_role("ADMIN", "SALES", "SALES_MANAGER", "FINANCE", "CUSTOMER")), db: Session = Depends(get_db)):
    customer = _customer_scope(db, current_user, customer_id)
    quotes = db.query(Quotation).filter(Quotation.customer_id == customer_id).order_by(Quotation.created_at.desc()).all()
    invoices = db.query(Invoice).filter(Invoice.customer_id == customer_id).all()
    subscriptions = db.query(Subscription).filter(Subscription.customer_id == customer_id).all()
    backorders = db.query(Backorder).join(Quotation, Backorder.quotation_id == Quotation.id).filter(Quotation.customer_id == customer_id, Backorder.status == "OPEN").all()
    invoice_ids = [i.id for i in invoices]
    paid = Decimal("0") if not invoice_ids else (db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(Payment.invoice_id.in_(invoice_ids)).scalar() or Decimal("0"))
    invoiced = sum((Decimal(str(i.amount)) for i in invoices), Decimal("0"))
    return {"customer": {"id": customer.id, "name": customer.name, "email": customer.email, "tier": customer.tier}, "metrics": {"quote_count": len(quotes), "won_quotes": sum(q.status in {"APPROVED", "CONFIRMED", "PARTIALLY_FULFILLED", "FULFILLED", "INVOICED"} for q in quotes), "quoted_value": float(sum((_quote_total(db, q.id) for q in quotes), Decimal("0"))), "invoiced": float(invoiced), "paid": float(paid), "outstanding": float(max(invoiced - Decimal(str(paid)), Decimal("0"))), "open_backorders": len(backorders), "active_subscriptions": sum(s.status == "ACTIVE" for s in subscriptions)}, "quotes": [{"id": q.id, "number": q.quotation_number, "status": q.status, "value": float(_quote_total(db, q.id)), "created_at": q.created_at.isoformat()} for q in quotes[:20]], "invoices": [{"id": i.id, "number": i.invoice_number, "amount": float(i.amount), "status": i.status, "due_date": i.due_date.isoformat()} for i in invoices]}


@router.get("/analytics/revenue")
def revenue_analytics(current_user: User = Depends(require_role("ADMIN", "SALES", "SALES_MANAGER", "FINANCE")), db: Session = Depends(get_db)):
    quotes = db.query(Quotation).all()
    values = {"pipeline": Decimal("0"), "won": Decimal("0"), "invoiced": Decimal("0")}
    stage_counts = {}
    for q in quotes:
        total = _quote_total(db, q.id)
        stage_counts[q.status] = stage_counts.get(q.status, 0) + 1
        if q.status not in {"REJECTED", "CANCELLED"}:
            values["pipeline"] += total
        if q.status in {"APPROVED", "CONFIRMED", "PARTIALLY_FULFILLED", "FULFILLED", "INVOICED"}:
            values["won"] += total
        if q.status == "INVOICED":
            values["invoiced"] += total
    invoice_total = db.query(func.coalesce(func.sum(Invoice.amount), 0)).scalar() or Decimal("0")
    payment_total = db.query(func.coalesce(func.sum(Payment.amount), 0)).scalar() or Decimal("0")
    return {"metrics": {"pipeline_value": float(values["pipeline"]), "won_value": float(values["won"]), "invoiced_value": float(invoice_total), "collected_value": float(payment_total), "outstanding_value": float(max(Decimal(str(invoice_total)) - Decimal(str(payment_total)), Decimal("0"))), "win_rate": round((values["won"] / max(values["pipeline"], Decimal("1"))) * 100, 1)}, "stages": [{"status": k, "count": v} for k, v in sorted(stage_counts.items())]}


@router.get("/deal-health")
def deal_health_v2(current_user: User = Depends(require_role("ADMIN", "SALES", "SALES_MANAGER", "FINANCE")), db: Session = Depends(get_db)):
    quotes = db.query(Quotation).order_by(Quotation.updated_at.desc()).all()
    result = []
    for q in quotes:
        risk = db.query(RiskEvaluation).filter(RiskEvaluation.quotation_id == q.id).order_by(RiskEvaluation.id.desc()).first()
        open_bo = db.query(func.coalesce(func.sum(Backorder.quantity), 0)).filter(Backorder.quotation_id == q.id, Backorder.status == "OPEN").scalar() or 0
        total = _quote_total(db, q.id)
        score = 100
        alerts = []
        if risk and risk.risk_level == "HIGH": score -= 35; alerts.append("High policy deviation")
        if open_bo: score -= min(30, int(open_bo) * 10); alerts.append(f"{open_bo} open backordered units")
        if q.status in {"DRAFT", "UNDER_APPROVAL"}: score -= 10; alerts.append("Deal not yet committed")
        score = max(0, score)
        band = "HEALTHY" if score >= 80 else "WATCH" if score >= 60 else "AT_RISK"
        result.append({"id": q.id, "number": q.quotation_number, "status": q.status, "value": float(total), "score": score, "band": band, "alerts": alerts})
    return {"summary": {"total": len(result), "healthy": sum(x["band"] == "HEALTHY" for x in result), "watch": sum(x["band"] == "WATCH" for x in result), "at_risk": sum(x["band"] == "AT_RISK" for x in result)}, "deals": result}


@router.get("/warehouse")
def smart_warehouse(current_user: User = Depends(require_role("ADMIN", "SALES", "SALES_MANAGER", "FINANCE")), db: Session = Depends(get_db)):
    rows = db.query(Inventory, Product).join(Product, Product.id == Inventory.product_id).all()
    items = []
    for inv, product in rows:
        demand = db.query(func.coalesce(func.sum(QuotationLine.quantity), 0)).join(Quotation, Quotation.id == QuotationLine.quotation_id).filter(QuotationLine.product_id == product.id, Quotation.status.notin_(["REJECTED", "CANCELLED"])).scalar() or 0
        backorder = db.query(func.coalesce(func.sum(Backorder.quantity), 0)).filter(Backorder.quotation_line_id.in_(db.query(QuotationLine.id).filter(QuotationLine.product_id == product.id)), Backorder.status == "OPEN").scalar() or 0
        available = inv.available_quantity
        urgency = "CRITICAL" if available + backorder < demand else "LOW" if available < max(5, demand // 3) else "HEALTHY"
        items.append({"product_id": product.id, "product": product.name, "available": available, "open_demand": int(demand), "backordered": int(backorder), "signal": urgency})
    return {"items": sorted(items, key=lambda x: {"CRITICAL": 0, "LOW": 1, "HEALTHY": 2}[x["signal"]])}


@router.get("/next-best-actions")
def next_best_actions(current_user: User = Depends(require_role("ADMIN", "SALES", "SALES_MANAGER", "FINANCE")), db: Session = Depends(get_db)):
    actions = []
    for q in db.query(Quotation).order_by(Quotation.updated_at.desc()).limit(40).all():
        total = _quote_total(db, q.id)
        risk = db.query(RiskEvaluation).filter(RiskEvaluation.quotation_id == q.id).order_by(RiskEvaluation.id.desc()).first()
        open_bo = db.query(func.count(Backorder.id)).filter(Backorder.quotation_id == q.id, Backorder.status == "OPEN").scalar() or 0
        if risk and risk.risk_level == "HIGH": actions.append({"priority": "HIGH", "quote_id": q.id, "title": f"Resolve policy exception on {q.quotation_number}", "reason": risk.reason, "action": "Review discount and approval path"})
        elif open_bo: actions.append({"priority": "HIGH", "quote_id": q.id, "title": f"Recover {q.quotation_number}", "reason": f"{open_bo} open backorder(s)", "action": "Rebalance inventory or update delivery commitment"})
        elif q.status == "DRAFT": actions.append({"priority": "MEDIUM", "quote_id": q.id, "title": f"Advance {q.quotation_number}", "reason": f"{total:,.0f} of uncommitted pipeline", "action": "Complete configuration and submit for approval"})
    return {"items": actions[:15]}


@router.get("/pipeline")
def revenue_pipeline(current_user: User = Depends(require_role("ADMIN", "SALES", "SALES_MANAGER", "FINANCE")), db: Session = Depends(get_db)):
    stages = ["DRAFT", "UNDER_APPROVAL", "APPROVED", "CONFIRMED", "PARTIALLY_FULFILLED", "FULFILLED", "INVOICED", "REJECTED"]
    data = []
    for stage in stages:
        qs = db.query(Quotation).filter(Quotation.status == stage).all()
        data.append({"stage": stage, "count": len(qs), "value": float(sum((_quote_total(db, q.id) for q in qs), Decimal("0")))})
    return {"stages": data}


@router.get("/receivables")
def receivables(current_user: User = Depends(require_role("ADMIN", "SALES_MANAGER", "FINANCE")), db: Session = Depends(get_db)):
    today = date.today()
    invoices = db.query(Invoice).all()
    rows = []
    for inv in invoices:
        paid = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(Payment.invoice_id == inv.id).scalar() or Decimal("0")
        outstanding = max(Decimal(str(inv.amount)) - Decimal(str(paid)), Decimal("0"))
        if outstanding <= 0: continue
        days = max(0, (today - inv.due_date).days)
        bucket = "CURRENT" if days == 0 else "1-30" if days <= 30 else "31-60" if days <= 60 else "61-90" if days <= 90 else "90+"
        rows.append({"invoice_id": inv.id, "invoice_number": inv.invoice_number, "customer_id": inv.customer_id, "amount": float(inv.amount), "paid": float(paid), "outstanding": float(outstanding), "due_date": inv.due_date.isoformat(), "days_overdue": days, "bucket": bucket})
    return {"summary": {"outstanding": float(sum((Decimal(str(r["outstanding"])) for r in rows), Decimal("0"))), "overdue": float(sum((Decimal(str(r["outstanding"])) for r in rows if r["days_overdue"] > 0), Decimal("0"))), "invoices": len(rows)}, "buckets": [{"bucket": b, "value": float(sum((Decimal(str(r["outstanding"])) for r in rows if r["bucket"] == b), Decimal("0")))} for b in ["CURRENT", "1-30", "31-60", "61-90", "90+"]], "items": rows}


@router.get("/ai/deal/{quotation_id}")
def dealflow_ai(quotation_id: int, current_user: User = Depends(require_role("ADMIN", "SALES", "SALES_MANAGER", "FINANCE")), db: Session = Depends(get_db)):
    q = db.get(Quotation, quotation_id)
    if not q: raise HTTPException(status_code=404, detail="Quotation not found")
    total = _quote_total(db, q.id)
    risk = db.query(RiskEvaluation).filter(RiskEvaluation.quotation_id == q.id).order_by(RiskEvaluation.id.desc()).first()
    open_bo = db.query(func.coalesce(func.sum(Backorder.quantity), 0)).filter(Backorder.quotation_id == q.id, Backorder.status == "OPEN").scalar() or 0
    if risk and risk.risk_level == "HIGH": recommendation = "Hold commercial commitment until the policy exception is approved or the discount is corrected."
    elif open_bo: recommendation = "Protect the customer promise first: resolve inventory allocation before committing a final delivery date."
    elif q.status == "DRAFT": recommendation = "This deal is actionable. Finish configuration, validate policy, and submit for approval."
    elif q.status in {"APPROVED", "CONFIRMED"}: recommendation = "Move the deal into fulfillment and keep the customer informed of delivery milestones."
    elif q.status == "INVOICED": recommendation = "Focus on collection and expansion: review receivables and active subscription opportunities."
    else: recommendation = "Monitor the deal for the next workflow transition."
    return {"deal": {"id": q.id, "number": q.quotation_number, "status": q.status, "value": float(total)}, "signals": {"risk": risk.risk_level if risk else "NOT_EVALUATED", "open_backorders": int(open_bo)}, "recommendation": recommendation, "explainability": ["Uses current quotation status and commercial value", "Uses latest risk evaluation when available", "Uses open backorders to prioritize operational risk"], "generated_at": datetime.utcnow().isoformat()}


@router.post("/auth/change-password")
def change_password(payload: dict = Body(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    current = str(payload.get("current_password") or "")
    new = str(payload.get("new_password") or "")
    if not verify_password(current, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(new) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters")
    if not re.search(r"[A-Z]", new):
        raise HTTPException(status_code=400, detail="New password must contain at least 1 uppercase letter")
    if not re.search(r"[0-9]", new):
        raise HTTPException(status_code=400, detail="New password must contain at least 1 number")
    if not re.search(r"[^A-Za-z0-9]", new):
        raise HTTPException(status_code=400, detail="New password must contain at least 1 special character")
    if verify_password(new, current_user.password_hash):
        raise HTTPException(status_code=400, detail="New password must be different from your current password")
    current_user.password_hash = hash_password(new)
    _audit(db, current_user.id, "USER", current_user.id, "PASSWORD_CHANGED")
    db.commit()
    return {"ok": True, "message": "Password changed successfully"}
