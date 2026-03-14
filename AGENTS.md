# LabLink Engineering Instructions

## Stack
- Next.js frontend
- FastAPI backend
- Supabase PostgreSQL database
- Amazon S3 for file storage
- Stripe only for optional platform donations

## Product Model
- LabLink v1 is a managed donation marketplace, not a checkout-based ecommerce marketplace.
- Public users can browse listings, but only admin-verified institutions can post listings or submit requests.
- Core roles are `donor_lab`, `recipient_institution`, and `admin`.
- Use donor and recipient terminology instead of seller and buyer terminology.

## Core Features
- Institution onboarding and admin verification
- Equipment listings with admin approval
- Recipient requests with admin-mediated matching
- Request-scoped messaging
- Donor, recipient, and admin dashboards
- Equipment request board
- Fulfillment tracking and impact reporting

## Coding Rules
- Use TypeScript in the frontend.
- Use Pydantic models in FastAPI.
- Prefer REST APIs unless a strong reason exists otherwise.
- Model explicit lifecycle states for accounts, listings, and requests.
- Treat role-based access control as a first-class requirement.
- Do not implement buyer-to-seller checkout or volunteer courier flows in v1.

## Initial Repo Shape
- `frontend/`: Next.js application
- `backend/`: FastAPI service
- `database/`: schema, migrations, and access policies
- `infrastructure/`: cloud and deployment configuration
- `docs/`: PRD and supporting product docs

## Source Of Truth
- Keep the current product definition in `docs/PRD.md`.
- Align generated code and migrations with the workflows and constraints documented there.
