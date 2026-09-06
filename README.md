# DealFlow360

DealFlow360 is an end-to-end sales operations platform built for the DealFlow360 hackathon. It connects quotation creation, pricing controls, risk evaluation, approvals, fulfillment, invoicing, customer visibility, and operational intelligence in one workflow.

## What the project solves

Traditional sales workflows often split information across spreadsheets, chat, approval messages, inventory systems, and finance tools. DealFlow360 keeps the deal lifecycle connected so teams can answer:

- What deals are being created?
- Is the proposed price within policy?
- Does the deal need approval?
- Why is a deal risky?
- What inventory can actually be fulfilled?
- What should happen after approval?
- Which customers and products are driving revenue?
- What needs attention next?

## End-to-end flow

```text
User Login
   ↓
Role-based Workspace
   ↓
Customer + Product Selection
   ↓
Quotation Creation
   ↓
Pricing / Discount Policy Engine
   ↓
Risk Evaluation
   ↓
Sequential Approval
   │   Manager → Finance
   ↓
Fulfillment / Warehouse Allocation
   ↓
Shipment / Backorder Handling
   ↓
Invoice + Payment Tracking
   ↓
Customer Portal + Operational Intelligence
```

## User roles

### Admin
- Manage users, customers, products, and discount policies.
- View operational data and platform-level controls.

### Sales
- Create and manage quotations.
- Work with customers and products.
- Track quotation and approval status.

### Sales Manager
- Review deals requiring managerial approval.
- Understand pricing and risk reasons before approving.

### Finance
- Review finance-stage approvals.
- Validate financial risk before the deal moves forward.

### Customer
- Access a customer-facing portal.
- View quotations and relevant deal information.

## Core capabilities

### 1. Authentication and access control
- Email/password login.
- Role-based access control.
- Protected frontend routes.
- Backend authorization dependencies.
- Google OAuth scaffolding with provisioning checks for existing DealFlow360 users.

### 2. Quotation management
- Create quotations with multiple line items.
- Product selection and quantity handling.
- Pricing and discount calculations.
- Quotation status tracking.

### 3. Pricing and discount policy engine
The pricing layer evaluates discounts against configured business policies rather than treating every discount as automatically acceptable.

### 4. Risk evaluation
Deals can be evaluated using explainable business rules such as policy deviation and discount/risk signals. The result is visible to reviewers instead of being a black-box decision.

### 5. Sequential approvals
The approval workflow supports staged review:

```text
Quotation
   ↓
Manager Approval
   ↓
Finance Approval
   ↓
Approved for Operations
```

This prevents a downstream stage from bypassing the required approval sequence.

### 6. Fulfillment and warehouse operations
- Inventory-aware fulfillment.
- Physical quantity handling.
- Warehouse allocation.
- Backorder support when stock is insufficient.
- Shipment progression.

### 7. Invoicing and payments
Invoices are connected to operational fulfillment so billing can reflect shipped physical quantities rather than simply assuming that every ordered quantity has shipped.

### 8. Customer 360
Customer intelligence brings customer-level information together so teams can understand the customer's quotations, commercial activity, and operational context from one place.

### 9. Deal Health 2.0
Deal Health surfaces explainable warnings and signals around a quotation so users can focus attention on deals that need intervention.

### 10. Operational intelligence
The project includes intelligence endpoints and UI concepts for:

- Notifications
- Audit trail
- Global search
- Customer 360
- Revenue analytics
- Deal Health 2.0
- DealFlow AI-style deal analysis
- Smart warehouse insights
- Next-best-action recommendations
- Revenue pipeline analytics
- Receivables analytics

The intelligence layer is designed to be deterministic and explainable for the hackathon rather than pretending that a black-box model made a business decision.

## Architecture

```text
React + Vite frontend
        │
        │ HTTP / JSON
        ▼
FastAPI backend
        │
        ├── Authentication / RBAC
        ├── Quotation APIs
        ├── Operations APIs
        ├── Approval / Risk services
        └── Intelligence APIs
        │
        ▼
PostgreSQL
```

### Technology stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Backend | FastAPI |
| Database | PostgreSQL |
| ORM | SQLAlchemy |
| Authentication | JWT + password hashing |
| OAuth | Google OAuth scaffolding |
| Styling | CSS |

## Project structure

```text
dealflow360/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   ├── database/
│   │   ├── models/
│   │   ├── routers/
│   │   ├── schemas/
│   │   └── services/
│   └── seed_demo.py
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   └── styles/
│   └── package.json
│
└── README.md
```

## Running locally

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 14+

### 1. Configure PostgreSQL

Create a PostgreSQL database and set the backend database connection in the backend environment configuration.

Example local connection:

```text
postgresql+psycopg2://dealflow:dealflow_dev@localhost:5432/dealflow360
```

Do not commit production credentials or secrets.

### 2. Start the backend

From the `backend` directory:

```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Health check:

```text
http://127.0.0.1:8000/health
```

### 3. Start the frontend

From the `frontend` directory:

```bash
npm install
npm run dev
```

The Vite development server normally runs at:

```text
http://localhost:5173
```

### 4. Demo accounts

The demo seed provides role-based accounts for local demonstration. Check the current seed script before sharing credentials outside the development environment.

## Google Sign-In

Google sign-in is implemented as OAuth scaffolding and is intentionally restricted to users already provisioned in DealFlow360.

For a real deployment, configure Google Cloud OAuth credentials and set the corresponding backend environment variables. Never commit the Google client secret.

## Security notes

- Keep JWT secrets outside source control in production.
- Use environment variables for database credentials and OAuth secrets.
- Use HTTPS in production.
- Do not use demo passwords in a production deployment.
- Keep authorization checks on the backend; frontend route protection alone is not a security boundary.
- Validate tenant/customer ownership at the API and database-query level before deploying multi-tenant production workloads.

## Hackathon design principles

1. **Business rules are visible.** Reviewers should be able to understand why a deal was flagged.
2. **Workflow is end-to-end.** A quotation is not considered complete until the downstream operational lifecycle is represented.
3. **Role-specific UX.** Admin, Sales, Manager, Finance, and Customer users should see the information relevant to their job.
4. **Operational truth over decoration.** Dashboards should be backed by application data rather than static mock numbers.
5. **Fast but explainable.** The system favors understandable rules and services that can be defended during a technical/business jury review.

## Status

DealFlow360 is a hackathon-stage application. Some production concerns—such as production-grade email delivery for password recovery, complete database-level tenant isolation, and production OAuth deployment configuration—require additional deployment work before the system should be treated as a production SaaS platform.
