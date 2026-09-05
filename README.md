# DealFlow360

DealFlow360 is an end-to-end B2B quote-to-cash platform built for the hackathon problem statement.

Core flow: Login → Quotation → Discount governance → Explainable risk → Sequential approval → Customer negotiation → Re-approval → Multi-warehouse fulfillment → Subscription billing → Invoice → Payment → Deal Health.

## Stack
- FastAPI + SQLAlchemy
- PostgreSQL
- React + Vite
- JWT authentication with role-based access
- Docker Compose

## Roles
- Admin: platform configuration
- Sales: quotation and customer workflow
- Sales Manager: first-level commercial approval
- Finance: second-level high-risk approval and billing
- Customer: restricted negotiation portal

## Run locally
1. Start PostgreSQL with `docker compose up -d postgres`.
2. Copy `backend/.env.example` to `backend/.env` and set a real secret for non-demo use.
3. Install backend dependencies: `pip install -r backend/requirements.txt`.
4. Run the API: `uvicorn app.main:app --reload --app-dir backend`.
5. In another terminal: `cd frontend && npm install && npm run dev`.

Seed demo data with `python backend/seed_users.py` and `python backend/seed_demo.py` after the database is available.

## Demo-ready business rules
Discount policy and risk are calculated in backend services, approvals are sequential, customer negotiation is restricted by customer ownership, fulfillment uses live inventory and row locks, subscriptions are separated from one-time fulfillment, invoices reconcile shipped physical quantities, and payments cannot exceed the invoice balance.
