# LabLink — Claude Instructions

## Read First (Every Session)
1. `AGENTS.md` — engineering rules, stack, product model, coding constraints
2. `docs/PRD.md` — full product spec; source of truth for all features
3. `PROGRESS.md` — feature-by-feature implementation status
4. `WORK.md` — completed sessions, active work, prioritized backlog

## What LabLink Is
A **managed donation marketplace** for surplus scientific and clinical equipment. Donor labs list equipment, recipient institutions request it, LabLink admins verify organizations, approve listings, arbitrate requests, and coordinate fulfillment. **Not ecommerce — no buyer-to-seller checkout.** All communication between donors and recipients happens via email (Resend) — there is no in-app chat UI.

## Roles
`donor_lab` | `recipient_institution` | `admin`
Never use seller/buyer terminology. Always use donor/recipient.

## Stack
| Layer | Tech |
|---|---|
| Frontend | Next.js 15 App Router, React 19, TypeScript, Supabase JS client — Vercel |
| Backend | FastAPI, Python 3.11+, Pydantic v2, httpx (Supabase REST — no SDK) — Railway |
| Database | Supabase PostgreSQL + RLS policies |
| Storage | Supabase Storage (listing photos, compliance PDFs) |
| Auth | Supabase Auth (JWT bearer tokens) |
| Email | Resend API, outbox pattern (webhook + cron + exponential backoff) |

## Key Files
| File | Purpose |
|---|---|
| `frontend/lib/api.ts` | All frontend API calls |
| `frontend/lib/types.ts` | All TypeScript types (mirrors backend schemas) |
| `frontend/lib/auth.ts` | Supabase token helper (getAccessToken with refresh) |
| `backend/app/services/supabase_listings.py` | Core business logic (~2600 lines) |
| `backend/app/services/supabase_profiles.py` | User + institution management |
| `backend/app/services/notification_email.py` | Email template rendering |
| `backend/app/schemas/domain.py` | All Pydantic schemas + all enums |
| `backend/app/core/config.py` | Settings (env vars prefixed `LABLINK_*`) |
| `backend/app/api/routes/donor.py` | Donor API routes |
| `backend/app/api/routes/recipient.py` | Recipient API routes |
| `backend/app/api/routes/admin.py` | Admin API routes |
| `backend/app/api/routes/dependencies.py` | Auth dependency injection |
| `backend/tests/test_listing_lifecycle.py` | Lifecycle enforcement tests (14 tests) |
| `supabase/migrations/` | Database schema migrations |
| `docs/superpowers/specs/` | Design specs from brainstorming sessions |
| `docs/superpowers/plans/` | Implementation plans |

## Architecture Patterns

### Frontend
- Async server components for pages (fetch at request time)
- `"use client"` only for interactive widgets (forms, filters, modals, buttons)
- `listing.request_count` = count of **active** (non-closed) requests only — reliable for conditional UI
- TypeScript types in `frontend/lib/types.ts` mirror backend Pydantic schemas exactly

### Backend
- Business logic in service classes, NOT in route handlers (routes are thin)
- `SupabaseListingService` is the main class — all marketplace logic lives here
- DB access: `httpx` PATCH/GET/POST to Supabase REST with service role key
- Batch DB updates use Supabase REST filter params (e.g., `status=in.(submitted,admin_review)`)
- `_notify_institution()` — notify all users of a specific institution
- `_notify_role()` — notify all users with a given role
- Both methods insert to `notifications` table; outbox handles email delivery

### Notifications / Email
- Insert notification row → Supabase webhook triggers immediate email → cron retries failures
- `notification_email.py` selects template copy via `metadata.email_template_key`
- Existing template keys: `institution_verified/rejected/suspended/pending_verification`, `listing_submitted_for_review`, `listing_pending_admin_approval`, `listing_approved`, `listing_rejected`, `listing_under_review`, `listing_removed`, `listing_marked_donated`, `request_submitted`, `request_cancelled`, `request_selected`, `request_not_selected`, `match_cancelled`, `request_completed`, `catalog_listing_published`
- To add a new email template: add a new `if template_key == "..."` block in `_template_copy()` in `notification_email.py`, then add the key to `test_all_supported_templates_render_subject_and_cta` in `test_notification_email_templates.py`

### Lifecycle State Machines
**Listing:** `draft → pending_admin_approval → live → matched_reserved → fulfilled → removed_by_admin / removed_by_donor`
- Edits to `live` listings that change material fields AND have active requests → returns to `pending_admin_approval` (see `save_donor_listing`)
- Material fields: title, category, condition, quantity, description, working_status, delivery_mode, handling_requirements, special_handling_flags, availability_window, dimensions_weight
- `matched_reserved` listings are intentionally excluded from re-review on edit

**Request:** `submitted → admin_review → approved_matched → completed → rejected_cancelled`
- When listing removed (either path): all open requests bulk-cancelled to `rejected_cancelled`
- `_cancel_open_requests_for_listing()` — single bulk PATCH helper (guards if no open requests)

### Testing Patterns
- Tests use `unittest.TestCase` + `MagicMock` on `service._request`
- `make_service()` helper constructs a `SupabaseListingService` with stub URLs
- For integration tests, `fake_request(method, table, **kwargs)` as `side_effect`
- `_get_listing_row()` internally calls `_with_active_request_counts()` → `GET equipment_requests` — mock must handle multiple GET calls to equipment_requests
- Run tests: `cd backend && source .venv/bin/activate && python -m pytest tests/ -v`

## Coding Rules
- TypeScript in all frontend files. No `any` without justification.
- Pydantic models for all backend request/response schemas.
- Routes are thin — all logic in services.
- New DB columns require a migration in `supabase/migrations/`.
- Env vars use `LABLINK_` prefix, defined in `app/core/config.py`.
- Soft deletes via status enums — never hard-delete listings or requests.
- RBAC is first-class on every endpoint and page.
- No features, abstractions, or error handling beyond what the task requires.

## Development Commands
```bash
make front          # Next.js dev server
make back           # FastAPI with --reload
make db-new         # create new migration
make db-push        # apply migrations
make db-status      # check migration status

# Tests (from backend/)
source .venv/bin/activate && python -m pytest tests/ -v

# TypeScript check (from frontend/)
npx tsc --noEmit
```

## Environment Variables
**Backend `.env`:** `LABLINK_SUPABASE_URL`, `LABLINK_SUPABASE_SERVICE_ROLE_KEY`, `LABLINK_RESEND_API_KEY`, `LABLINK_EMAIL_FROM`, `LABLINK_EMAIL_REPLY_TO`, `LABLINK_NOTIFICATION_WEBHOOK_SECRET`, `LABLINK_EMAIL_CRON_TOKEN`

**Frontend `.env.local`:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_BASE_URL`

## Workflow
This project uses the Superpowers skill suite:
1. **Brainstorm** (`superpowers:brainstorming`) before any new feature — clarify requirements, pick an approach, write a spec to `docs/superpowers/specs/`
2. **Plan** (`superpowers:writing-plans`) — write implementation plan to `docs/superpowers/plans/`
3. **Execute** (`superpowers:subagent-driven-development`) — dispatch subagents per task with two-stage review (spec compliance → code quality)
4. **Finish** (`superpowers:finishing-a-development-branch`) — review and integrate

Always update `PROGRESS.md` and `WORK.md` after completing a feature.
