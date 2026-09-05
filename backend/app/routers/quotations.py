from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)

from sqlalchemy.orm import Session

from app.core.dependencies import (
    get_current_user,
    get_db,
    require_role,
)

from app.models.customer import Customer
from app.models.customer_user import CustomerUser
from app.models.product import Product
from app.models.quotation import Quotation
from app.models.quotation_line import QuotationLine
from app.models.risk_evaluation import RiskEvaluation
from app.models.risk_line import RiskLine
from app.models.approval_request import ApprovalRequest
from app.models.approval_step import ApprovalStep
from app.models.user import User

from app.schemas.quotation import (
    QuotationCreate,
    QuotationResponse,
)

from app.schemas.quotation_line import (
    QuotationLineCreate,
    QuotationLineResponse,
)

from app.services.risk_engine import (
    evaluate_quotation_risk,
)

from app.services.approval_engine import (
    create_approval_request,
)


router = APIRouter(
    prefix="/quotations",
    tags=["Quotations"],
)


sales_access = require_role(
    "ADMIN",
    "SALES",
    "SALES_MANAGER",
    "FINANCE",
)


@router.get("/")
def list_quotations(
    db: Session = Depends(get_db),
    current_user: User = Depends(sales_access),
):
    quotations = (
        db.query(Quotation)
        .order_by(Quotation.id.desc())
        .all()
    )
    return quotations


@router.post(
    "/",
    response_model=QuotationResponse,
)
def create_quotation(
    quotation_data: QuotationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(sales_access),
):
    customer = db.get(Customer, quotation_data.customer_id)

    if customer is None:
        raise HTTPException(
            status_code=404,
            detail="Customer not found",
        )

    existing = (
        db.query(Quotation)
        .filter(
            Quotation.quotation_number
            == quotation_data.quotation_number
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Quotation number already exists",
        )

    quotation = Quotation(
        quotation_number=quotation_data.quotation_number,
        customer_id=quotation_data.customer_id,
        currency=quotation_data.currency,
    )

    db.add(quotation)
    db.commit()
    db.refresh(quotation)

    return quotation


@router.get("/customer/my-quotes")
def customer_quotations(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("CUSTOMER")),
):
    customer_user = (
        db.query(CustomerUser)
        .filter(CustomerUser.user_id == current_user.id)
        .one_or_none()
    )

    if customer_user is None:
        raise HTTPException(
            status_code=400,
            detail="Customer account is not linked to a customer record",
        )

    return (
        db.query(Quotation)
        .filter(Quotation.customer_id == customer_user.customer_id)
        .order_by(Quotation.id.desc())
        .all()
    )


@router.get("/{quotation_id}")
def get_quotation(
    quotation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(sales_access),
):
    quotation = db.get(Quotation, quotation_id)

    if quotation is None:
        raise HTTPException(
            status_code=404,
            detail="Quotation not found",
        )

    lines = (
        db.query(QuotationLine)
        .filter(QuotationLine.quotation_id == quotation_id)
        .all()
    )

    risk = (
        db.query(RiskEvaluation)
        .filter(RiskEvaluation.quotation_id == quotation_id)
        .order_by(RiskEvaluation.id.desc())
        .first()
    )

    risk_lines = []
    if risk:
        risk_lines = (
            db.query(RiskLine)
            .filter(RiskLine.risk_evaluation_id == risk.id)
            .order_by(RiskLine.quotation_line_id)
            .all()
        )

    return {
        "quotation": quotation,
        "lines": lines,
        "risk": risk,
        "risk_lines": risk_lines,
    }


@router.post(
    "/{quotation_id}/lines",
    response_model=QuotationLineResponse,
)
def create_quotation_line(
    quotation_id: int,
    line_data: QuotationLineCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(sales_access),
):
    quotation = db.get(Quotation, quotation_id)

    if quotation is None:
        raise HTTPException(
            status_code=404,
            detail="Quotation not found",
        )

    if quotation.status not in {
        "DRAFT",
        "SUBMITTED",
        "RETURNED_FOR_REVISION",
    }:
        raise HTTPException(
            status_code=400,
            detail="Quotation lines can only be changed while the quotation is editable",
        )

    product = db.get(Product, line_data.product_id)

    if product is None:
        raise HTTPException(
            status_code=404,
            detail="Product not found",
        )

    quotation_line = QuotationLine(
        quotation_id=quotation_id,
        product_id=line_data.product_id,
        quantity=line_data.quantity,
        unit_price=line_data.unit_price,
        discount_percent=line_data.discount_percent,
    )

    db.add(quotation_line)
    db.commit()
    db.refresh(quotation_line)

    return quotation_line


@router.post("/{quotation_id}/evaluate-risk")
def evaluate_risk(
    quotation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(sales_access),
):
    quotation = db.get(Quotation, quotation_id)

    if quotation is None:
        raise HTTPException(
            status_code=404,
            detail="Quotation not found",
        )

    if quotation.status in {"APPROVED", "REJECTED"}:
        raise HTTPException(
            status_code=400,
            detail=f"Quotation is already {quotation.status.lower()} and cannot be re-evaluated",
        )

    try:
        risk = evaluate_quotation_risk(
            db=db,
            quotation_id=quotation_id,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    approval = None

    if risk.risk_level != "LOW":
        approval = create_approval_request(
            db=db,
            quotation_id=quotation_id,
        )
        db.commit()
    else:
        quotation.status = "APPROVED"
        db.commit()

    risk_lines = (
        db.query(RiskLine)
        .filter(RiskLine.risk_evaluation_id == risk.id)
        .order_by(RiskLine.quotation_line_id)
        .all()
    )

    return {
        "risk": risk,
        "risk_lines": risk_lines,
        "approval_request": approval,
        "quotation_status": quotation.status,
    }


@router.get("/{quotation_id}/approval")
def get_approval(
    quotation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(sales_access),
):
    request = (
        db.query(ApprovalRequest)
        .filter(ApprovalRequest.quotation_id == quotation_id)
        .order_by(ApprovalRequest.id.desc())
        .first()
    )

    if request is None:
        return {
            "approval_request": None,
            "steps": [],
        }

    steps = (
        db.query(ApprovalStep)
        .filter(ApprovalStep.approval_request_id == request.id)
        .order_by(ApprovalStep.sequence)
        .all()
    )

    return {
        "approval_request": request,
        "steps": steps,
    }
