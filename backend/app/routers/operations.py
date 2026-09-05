from datetime import date, datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_user, require_role
from app.models.customer_user import CustomerUser
from app.models.operations import (
    AuditEvent, Backorder, Fulfillment, Inventory, Invoice, Shipment,
    NegotiationRequest, SubscriptionPlan, Warehouse,
)
from app.models.product import Product
from app.models.quotation import Quotation
from app.models.quotation_line import QuotationLine
from app.models.user import User
from app.services.approval_engine import act_on_approval, create_approval_request
from app.services.operations import allocate_fulfillment, audit, create_invoices, create_subscriptions, record_payment
from app.services.risk_engine import evaluate_quotation_risk

router = APIRouter(tags=["Operations"])
sales_access = require_role("ADMIN", "SALES", "SALES_MANAGER", "FINANCE")

class WarehouseInput(BaseModel):
    name: str
    location: str | None = None

class InventoryInput(BaseModel):
    product_id: int
    warehouse_id: int
    available_quantity: int = Field(ge=0)

class AllocationInput(BaseModel):
    warehouse_id: int
    quantity: int = Field(gt=0)

class FulfillmentInput(BaseModel):
    overrides: dict[int, list[AllocationInput]] | None = None

class ApprovalAction(BaseModel):
    action: str
    reason: str | None = None

class PaymentInput(BaseModel):
    amount: Decimal = Field(gt=0)
    reference: str = Field(min_length=1)

class NegotiationInput(BaseModel):
    quotation_line_id: int | None = None
    requested_discount: Decimal | None = Field(default=None, ge=0, le=100)
    delivery_date: date | None = None
    comment: str = Field(min_length=1)

class PlanInput(BaseModel):
    name: str
    interval: str

@router.get("/warehouses")
def list_warehouses(db: Session = Depends(get_db), _: User = Depends(sales_access)):
    return db.query(Warehouse).order_by(Warehouse.id).all()

@router.post("/warehouses", status_code=201)
def create_warehouse(data: WarehouseInput, db: Session = Depends(get_db), _: User = Depends(require_role("ADMIN"))):
    if db.query(Warehouse).filter(Warehouse.name == data.name).first():
        raise HTTPException(409, "Warehouse already exists")
    row = Warehouse(**data.model_dump())
    db.add(row); db.commit(); db.refresh(row)
    return row

@router.get("/inventory")
def list_inventory(db: Session = Depends(get_db), _: User = Depends(sales_access)):
    return db.query(Inventory).order_by(Inventory.warehouse_id, Inventory.product_id).all()

@router.put("/inventory")
def set_inventory(data: InventoryInput, db: Session = Depends(get_db), _: User = Depends(require_role("ADMIN"))):
    row = db.query(Inventory).filter(Inventory.product_id == data.product_id, Inventory.warehouse_id == data.warehouse_id).one_or_none()
    if row:
        row.available_quantity = data.available_quantity
    else:
        row = Inventory(**data.model_dump()); db.add(row)
    db.commit(); db.refresh(row)
    return row

@router.get("/subscription-plans")
def list_plans(db: Session = Depends(get_db), _: User = Depends(sales_access)):
    return db.query(SubscriptionPlan).all()

@router.post("/subscription-plans", status_code=201)
def create_plan(data: PlanInput, db: Session = Depends(get_db), _: User = Depends(require_role("ADMIN"))):
    if data.interval not in {"MONTHLY", "QUARTERLY", "YEARLY"}:
        raise HTTPException(400, "Interval must be MONTHLY, QUARTERLY, or YEARLY")
    row = SubscriptionPlan(**data.model_dump()); db.add(row); db.commit(); db.refresh(row)
    return row

@router.post("/quotations/{quotation_id}/approvals/{step_id}/action")
def approval_action(quotation_id: int, step_id: int, data: ApprovalAction, db: Session = Depends(get_db), current: User = Depends(sales_access)):
    try:
        return act_on_approval(db, quotation_id, step_id, current, data.action, data.reason)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc

@router.post("/quotations/{quotation_id}/fulfill", status_code=201)
def fulfill(quotation_id: int, data: FulfillmentInput, db: Session = Depends(get_db), current: User = Depends(sales_access)):
    quote = db.get(Quotation, quotation_id)
    if not quote: raise HTTPException(404, "Quotation not found")
    if quote.status not in {"APPROVED", "CONFIRMED"}: raise HTTPException(400, "Quotation must be approved before fulfillment")
    if db.query(Fulfillment).filter(Fulfillment.quotation_id == quote.id).first():
        raise HTTPException(409, "Fulfillment has already been created for this quotation")
    try:
        overrides = {line_id: [item.model_dump() for item in rows] for line_id, rows in (data.overrides or {}).items()}
        allocations, backorders = allocate_fulfillment(db, quote, overrides)
        # Allocation reserves stock; shipping is a separate explicit action.
        by_warehouse = {}
        for allocation in allocations:
            allocation.status = "READY"
            by_warehouse.setdefault(allocation.warehouse_id, []).append(allocation)
        for warehouse_id, rows in by_warehouse.items():
            shipment = Shipment(
                shipment_number=f"SHP-{quote.id}-{warehouse_id}-{int(datetime.utcnow().timestamp())}",
                quotation_id=quote.id, warehouse_id=warehouse_id, status="READY", shipment_cost=Decimal("0.00")
            )
            db.add(shipment); db.flush()
            for row in rows: row.shipment_id = shipment.id
        create_subscriptions(db, quote)
        # Allocation service sets a fulfillment status; restore the correct lifecycle state.
        quote.status = "PARTIALLY_FULFILLED" if backorders else "READY_TO_SHIP"
        audit(db, current.id, "quotation", quote.id, "FULFILLMENT_CREATED")
        db.commit()
        return {"allocations": allocations, "backorders": backorders, "status": quote.status}
    except ValueError as exc:
        db.rollback(); raise HTTPException(400, str(exc)) from exc

@router.get("/quotations/{quotation_id}/fulfillment/recommendation")
def fulfillment_recommendation(quotation_id: int, db: Session = Depends(get_db), _: User = Depends(sales_access)):
    quote = db.get(Quotation, quotation_id)
    if not quote: raise HTTPException(404, "Quotation not found")
    recommendations = []
    lines = db.query(QuotationLine).filter(QuotationLine.quotation_id == quote.id).all()
    for line in lines:
        product = db.get(Product, line.product_id)
        if not product or product.is_subscription: continue
        remaining = line.quantity
        allocations = []
        stocks = (db.query(Inventory).join(Warehouse, Warehouse.id == Inventory.warehouse_id)
                  .filter(Inventory.product_id == line.product_id, Inventory.available_quantity > 0, Warehouse.is_active.is_(True))
                  .order_by(Inventory.id).all())
        for stock in stocks:
            if remaining <= 0: break
            qty = min(remaining, stock.available_quantity)
            allocations.append({"warehouse_id": stock.warehouse_id, "warehouse_name": db.get(Warehouse, stock.warehouse_id).name, "quantity": qty})
            remaining -= qty
        recommendations.append({
            "quotation_line_id": line.id, "product_id": line.product_id, "product_name": product.name,
            "required_quantity": line.quantity, "allocated_quantity": line.quantity - remaining,
            "backorder_quantity": remaining, "allocations": allocations
        })
    return {"quotation": quote, "recommendations": recommendations}

@router.get("/quotations/{quotation_id}/fulfillment")
def fulfillment_details(quotation_id: int, db: Session = Depends(get_db), _: User = Depends(sales_access)):
    quote = db.get(Quotation, quotation_id)
    if not quote: raise HTTPException(404, "Quotation not found")
    fulfillments = db.query(Fulfillment).filter(Fulfillment.quotation_id == quotation_id).all()
    shipments = db.query(Shipment).filter(Shipment.quotation_id == quotation_id).all()
    backorders = db.query(Backorder).filter(Backorder.quotation_id == quotation_id).all()
    lines = db.query(QuotationLine).filter(QuotationLine.quotation_id == quotation_id).all()
    line_summary = []
    for line in lines:
        allocated = sum(x.quantity for x in fulfillments if x.quotation_line_id == line.id)
        outstanding = sum(x.quantity for x in backorders if x.quotation_line_id == line.id and x.status == "OPEN")
        line_summary.append({"quotation_line_id": line.id, "product_id": line.product_id, "required": line.quantity, "allocated": allocated, "backorder": outstanding})
    return {"quotation": quote, "fulfillments": fulfillments, "shipments": shipments, "backorders": backorders, "line_summary": line_summary}

@router.post("/quotations/{quotation_id}/ship")
def ship_quotation(quotation_id: int, db: Session = Depends(get_db), current: User = Depends(sales_access)):
    quote = db.get(Quotation, quotation_id)
    if not quote: raise HTTPException(404, "Quotation not found")
    shipments = db.query(Shipment).filter(Shipment.quotation_id == quotation_id, Shipment.status == "READY").all()
    if not shipments: raise HTTPException(400, "No READY shipments are available")
    now = datetime.utcnow()
    for shipment in shipments:
        shipment.status = "SHIPPED"; shipment.shipped_at = now
        for row in db.query(Fulfillment).filter(Fulfillment.shipment_id == shipment.id).all(): row.status = "SHIPPED"
    open_backorders = db.query(Backorder).filter(Backorder.quotation_id == quotation_id, Backorder.status == "OPEN").count()
    quote.status = "PARTIALLY_FULFILLED" if open_backorders else "FULFILLED"
    audit(db, current.id, "quotation", quote.id, "SHIPMENT_SHIPPED")
    db.commit()
    return {"status": quote.status, "shipments": shipments}

@router.post("/backorders/{backorder_id}/consolidate")
def consolidate_backorder(backorder_id: int, db: Session = Depends(get_db), current: User = Depends(sales_access)):
    backorder = db.get(Backorder, backorder_id)
    if not backorder: raise HTTPException(404, "Backorder not found")
    if backorder.status != "OPEN": raise HTTPException(400, "Backorder is not open")
    line = db.get(QuotationLine, backorder.quotation_line_id)
    stocks = (db.query(Inventory).join(Warehouse, Warehouse.id == Inventory.warehouse_id)
              .filter(Inventory.product_id == line.product_id, Inventory.available_quantity > 0, Warehouse.is_active.is_(True))
              .order_by(Inventory.id).all())
    remaining = backorder.quantity
    for stock in stocks:
        if remaining <= 0: break
        qty = min(remaining, stock.available_quantity); stock.available_quantity -= qty
        shipment = Shipment(shipment_number=f"SHP-BO-{backorder.id}-{stock.warehouse_id}-{int(datetime.utcnow().timestamp())}", quotation_id=backorder.quotation_id, warehouse_id=stock.warehouse_id, status="SHIPPED", shipment_cost=Decimal("0.00"), shipped_at=datetime.utcnow())
        db.add(shipment); db.flush()
        db.add(Fulfillment(quotation_id=backorder.quotation_id, quotation_line_id=line.id, warehouse_id=stock.warehouse_id, shipment_id=shipment.id, quantity=qty, status="SHIPPED"))
        remaining -= qty
    backorder.quantity = remaining
    if remaining == 0:
        backorder.status = "FULFILLED"; backorder.fulfilled_at = date.today()
    quote = db.get(Quotation, backorder.quotation_id)
    if quote and remaining == 0 and db.query(Backorder).filter(Backorder.quotation_id == quote.id, Backorder.status == "OPEN").count() == 0:
        quote.status = "FULFILLED"
    audit(db, current.id, "backorder", backorder.id, "BACKORDER_CONSOLIDATED")
    db.commit()
    return {"backorder_id": backorder.id, "remaining_quantity": remaining, "status": backorder.status}

@router.post("/quotations/{quotation_id}/invoices", status_code=201)
def invoice_quote(quotation_id: int, db: Session = Depends(get_db), current: User = Depends(sales_access)):
    quote = db.get(Quotation, quotation_id)
    if not quote: raise HTTPException(404, "Quotation not found")
    if quote.status not in {"FULFILLED", "PARTIALLY_FULFILLED", "READY_TO_SHIP"}: raise HTTPException(400, "Quotation is not ready for invoicing")
    invoices = create_invoices(db, quote); audit(db, current.id, "quotation", quote.id, "INVOICES_GENERATED"); db.commit()
    return invoices

@router.get("/invoices")
def list_invoices(db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    q = db.query(Invoice)
    if current.role == "CUSTOMER":
        profile = db.query(CustomerUser).filter(CustomerUser.user_id == current.id).one_or_none()
        if not profile: raise HTTPException(400, "Customer account is not linked to a customer record")
        q = q.filter(Invoice.customer_id == profile.customer_id)
    elif current.role not in {"ADMIN", "SALES", "SALES_MANAGER", "FINANCE"}: raise HTTPException(403, "You do not have permission for this resource")
    return q.order_by(Invoice.id.desc()).all()

@router.post("/invoices/{invoice_id}/payments", status_code=201)
def pay_invoice(invoice_id: int, data: PaymentInput, db: Session = Depends(get_db), current: User = Depends(sales_access)):
    invoice = db.get(Invoice, invoice_id)
    if not invoice: raise HTTPException(404, "Invoice not found")
    try:
        payment = record_payment(db, invoice, data.amount, data.reference); audit(db, current.id, "invoice", invoice.id, "DEMO_PAYMENT_RECORDED"); db.commit()
        return {"payment": payment, "invoice_status": invoice.status}
    except ValueError as exc:
        db.rollback(); raise HTTPException(400, str(exc)) from exc

@router.post("/customer/quotations/{quotation_id}/negotiations", status_code=201)
def negotiate(quotation_id: int, data: NegotiationInput, db: Session = Depends(get_db), current: User = Depends(require_role("CUSTOMER"))):
    profile = db.query(CustomerUser).filter(CustomerUser.user_id == current.id).one_or_none(); quote = db.get(Quotation, quotation_id)
    if not profile or not quote or quote.customer_id != profile.customer_id: raise HTTPException(404, "Quotation not found")
    if data.quotation_line_id:
        line = db.get(QuotationLine, data.quotation_line_id)
        if not line or line.quotation_id != quote.id: raise HTTPException(400, "Quotation line does not belong to this quotation")
        if data.requested_discount is not None: line.discount_percent = data.requested_discount
    request = NegotiationRequest(quotation_id=quote.id, **data.model_dump()); db.add(request)
    try:
        risk = evaluate_quotation_risk(db, quote.id); quote.status = "UNDER_APPROVAL" if risk.risk_level != "LOW" else "APPROVED"
        approval = create_approval_request(db, quote.id) if risk.risk_level != "LOW" else None
        audit(db, current.id, "quotation", quote.id, "NEGOTIATION_SUBMITTED", data.comment); db.commit()
        return {"negotiation": request, "risk": risk, "approval_request": approval, "quotation_status": quote.status}
    except ValueError as exc:
        db.rollback(); raise HTTPException(400, str(exc)) from exc

@router.get("/customer/quotations/{quotation_id}")
def customer_quote(quotation_id: int, db: Session = Depends(get_db), current: User = Depends(require_role("CUSTOMER"))):
    profile = db.query(CustomerUser).filter(CustomerUser.user_id == current.id).one_or_none(); quote = db.get(Quotation, quotation_id)
    if not profile or not quote or quote.customer_id != profile.customer_id: raise HTTPException(404, "Quotation not found")
    return {"quotation": quote, "lines": db.query(QuotationLine).filter(QuotationLine.quotation_id == quote.id).all(), "negotiations": db.query(NegotiationRequest).filter(NegotiationRequest.quotation_id == quote.id).all()}

@router.get("/audit-events")
def audit_events(db: Session = Depends(get_db), _: User = Depends(sales_access)):
    return db.query(AuditEvent).order_by(AuditEvent.id.desc()).limit(100).all()
