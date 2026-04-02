# Infrastructure Notes

This repository includes application scaffolding only. Production infrastructure should provision:

- Next.js hosting for `frontend/`
- FastAPI service hosting for `backend/`
- Supabase project for PostgreSQL, authentication, row-level security, and storage
- Stripe configuration only for optional platform donations

## Suggested Environment Variables

### Frontend
- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Recommended production values for LabLink:

- `NEXT_PUBLIC_API_BASE_URL=https://api.lablinkusa.org/api/v1`
- `NEXT_PUBLIC_SITE_URL=https://lablinkusa.org`

### Backend
- `LABLINK_FRONTEND_ORIGIN`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_LISTING_IMAGES_BUCKET`
- `SUPABASE_LISTING_DOCUMENTS_BUCKET`
- `LABLINK_RESEND_API_KEY`
- `LABLINK_EMAIL_FROM`
- `LABLINK_EMAIL_REPLY_TO`
- `LABLINK_EMAIL_CRON_TOKEN`
- `LABLINK_EMAIL_BATCH_SIZE`
- `LABLINK_EMAIL_MAX_ATTEMPTS`

Recommended production value for LabLink:

- `LABLINK_FRONTEND_ORIGIN=https://lablinkusa.org`

## Railway Backend Setup

For this monorepo, configure a dedicated Railway service for `backend/`.

Required service settings:

- Root Directory: `/backend`
- Config-as-code path: `/backend/railway.toml`
- Generated public domain or custom API domain

The backend service uses:

- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Healthcheck path: `/api/v1/health`
- Python version: `3.11` via `/backend/.python-version`
- Python dependencies: `/backend/requirements.txt`

The frontend should point `NEXT_PUBLIC_API_BASE_URL` at the deployed backend domain plus `/api/v1`.

## Notification Email Processing

Notification emails are queued in-app and delivered by the protected internal job endpoint:

- `POST /api/v1/internal/jobs/notification-emails/process`

Required header:

- `Authorization: Bearer <LABLINK_EMAIL_CRON_TOKEN>`

If you want the in-app notification to email flow to work in production, configure a Railway Scheduled Job or an external scheduler to call that endpoint on a regular interval.
