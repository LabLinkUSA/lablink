# Infrastructure Notes

This repository includes application scaffolding only. Production infrastructure should provision:

- Next.js hosting for `frontend/`
- FastAPI service hosting for `backend/`
- Supabase project for PostgreSQL, authentication, and row-level security
- Amazon S3 bucket for listing photos and supporting documentation
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
- `LABLINK_DEMO_SEED_PATH`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `LABLINK_RESEND_API_KEY`
- `LABLINK_EMAIL_FROM`
- `LABLINK_EMAIL_REPLY_TO`
- `LABLINK_EMAIL_CRON_TOKEN`
- `LABLINK_EMAIL_BATCH_SIZE`
- `LABLINK_EMAIL_MAX_ATTEMPTS`
- `DATABASE_URL`
- `AWS_REGION`
- `AWS_S3_BUCKET`
- `STRIPE_SECRET_KEY`

Recommended production value for LabLink:

- `LABLINK_FRONTEND_ORIGIN=https://lablinkusa.org`
