# LabLink


## Structure
LabLink is a managed donation marketplace for surplus scientific and clinical equipment. This repository now includes a greenfield implementation scaffold aligned to `docs/PRD.md`:

- `frontend/`: Next.js App Router application with public browse flows plus donor, recipient, and admin dashboards
- `backend/`: FastAPI service with Pydantic schemas and REST endpoints
- `database/`: PostgreSQL schema and Supabase policy scaffolding
- `infrastructure/`: deployment notes and environment template placeholders

## Local Development/Onboarding

### Prerequisites
Prereqs before running the project locally: 
- make
- python3
- npm and Node.js

To confirm prereqs are installed:
```bash
node -v
npm -v
python3 --version
make --version
```

Notes: 
- Installing Node.js includes npm. 
- The project setup command will create its own Python virtual environment for the backend so you do not need to create one manually before running make setup. 

### Project setup steps 
1. make setup 

  - installs the frontend dependencies and creates `backend/.venv` with the backend package installed in editable mode.

2. make dev-backend (in new terminal) --> runs backend
3. make dev-frontend (in new terminal) --> runs frontend

### Frontend Commands
1. `cd frontend`
2. `npm install`
3. `npm run dev`

### Backend Commands
1. `cd backend`
2. `python -m venv .venv && source .venv/bin/activate`
3. `pip install -e .`
4. `uvicorn app.main:app --reload --reload-dir app`

### Notification Email Setup
- Set `LABLINK_RESEND_API_KEY`, `LABLINK_EMAIL_FROM`, and optionally `LABLINK_EMAIL_REPLY_TO` in `backend/.env`.
- Set `LABLINK_NOTIFICATION_WEBHOOK_SECRET` for the Supabase Database Webhook that sends new notification emails immediately.
- Set `LABLINK_EMAIL_CRON_TOKEN` for the protected outbox processor endpoint.
- Configure a Supabase Database Webhook on `public.notifications` `INSERT` events to call `POST /api/v1/internal/webhooks/notification-email` with header `X-LabLink-Webhook-Secret: <LABLINK_NOTIFICATION_WEBHOOK_SECRET>`.
- Run the notification email retry job on a schedule by calling `POST /api/v1/internal/jobs/notification-emails/process` with `Authorization: Bearer <LABLINK_EMAIL_CRON_TOKEN>`.

### Handy root commands
For local development, point the frontend API base URL at `http://127.0.0.1:8000/api/v1` so the browser and backend use the same loopback host consistently.

### Database Migration Workflow
- `supabase/migrations/` is the only executable source of truth for database changes.
- Create a migration with `make db-new name=<migration_name>`.
- Preview pending changes with `make db-dry-run`.
- Apply them with `make db-push`.
- Check local versus remote status with `make db-status`.
- `database/` SQL files are reference-only and are not pushed automatically.
