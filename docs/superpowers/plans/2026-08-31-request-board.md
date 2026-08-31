# Request Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let recipients post wanted-item requests and let donors browse and respond by creating linked listings.

**Architecture:** The DB table `request_board_posts` already exists in `supabase/migrations/0001_init.sql`. Backend stubs exist but return 501/empty. We implement real CRUD operations in the existing `SupabaseListingService`, wire up routes, and build frontend UI within the existing dashboard and navigation patterns.

**Tech Stack:** FastAPI, Supabase REST (httpx), Next.js 15 App Router, React 19, TypeScript

## Global Constraints

- All backend logic in `SupabaseListingService`, not in route handlers
- Supabase REST via httpx — no Python SDK
- TypeScript in all frontend files, no `any`
- Pydantic models for all request/response schemas
- RBAC enforced on every endpoint
- Soft deletes via status enums — never hard-delete
- Env vars use `LABLINK_` prefix
- Follow existing patterns in the codebase (server components for pages, `"use client"` only for interactive widgets)
- Read Next.js docs at `frontend/node_modules/next/dist/docs/` before writing frontend code

---

### Task 1: Backend — Board Post CRUD Service Methods

**Files:**
- Modify: `backend/app/services/supabase_listings.py` (add methods near end of class)
- Modify: `backend/app/schemas/domain.py` (update `RequestBoardPostCreate` + add response schemas)
- Test: `backend/tests/test_request_board.py` (new)

**Interfaces:**
- Consumes: `AuthenticatedUser`, `RequestBoardPostCreate`, `BoardPostStatus`, `RequestBoardPost` from `domain.py`
- Produces:
  - `SupabaseListingService.create_board_post(actor: AuthenticatedUser, payload: RequestBoardPostCreate) -> RequestBoardPost`
  - `SupabaseListingService.get_board_posts_for_recipient(actor: AuthenticatedUser) -> list[RequestBoardPost]`
  - `SupabaseListingService.get_board_posts_for_donor(actor: AuthenticatedUser) -> list[RequestBoardPost]`
  - `SupabaseListingService.get_board_posts_for_admin() -> list[RequestBoardPost]`
  - `SupabaseListingService.close_board_post(actor: AuthenticatedUser, post_id: str) -> RequestBoardPost`

- [ ] **Step 1: Update Pydantic schemas**

The existing `RequestBoardPostCreate` is missing fields that exist in the DB table. Update it to match:

```python
# In backend/app/schemas/domain.py — replace existing RequestBoardPostCreate

class RequestBoardPostCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    category: str = Field(min_length=1, max_length=100)
    description: str = Field(min_length=1, max_length=2000)
    needed_by: date
    quantity_needed: int = Field(ge=1, default=1)
    location: str = Field(min_length=1, max_length=255)
    intended_use: str = Field(min_length=1, max_length=2000)
```

Also update the `RequestBoardPost` model to include the missing DB fields:

```python
# In backend/app/schemas/domain.py — replace existing RequestBoardPost

class RequestBoardPost(BaseModel):
    id: str
    title: str
    category: str
    institution_id: str
    created_by_user_id: str
    description: str
    quantity_needed: int = 1
    location: str = ""
    intended_use: str = ""
    needed_by: date
    status: BoardPostStatus
    created_at: datetime
```

- [ ] **Step 2: Write failing tests for create_board_post**

```python
# backend/tests/test_request_board.py
import unittest
from datetime import date, datetime, timezone
from unittest.mock import MagicMock

from app.schemas.domain import (
    AccountStatus,
    AuthenticatedUser,
    BoardPostStatus,
    Institution,
    RequestBoardPostCreate,
    Role,
    User,
    VerificationStatus,
)
from app.services.supabase_listings import SupabaseListingService


def make_service() -> SupabaseListingService:
    svc = SupabaseListingService.__new__(SupabaseListingService)
    svc._supabase_url = "http://test"
    svc._supabase_key = "test-key"
    svc._request = MagicMock()
    return svc


def make_recipient() -> AuthenticatedUser:
    return AuthenticatedUser(
        user=User(
            id="user_r1",
            full_name="Recipient User",
            email="recipient@test.com",
            role=Role.RECIPIENT_INSTITUTION,
            account_status=AccountStatus.VERIFIED,
            institution_id="inst_r1",
        ),
        institution=Institution(
            id="inst_r1",
            name="Test Institution",
            type=Role.RECIPIENT_INSTITUTION,
            verification_status=VerificationStatus.VERIFIED,
            location="Boston, MA",
            description="A test institution",
        ),
    )


def make_donor() -> AuthenticatedUser:
    return AuthenticatedUser(
        user=User(
            id="user_d1",
            full_name="Donor User",
            email="donor@test.com",
            role=Role.DONOR_LAB,
            account_status=AccountStatus.VERIFIED,
            institution_id="inst_d1",
        ),
        institution=Institution(
            id="inst_d1",
            name="Donor Lab",
            type=Role.DONOR_LAB,
            verification_status=VerificationStatus.VERIFIED,
            location="New Haven, CT",
            description="A donor lab",
        ),
    )


class TestCreateBoardPost(unittest.TestCase):
    def test_creates_board_post_and_returns_it(self):
        svc = make_service()
        actor = make_recipient()
        payload = RequestBoardPostCreate(
            title="Need a centrifuge",
            category="Centrifuge",
            description="We need a benchtop centrifuge for teaching.",
            needed_by=date(2026, 12, 1),
            quantity_needed=1,
            location="Boston, MA",
            intended_use="Teaching laboratory exercises",
        )

        created_row = {
            "id": "bp_001",
            "title": "Need a centrifuge",
            "category": "Centrifuge",
            "institution_id": "inst_r1",
            "created_by_user_id": "user_r1",
            "description": "We need a benchtop centrifuge for teaching.",
            "quantity_needed": 1,
            "location": "Boston, MA",
            "intended_use": "Teaching laboratory exercises",
            "needed_by": "2026-12-01",
            "status": "open",
            "created_at": "2026-08-31T00:00:00+00:00",
        }
        svc._request.return_value = [created_row]

        result = svc.create_board_post(actor, payload)

        self.assertEqual(result.id, "bp_001")
        self.assertEqual(result.title, "Need a centrifuge")
        self.assertEqual(result.status, BoardPostStatus.OPEN)

        call_args = svc._request.call_args
        self.assertEqual(call_args[0][0], "POST")
        self.assertEqual(call_args[0][1], "request_board_posts")

    def test_rejects_non_recipient(self):
        svc = make_service()
        actor = make_donor()
        payload = RequestBoardPostCreate(
            title="Test",
            category="Centrifuge",
            description="Test",
            needed_by=date(2026, 12, 1),
            quantity_needed=1,
            location="Boston, MA",
            intended_use="Test",
        )
        from fastapi import HTTPException
        with self.assertRaises(HTTPException) as ctx:
            svc.create_board_post(actor, payload)
        self.assertEqual(ctx.exception.status_code, 403)


class TestGetBoardPosts(unittest.TestCase):
    def test_get_for_recipient_filters_by_institution(self):
        svc = make_service()
        actor = make_recipient()
        svc._request.return_value = [
            {
                "id": "bp_001",
                "title": "Need centrifuge",
                "category": "Centrifuge",
                "institution_id": "inst_r1",
                "created_by_user_id": "user_r1",
                "description": "Test",
                "quantity_needed": 1,
                "location": "Boston",
                "intended_use": "Teaching",
                "needed_by": "2026-12-01",
                "status": "open",
                "created_at": "2026-08-31T00:00:00+00:00",
            }
        ]

        result = svc.get_board_posts_for_recipient(actor)

        self.assertEqual(len(result), 1)
        call_args = svc._request.call_args
        self.assertIn("inst_r1", str(call_args))

    def test_get_for_donor_returns_open_posts(self):
        svc = make_service()
        actor = make_donor()
        svc._request.return_value = []

        result = svc.get_board_posts_for_donor(actor)

        self.assertEqual(len(result), 0)
        call_args = svc._request.call_args
        self.assertIn("open", str(call_args))


class TestCloseBoardPost(unittest.TestCase):
    def test_close_own_post(self):
        svc = make_service()
        actor = make_recipient()

        existing_row = {
            "id": "bp_001",
            "title": "Need centrifuge",
            "category": "Centrifuge",
            "institution_id": "inst_r1",
            "created_by_user_id": "user_r1",
            "description": "Test",
            "quantity_needed": 1,
            "location": "Boston",
            "intended_use": "Teaching",
            "needed_by": "2026-12-01",
            "status": "open",
            "created_at": "2026-08-31T00:00:00+00:00",
        }
        updated_row = {**existing_row, "status": "closed"}
        svc._request.side_effect = [
            [existing_row],   # GET to fetch existing
            None,             # PATCH to update status
            [updated_row],    # GET to reload
        ]

        result = svc.close_board_post(actor, "bp_001")
        self.assertEqual(result.status, BoardPostStatus.CLOSED)

    def test_close_other_institution_post_rejected(self):
        svc = make_service()
        actor = make_recipient()

        existing_row = {
            "id": "bp_002",
            "institution_id": "inst_other",
            "status": "open",
        }
        svc._request.return_value = [existing_row]

        from fastapi import HTTPException
        with self.assertRaises(HTTPException) as ctx:
            svc.close_board_post(actor, "bp_002")
        self.assertEqual(ctx.exception.status_code, 403)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd backend && source .venv/bin/activate && python -m pytest tests/test_request_board.py -v`
Expected: FAIL — `create_board_post`, `get_board_posts_for_recipient`, etc. not defined

- [ ] **Step 4: Implement service methods**

Add to `SupabaseListingService` in `backend/app/services/supabase_listings.py`:

```python
def _to_board_post(self, row: dict[str, Any]) -> RequestBoardPost:
    return RequestBoardPost(
        id=row["id"],
        title=row["title"],
        category=row["category"],
        institution_id=row["institution_id"],
        created_by_user_id=row["created_by_user_id"],
        description=row["description"],
        quantity_needed=row.get("quantity_needed", 1),
        location=row.get("location", ""),
        intended_use=row.get("intended_use", ""),
        needed_by=row["needed_by"],
        status=BoardPostStatus(row["status"]),
        created_at=row["created_at"],
    )

def create_board_post(self, actor: AuthenticatedUser, payload: RequestBoardPostCreate) -> RequestBoardPost:
    if actor.user.role != Role.RECIPIENT_INSTITUTION:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Recipient access required.")
    if actor.institution.verification_status != VerificationStatus.VERIFIED:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Institution must be verified.")

    post_id = f"bp_{uuid4().hex[:12]}"
    row_data = {
        "id": post_id,
        "institution_id": actor.institution.id,
        "created_by_user_id": actor.user.id,
        "title": payload.title,
        "category": payload.category,
        "description": payload.description,
        "quantity_needed": payload.quantity_needed,
        "location": payload.location,
        "intended_use": payload.intended_use,
        "needed_by": payload.needed_by.isoformat(),
        "status": BoardPostStatus.OPEN.value,
    }
    rows = self._request(
        "POST",
        "request_board_posts",
        json=row_data,
        headers={"Prefer": "return=representation"},
    )
    return self._to_board_post(rows[0])

def get_board_posts_for_recipient(self, actor: AuthenticatedUser) -> list[RequestBoardPost]:
    rows = self._request(
        "GET",
        "request_board_posts",
        params={
            "institution_id": f"eq.{actor.institution.id}",
            "order": "created_at.desc",
        },
    )
    return [self._to_board_post(r) for r in rows]

def get_board_posts_for_donor(self, actor: AuthenticatedUser) -> list[RequestBoardPost]:
    rows = self._request(
        "GET",
        "request_board_posts",
        params={
            "status": f"eq.{BoardPostStatus.OPEN.value}",
            "order": "created_at.desc",
        },
    )
    return [self._to_board_post(r) for r in rows]

def get_board_posts_for_admin(self) -> list[RequestBoardPost]:
    rows = self._request(
        "GET",
        "request_board_posts",
        params={"order": "created_at.desc"},
    )
    return [self._to_board_post(r) for r in rows]

def close_board_post(self, actor: AuthenticatedUser, post_id: str) -> RequestBoardPost:
    rows = self._request(
        "GET",
        "request_board_posts",
        params={"id": f"eq.{post_id}"},
    )
    if not rows:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Board post not found.")
    existing = rows[0]

    is_owner = existing["institution_id"] == actor.institution.id
    is_admin = actor.user.role == Role.ADMIN
    if not is_owner and not is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to close this post.")
    if existing["status"] == BoardPostStatus.CLOSED.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Post is already closed.")

    self._request(
        "PATCH",
        "request_board_posts",
        params={"id": f"eq.{post_id}"},
        json={
            "status": BoardPostStatus.CLOSED.value,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
        headers={"Prefer": "return=minimal"},
    )
    updated = self._request(
        "GET",
        "request_board_posts",
        params={"id": f"eq.{post_id}"},
    )
    return self._to_board_post(updated[0])
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && source .venv/bin/activate && python -m pytest tests/test_request_board.py -v`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/schemas/domain.py backend/app/services/supabase_listings.py backend/tests/test_request_board.py
git commit -m "feat: add request board CRUD service methods and tests"
```

---

### Task 2: Backend — Board Post Routes

**Files:**
- Modify: `backend/app/api/routes/recipient.py` (replace stub)
- Modify: `backend/app/api/routes/donor.py` (replace stub)
- Modify: `backend/app/api/routes/admin.py` (add board posts to dashboard)

**Interfaces:**
- Consumes: `SupabaseListingService.create_board_post`, `get_board_posts_for_recipient`, `get_board_posts_for_donor`, `get_board_posts_for_admin`, `close_board_post`
- Produces:
  - `POST /recipient/request-board` → `RequestBoardPost` (201)
  - `GET /recipient/request-board` → `list[RequestBoardPost]`
  - `POST /recipient/request-board/{post_id}/close` → `RequestBoardPost`
  - `GET /donor/request-board` → `list[RequestBoardPost]` (replace empty array stub)

- [ ] **Step 1: Update recipient routes**

Replace the existing stub `create_request_board_post` in `backend/app/api/routes/recipient.py` and add the GET and close endpoints:

```python
@router.post("/request-board", response_model=RequestBoardPost, status_code=status.HTTP_201_CREATED)
def create_request_board_post(
    payload: RequestBoardPostCreate,
    actor: AuthenticatedUser = Depends(require_actor),
) -> RequestBoardPost:
    if actor.user.role != Role.RECIPIENT_INSTITUTION:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Recipient access required.")
    return get_supabase_listing_service().create_board_post(actor, payload)


@router.get("/request-board", response_model=list[RequestBoardPost])
def get_recipient_board_posts(
    actor: AuthenticatedUser = Depends(require_actor),
) -> list[RequestBoardPost]:
    if actor.user.role != Role.RECIPIENT_INSTITUTION:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Recipient access required.")
    return get_supabase_listing_service().get_board_posts_for_recipient(actor)


@router.post("/request-board/{post_id}/close", response_model=RequestBoardPost)
def close_board_post(
    post_id: str,
    actor: AuthenticatedUser = Depends(require_actor),
) -> RequestBoardPost:
    return get_supabase_listing_service().close_board_post(actor, post_id)
```

- [ ] **Step 2: Update donor route**

Replace the empty array stub in `backend/app/api/routes/donor.py`:

```python
@router.get("/request-board", response_model=list[RequestBoardPost])
def get_donor_request_board(actor: AuthenticatedUser = Depends(require_actor)) -> list[RequestBoardPost]:
    if actor.user.role != Role.DONOR_LAB:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Donor access required.")
    return get_supabase_listing_service().get_board_posts_for_donor(actor)
```

- [ ] **Step 3: Wire board posts into recipient dashboard response**

In `SupabaseListingService.get_recipient_dashboard`, replace the hardcoded `request_board_posts=[]` with a real call:

```python
# Replace: request_board_posts=[]
# With:
request_board_posts=self.get_board_posts_for_recipient(actor)
```

- [ ] **Step 4: Run all backend tests**

Run: `cd backend && source .venv/bin/activate && python -m pytest tests/ -v`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/routes/recipient.py backend/app/api/routes/donor.py backend/app/services/supabase_listings.py
git commit -m "feat: wire up request board routes for recipient and donor"
```

---

### Task 3: Backend — Link Listings to Board Posts

**Files:**
- Create: `supabase/migrations/0003_board_post_listing_link.sql`
- Modify: `backend/app/schemas/domain.py` (add `board_post_id` to listing schemas)
- Modify: `backend/app/services/supabase_listings.py` (accept board_post_id on draft creation)
- Modify: `backend/tests/test_request_board.py` (add linking test)

**Interfaces:**
- Consumes: `create_draft_listing` existing method
- Produces:
  - `listings.board_post_id` column (nullable FK to `request_board_posts.id`)
  - `Listing.board_post_id: Optional[str]` field
  - `create_draft_listing` accepts optional `board_post_id` parameter

- [ ] **Step 1: Create migration**

```sql
-- supabase/migrations/0003_board_post_listing_link.sql
alter table public.listings
  add column if not exists board_post_id text references public.request_board_posts(id) on delete set null;

create index if not exists listings_board_post_id_idx on public.listings(board_post_id);
```

- [ ] **Step 2: Update Pydantic schemas**

Add `board_post_id: Optional[str] = None` to:
- `Listing` model
- `ListingDraftSave` model

- [ ] **Step 3: Update TypeScript types**

Add `board_post_id?: string | null` to the `Listing` interface in `frontend/lib/types.ts`.

- [ ] **Step 4: Write failing test**

```python
# Add to backend/tests/test_request_board.py

class TestBoardPostListingLink(unittest.TestCase):
    def test_create_draft_with_board_post_id(self):
        svc = make_service()
        actor = make_donor()

        created_listing = {
            "id": "lst_001",
            "title": "",
            "category": "",
            "item_condition": "",
            "quantity": 1,
            "location": "",
            "availability_window": "",
            "description": "",
            "dimensions_weight": "",
            "handling_requirements": "",
            "working_status": "",
            "documentation_included": "",
            "special_handling_flags": "",
            "delivery_mode": "pickup_only",
            "status": "draft",
            "donor_institution_id": "inst_d1",
            "created_by_user_id": "user_d1",
            "created_at": "2026-08-31T00:00:00+00:00",
            "board_post_id": "bp_001",
        }
        svc._request.return_value = [created_listing]

        result = svc.create_draft_listing(actor, board_post_id="bp_001")
        self.assertEqual(result.board_post_id, "bp_001")

        call_args = svc._request.call_args
        json_body = call_args[1].get("json") or call_args.kwargs.get("json")
        self.assertEqual(json_body["board_post_id"], "bp_001")
```

- [ ] **Step 5: Run test to verify it fails**

Run: `cd backend && source .venv/bin/activate && python -m pytest tests/test_request_board.py::TestBoardPostListingLink -v`
Expected: FAIL

- [ ] **Step 6: Update create_draft_listing to accept board_post_id**

Find `create_draft_listing` in `supabase_listings.py` and add the optional parameter:

```python
def create_draft_listing(self, actor: AuthenticatedUser, *, board_post_id: str | None = None) -> Listing:
    # ... existing logic ...
    row_data = {
        # ... existing fields ...
    }
    if board_post_id:
        row_data["board_post_id"] = board_post_id
    # ... rest of method ...
```

Also update `_to_listing` to include `board_post_id`:

```python
# In the _to_listing method, add:
board_post_id=row.get("board_post_id"),
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd backend && source .venv/bin/activate && python -m pytest tests/test_request_board.py -v`
Expected: All PASS

- [ ] **Step 8: Add donor route for creating listing from board post**

Add to `backend/app/api/routes/donor.py`:

```python
@router.post("/request-board/{post_id}/create-listing", response_model=Listing, status_code=status.HTTP_201_CREATED)
def create_listing_from_board_post(
    post_id: str,
    actor: AuthenticatedUser = Depends(require_actor),
) -> Listing:
    require_verified_donor(actor)
    return get_supabase_listing_service().create_draft_listing(actor, board_post_id=post_id)
```

- [ ] **Step 9: Run all tests**

Run: `cd backend && source .venv/bin/activate && python -m pytest tests/ -v`
Expected: All PASS

- [ ] **Step 10: Commit**

```bash
git add supabase/migrations/0003_board_post_listing_link.sql backend/app/schemas/domain.py backend/app/services/supabase_listings.py backend/app/api/routes/donor.py backend/tests/test_request_board.py frontend/lib/types.ts
git commit -m "feat: link listings to board posts with migration and route"
```

---

### Task 4: Frontend — Recipient Board Post Creation Form

**Files:**
- Create: `frontend/components/request-board-form.tsx` (client component)
- Modify: `frontend/components/recipient-dashboard-workspace.tsx` (add board posts tab and form trigger)
- Modify: `frontend/lib/api.ts` (add API functions)
- Modify: `frontend/lib/types.ts` (add `RequestBoardPostCreate` type)

**Interfaces:**
- Consumes: `POST /recipient/request-board` API, `RequestBoardPost` type
- Produces: `<RequestBoardForm onSuccess={() => void />` component, `createRequestBoardPost(payload)` API function

- [ ] **Step 1: Add TypeScript types and API functions**

Add to `frontend/lib/types.ts`:

```typescript
export interface RequestBoardPostCreate {
  title: string;
  category: string;
  description: string;
  needed_by: string;
  quantity_needed: number;
  location: string;
  intended_use: string;
}
```

Add to `frontend/lib/api.ts`:

```typescript
export async function createRequestBoardPost(
  payload: RequestBoardPostCreate
): Promise<RequestBoardPost | null> {
  return fetchAuthedJson<RequestBoardPost>("/recipient/request-board", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function getRecipientBoardPosts(): Promise<RequestBoardPost[] | null> {
  return fetchAuthedJson<RequestBoardPost[]>("/recipient/request-board");
}

export async function closeBoardPost(postId: string): Promise<RequestBoardPost | null> {
  return fetchAuthedJson<RequestBoardPost>(`/recipient/request-board/${postId}/close`, {
    method: "POST",
  });
}
```

- [ ] **Step 2: Create board post form component**

Create `frontend/components/request-board-form.tsx` — a `"use client"` form with fields: title, category (select with existing categories), description (textarea), needed_by (date input), quantity_needed (number), location, intended_use (textarea). On submit, calls `createRequestBoardPost`. Shows validation errors. Calls `onSuccess` callback on success.

Follow the pattern of `donor-listing-form.tsx` for form structure and error handling.

- [ ] **Step 3: Add board posts section to recipient dashboard**

In `recipient-dashboard-workspace.tsx`, add a "Request Board" section that:
- Shows the recipient's existing board posts from `request_board_posts` in the dashboard response
- Each post shows title, category, needed_by, status pill
- A "Close" button on open posts (calls `closeBoardPost`)
- A "New Request" button that opens the `RequestBoardForm`

- [ ] **Step 4: Run TypeScript check**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add frontend/components/request-board-form.tsx frontend/components/recipient-dashboard-workspace.tsx frontend/lib/api.ts frontend/lib/types.ts
git commit -m "feat: add recipient request board UI with creation form"
```

---

### Task 5: Frontend — Donor Request Board Browse Page

**Files:**
- Create: `frontend/app/donor/request-board/page.tsx` (server component)
- Create: `frontend/components/request-board-browser.tsx` (client component)
- Modify: `frontend/lib/api.ts` (update `getDonorRequestBoard` if needed)
- Modify: `frontend/components/donor-dashboard-workspace.tsx` (add link to request board)
- Modify: `frontend/components/site-header.tsx` (add Request Board nav link for donors)

**Interfaces:**
- Consumes: `GET /donor/request-board` API, `RequestBoardPost` type
- Produces: `/donor/request-board` page, `<RequestBoardBrowser />` component

- [ ] **Step 1: Create request board browser component**

Create `frontend/components/request-board-browser.tsx` — a `"use client"` component that:
- Fetches board posts via `getDonorRequestBoard()`
- Displays posts as cards showing: title, category, institution name (if available), needed_by, description snippet, location
- Each card has a "Respond with Listing" button
- "Respond with Listing" calls `POST /donor/request-board/{postId}/create-listing` then navigates to the listing edit page

Add the API function for creating a listing from a board post to `frontend/lib/api.ts`:

```typescript
export async function createListingFromBoardPost(postId: string): Promise<Listing | null> {
  return fetchAuthedJson<Listing>(`/donor/request-board/${postId}/create-listing`, {
    method: "POST",
  });
}
```

- [ ] **Step 2: Create the page**

Create `frontend/app/donor/request-board/page.tsx` as a server component that renders the `<RequestBoardBrowser />` client component within the donor layout.

- [ ] **Step 3: Add navigation**

Add "Request Board" link to `site-header.tsx` for logged-in donors, and add a "Browse Request Board" card/link to the donor dashboard.

- [ ] **Step 4: Run TypeScript check**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add frontend/app/donor/request-board/ frontend/components/request-board-browser.tsx frontend/components/donor-dashboard-workspace.tsx frontend/components/site-header.tsx frontend/lib/api.ts
git commit -m "feat: add donor request board browse page with respond-with-listing flow"
```

---

### Task 6: Admin Board Post Visibility + Board Post Status Transitions

**Files:**
- Modify: `backend/app/services/supabase_listings.py` (wire board posts into admin dashboard, add status transition on listing link)
- Modify: `backend/app/api/routes/admin.py` (add admin close route)
- Modify: `frontend/components/operations-dashboard-ui.tsx` (show board posts in admin panel)
- Modify: `backend/app/schemas/domain.py` (add board posts to `AdminDashboardResponse`)

**Interfaces:**
- Consumes: `get_board_posts_for_admin()`, `close_board_post()`
- Produces: Board posts visible in admin dashboard, board post transitions to `match_in_progress` when a listing is linked

- [ ] **Step 1: Add board posts to admin dashboard response**

Add `board_posts: List[RequestBoardPost] = Field(default_factory=list)` to `AdminDashboardResponse` in `domain.py`.

Wire it in `get_admin_dashboard` method in `supabase_listings.py`:

```python
board_posts=self.get_board_posts_for_admin()
```

- [ ] **Step 2: Add board post status transition on listing link**

In `create_draft_listing`, when `board_post_id` is provided, update the board post status to `match_in_progress`:

```python
if board_post_id:
    row_data["board_post_id"] = board_post_id
    self._request(
        "PATCH",
        "request_board_posts",
        params={"id": f"eq.{board_post_id}"},
        json={
            "status": BoardPostStatus.MATCH_IN_PROGRESS.value,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
        headers={"Prefer": "return=minimal"},
    )
```

- [ ] **Step 3: Add admin close route**

Add to `admin.py`:

```python
@router.post("/board-posts/{post_id}/close", response_model=RequestBoardPost)
def admin_close_board_post(
    post_id: str,
    actor: AuthenticatedUser = Depends(require_actor),
) -> RequestBoardPost:
    if actor.user.role != Role.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")
    return get_supabase_listing_service().close_board_post(actor, post_id)
```

- [ ] **Step 4: Add board posts section to admin dashboard UI**

In `operations-dashboard-ui.tsx`, add a "Request Board" section showing all board posts with status pills and a close button for admins. Add the corresponding TypeScript type update for `AdminDashboardResponse` in `types.ts`.

- [ ] **Step 5: Run all tests and TypeScript check**

Run: `cd backend && source .venv/bin/activate && python -m pytest tests/ -v`
Run: `cd frontend && npx tsc --noEmit`
Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/schemas/domain.py backend/app/services/supabase_listings.py backend/app/api/routes/admin.py frontend/components/operations-dashboard-ui.tsx frontend/lib/types.ts
git commit -m "feat: add board post admin visibility and status transitions"
```
