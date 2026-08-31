# LabLink Upgrade Specification

## Goal

Upgrade LabLink in three areas:

1. **Request Board** — Recipients post wanted-item requests; donors browse and respond
2. **Intelligent equipment matching** — Vector-based recommendations for admin recipient selection
3. **CI/CD + integration/E2E testing** — Automated quality gates before deployment

The existing application architecture remains intact.

Current stack to preserve: Next.js, React, TypeScript, FastAPI, Python, PostgreSQL/Supabase, Supabase Auth, Vercel, Railway.

Do not rewrite the application or introduce unnecessary infrastructure such as Kubernetes, Kafka, Temporal, or microservices.

---

# Part 0 — Request Board

## Problem

Recipients currently can only request equipment that is already listed. There is no way for a recipient to signal demand for equipment that donors haven't listed yet. This creates a discovery gap: donors don't know what recipients need, and recipients must passively wait.

The request board lets recipients post "wanted" requests visible to verified donors and admins. Donors can browse the board and respond by creating a new listing tied to the board post. This also provides the matching system with richer intent data.

## Existing State

- DB table `request_board_posts` exists with columns: id, institution_id, created_by_user_id, title, category, quantity_needed, location, needed_by, intended_use, description, status (open/match_in_progress/closed), timestamps
- Backend stub: `POST /recipient/request-board` returns 501, `GET /donor/request-board` returns empty array
- Pydantic schemas exist: `RequestBoardPost`, `RequestBoardPostCreate`, `BoardPostStatus`
- Frontend types exist: `RequestBoardPost` interface in `types.ts`
- `RecipientDashboardResponse` already includes `request_board_posts` field

## Required Features

1. Recipients create board posts (title, category, description, needed_by, quantity, location, intended_use)
2. Recipients see their board posts on their dashboard
3. Recipients can close their own board posts
4. Donors see a browsable request board
5. Donors can create a listing linked to a board post
6. Admins see board posts in their dashboard
7. Board post status transitions: open → match_in_progress → closed

---

# Part 1 — Intelligent Marketplace Matching

## Problem

Currently, admins manually compare multiple recipient requests when deciding who should receive a donated item. For desirable equipment, several institutions may submit similar requests with different wording. The system should automatically analyze the listing and recipient requests and recommend the most relevant candidates.

The algorithm assists the admin. It does **not** automatically choose the recipient.

Example:
```text
Listing: Thermo Scientific -80°C Freezer

Potential recipients:
1. Research lab requesting ultra-low-temperature storage
2. Teaching lab requesting freezer storage
3. Hospital lab requesting -80°C storage
4. Biology lab requesting cold storage
5. Research institution requesting cryogenic storage
```

## Feature 1 — Vector Embeddings

Add vector embeddings for equipment listings and recipient requests using pgvector + an embedding API.

Store embeddings alongside listing/request IDs. Avoid regenerating when text hasn't changed.

Use: PostgreSQL + pgvector + embedding API/model

## Feature 2 — Hybrid Search

Use both semantic search (vector similarity) and keyword search (exact terms like "ST8", "Thermo Scientific", "15 mL", "PCR", "HPLC", "-80°C").

## Feature 3 — Eligibility Filtering

Before ranking, remove invalid requests:
- Cancelled requests
- Unverified institutions
- Non-live listings
- Already-fulfilled equipment
- Clearly incompatible equipment category

## Feature 4 — Ranking Algorithm

Rank eligible requests using transparent scoring:
- 45% semantic similarity
- 25% equipment/specification compatibility
- 15% geographic compatibility
- 10% request waiting time
- 5% urgency

Returns 0-100 match score. Weights adjustable after testing.

## Feature 5 — Explainable Recommendations

Admins see why a recipient was recommended:
```text
Yale Biology Lab — Match Score: 94
✓ Exact equipment category match
✓ Strong semantic similarity
✓ Requires 15 mL tube compatibility
✓ Located nearby
✓ Request has been open for 31 days
```

Score is a ranking score, not a probability.

## Feature 6 — Admin Matching Interface

Show ranked recommendations in the existing admin request-selection workflow. Admins can still inspect full requests, ignore recommendations, choose any eligible recipient, reject requests, or cancel a match. Advisory only.

## Feature 7 — Matching Evaluation

Labeled evaluation dataset. Track Recall@3, Precision@3, Top-1 accuracy. Later track how often admin-selected recipient was in top 3.

---

# Part 2 — CI/CD + Testing

## Problem

LabLink contains several interconnected systems. A change to one part can unintentionally break another. Automated checks before deployment prevent unsafe production changes.

## Feature 8 — GitHub Actions CI Pipeline

Runs on PR open and push to main:
- Backend: Python tests, linting
- Frontend: TypeScript type checking, linting
- Integration tests: PostgreSQL/pgvector integration tests
- E2E tests: Playwright
- Failed tests block deployment

## Feature 9 — Real Database Integration Tests

Integration tests against real PostgreSQL + pgvector:
- Embedding storage and retrieval
- Vector similarity search
- Ranking candidate computation
- Match recommendation persistence
- Invalid/cancelled request exclusion

Production data never used for automated tests.

## Feature 10 — Playwright E2E Tests

Critical workflows:
1. Full matching flow: donor creates listing → admin approves → recipients submit requests → matching generates recommendations → admin selects recipient
2. Donor lifecycle: draft → complete → submit → admin approves
3. Recipient lifecycle: browse → request → admin reviews
4. Cancellation: request cancelled → no longer in recommendations
5. Listing removal: listing removed → requests cancelled → recommendations inactive

Focus on critical business workflows, not every button.

---

# Implementation Order

1. Request Board — foundation for matching (provides board post data)
2. Matching Foundation — pgvector, embeddings, hybrid search
3. Ranking — eligibility filters, scoring, explanations
4. Admin Interface — recommendations in existing workflow
5. Matching Evaluation — labeled dataset, metrics
6. Integration Tests — real PostgreSQL + pgvector
7. Playwright E2E — critical workflows
8. GitHub Actions — automated CI pipeline

---

# Out of Scope

Temporal, Kafka, Kubernetes, Redis, microservices, custom ML model training, automatic recipient allocation, distributed workers, large-scale performance optimization.

---

# Definition of Done

### Request Board
- Recipients can create, view, and close board posts
- Donors can browse the request board
- Donors can create listings linked to board posts
- Admins see board posts in their dashboard

### Matching
- Listings have embeddings; requests have embeddings
- pgvector semantic search works; keyword matching works
- Invalid recipients filtered; valid candidates get deterministic match scores
- Admins see ranked recommendations; remain responsible for final allocation
- Matching quality measurable via labeled test set

### Testing
- Integration tests run against real PostgreSQL + pgvector
- Playwright tests cover main marketplace workflow including matching
- Cancellation/removal edge cases tested

### CI/CD
- GitHub Actions runs tests/checks automatically
- PRs cannot safely merge/deploy when critical tests fail
- Passing code continues through existing deployment process
