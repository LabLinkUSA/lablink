# Listing Lifecycle Enforcement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce two listing lifecycle rules — requests are cancelled when a listing is removed, and a live listing with active requests returns to admin review when material fields are edited.

**Architecture:** All business logic lives in `SupabaseListingService` in `supabase_listings.py`. Feature 1 adds a private `_cancel_open_requests_for_listing` helper and wires it into both removal paths. Feature 2 adds a module-level `_changed_material_fields` pure function and upgrades `save_donor_listing` to detect changes and trigger re-review. Frontend adds a warning banner (server component) and an edit-button tooltip (client component).

**Tech Stack:** Python 3.11, FastAPI, Supabase REST API (httpx), Pydantic v2; Next.js 15 App Router, TypeScript, React 19.

---

## Existing Code Map (Read Before Touching Anything)

| File | Relevant section |
|---|---|
| `backend/app/services/supabase_listings.py:560` | `save_donor_listing` — the method to upgrade for feature 2 |
| `backend/app/services/supabase_listings.py:770` | `remove_donor_listing` — already notifies recipients, needs request cancel |
| `backend/app/services/supabase_listings.py:1170` | `update_listing_status` — admin removal path, needs request cancel |
| `backend/app/services/supabase_listings.py:2416` | `_with_active_request_counts` — shows how open request counts are computed |
| `backend/app/services/supabase_listings.py:2591` | `_get_requests_for_listing_ids` — returns open request objects for a listing |
| `backend/app/schemas/domain.py:41` | `RequestStatus` enum values |
| `backend/app/schemas/domain.py:207` | `ListingDraftSave` — payload shape and field names (note: `condition` in payload → `item_condition` in DB) |
| `frontend/components/donor-listing-actions.tsx:74` | The Edit `<Link>` to add a tooltip to |
| `frontend/app/donor/listings/[listingId]/edit/page.tsx:53` | Where `listing` is assembled — add warning banner here |

---

## Task 1: Cancel Open Requests on Listing Removal (Backend)

**Files:**
- Modify: `backend/app/services/supabase_listings.py`
- Create: `backend/tests/test_listing_lifecycle.py`

### Step 1.1: Write a failing test for request cancellation

Create `backend/tests/test_listing_lifecycle.py` with this content:

```python
import unittest
from datetime import datetime, timezone
from unittest.mock import MagicMock, call

from app.schemas.domain import ListingStatus, RequestStatus
from app.services.supabase_listings import SupabaseListingService


def make_service() -> SupabaseListingService:
    return SupabaseListingService(
        supabase_url="https://supabase.example",
        service_role_key="service-role",
        storage_bucket="listing-images",
        documents_bucket="listing-documents",
        frontend_origin="https://lablink.example",
    )


class CancelOpenRequestsTests(unittest.TestCase):
    def test_cancel_open_requests_patches_with_correct_filter(self) -> None:
        service = make_service()
        service._request = MagicMock(return_value=None)  # type: ignore[method-assign]

        service._cancel_open_requests_for_listing("listing_abc")

        service._request.assert_called_once()
        call_args = service._request.call_args
        assert call_args[0][0] == "PATCH"
        assert call_args[0][1] == "equipment_requests"
        params = call_args[1]["params"]
        assert params["listing_id"] == "eq.listing_abc"
        assert "submitted" in params["status"]
        assert "admin_review" in params["status"]
        assert "approved_matched" in params["status"]
        body = call_args[1]["json"]
        assert body["status"] == RequestStatus.REJECTED_CANCELLED.value

    def test_cancel_open_requests_does_not_cancel_completed_or_already_cancelled(self) -> None:
        service = make_service()
        service._request = MagicMock(return_value=None)  # type: ignore[method-assign]

        service._cancel_open_requests_for_listing("listing_abc")

        params = service._request.call_args[1]["params"]
        # The status filter is an `in.(...)` that only covers open statuses
        assert "completed" not in params["status"]
        assert "rejected_cancelled" not in params["status"]
```

### Step 1.2: Run the test to verify it fails

```bash
cd /Users/daniellee/Code/lablink/backend
python -m pytest tests/test_listing_lifecycle.py::CancelOpenRequestsTests -v
```

Expected: `FAIL` — `AttributeError: 'SupabaseListingService' object has no attribute '_cancel_open_requests_for_listing'`

### Step 1.3: Add `_cancel_open_requests_for_listing` to the service

In `backend/app/services/supabase_listings.py`, find the `_ensure_listing_mutable` method (around line 2284) and add this new private method directly before it:

```python
def _cancel_open_requests_for_listing(self, listing_id: str) -> None:
    """Set all open requests for a listing to rejected_cancelled via a single bulk PATCH."""
    open_statuses = ",".join([
        RequestStatus.SUBMITTED.value,
        RequestStatus.ADMIN_REVIEW.value,
        RequestStatus.APPROVED_MATCHED.value,
    ])
    self._request(
        "PATCH",
        "equipment_requests",
        params={
            "listing_id": f"eq.{listing_id}",
            "status": f"in.({open_statuses})",
        },
        json={
            "status": RequestStatus.REJECTED_CANCELLED.value,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
        headers={"Prefer": "return=minimal"},
    )
```

### Step 1.4: Run the test to verify it passes

```bash
cd /Users/daniellee/Code/lablink/backend
python -m pytest tests/test_listing_lifecycle.py::CancelOpenRequestsTests -v
```

Expected: `PASS` (both tests green)

### Step 1.5: Wire `_cancel_open_requests_for_listing` into `remove_donor_listing`

In `backend/app/services/supabase_listings.py`, find `remove_donor_listing` (line ~792). After the `self._request("PATCH", "listings", ...)` that sets status to `removed_by_donor` (and before the `self._notify_role(...)` call), add:

```python
self._cancel_open_requests_for_listing(listing_id)
```

Also update the recipient notification message (line ~827) to include that the request was closed. Change:

```python
message=f"A listing you requested, {existing['title']}, was removed from the marketplace by the donor.",
```

to:

```python
message=f"The donor has removed the listing '{existing['title']}'. Your request has been closed.",
```

### Step 1.6: Wire `_cancel_open_requests_for_listing` into `update_listing_status` (admin removal)

In `backend/app/services/supabase_listings.py`, find `update_listing_status` (line ~1276). After the `self._request("PATCH", "listings", ...)` block (around line 1225–1231, where status is written) and before the `if status_value == ListingStatus.REMOVED_BY_ADMIN:` notification block (line ~1276), add:

```python
if status_value == ListingStatus.REMOVED_BY_ADMIN:
    self._cancel_open_requests_for_listing(listing_id)
```

Also update the admin-removal recipient notification message (line ~1285) to:

```python
message=self._with_admin_note(
    f"This listing '{updated['title']}' has been removed by LabLink. Your request has been closed.",
    admin_note,
),
```

### Step 1.7: Add integration test for `remove_donor_listing` cancelling requests

Append to `backend/tests/test_listing_lifecycle.py`:

```python
class RemoveDonorListingCancelsRequestsTests(unittest.TestCase):
    def _make_actor(self) -> object:
        from app.schemas.domain import (
            AccountStatus, AuthenticatedUser, Institution, Role,
            User, VerificationStatus,
        )
        institution = Institution(
            id="inst_donor",
            name="Donor Lab",
            type=Role.DONOR_LAB,
            verification_status=VerificationStatus.VERIFIED,
            location="New York",
        )
        user = User(
            id="user_donor",
            full_name="Dana Donor",
            email="dana@example.com",
            role=Role.DONOR_LAB,
            account_status=AccountStatus.VERIFIED,
            institution_id="inst_donor",
        )
        return AuthenticatedUser(user=user, institution=institution)

    def test_remove_live_listing_cancels_open_requests(self) -> None:
        service = make_service()
        actor = self._make_actor()

        listing_row = {
            "id": "listing_abc",
            "title": "PCR Thermocycler",
            "status": "live",
            "donor_institution_id": "inst_donor",
            "created_by_user_id": "user_donor",
            "request_count": 2,
        }

        # _get_listing_row → listing, then _get_requests_for_listing_ids → requests,
        # then cancel PATCH, then listing status PATCH, then notify calls
        def fake_request(method, table, **kwargs):
            if method == "GET" and table == "listings":
                return [listing_row]
            if method == "GET" and table == "equipment_requests":
                return []  # simplify: empty affected_requests for notification loop
            if method == "GET" and table == "app_users":
                return []
            return None

        service._request = MagicMock(side_effect=fake_request)  # type: ignore[method-assign]

        service.remove_donor_listing(actor, "listing_abc")  # type: ignore[arg-type]

        # Verify a PATCH on equipment_requests with rejected_cancelled was issued
        cancel_calls = [
            c for c in service._request.call_args_list
            if c[0][0] == "PATCH" and c[0][1] == "equipment_requests"
        ]
        assert len(cancel_calls) == 1, "Expected exactly one bulk PATCH to cancel requests"
        body = cancel_calls[0][1]["json"]
        assert body["status"] == RequestStatus.REJECTED_CANCELLED.value
```

### Step 1.8: Run all lifecycle tests

```bash
cd /Users/daniellee/Code/lablink/backend
python -m pytest tests/test_listing_lifecycle.py -v
```

Expected: all tests pass.

### Step 1.9: Commit

```bash
cd /Users/daniellee/Code/lablink
git add backend/app/services/supabase_listings.py backend/tests/test_listing_lifecycle.py
git commit -m "feat: cancel open requests when a listing is removed

When a listing transitions to removed_by_donor or removed_by_admin, all
open requests (submitted, admin_review, approved_matched) are bulk-updated
to rejected_cancelled. Recipient notification messages updated to confirm
closure. New _cancel_open_requests_for_listing helper added with tests."
```

---

## Task 2: Material-Edit Re-Review (Backend)

**Files:**
- Modify: `backend/app/services/supabase_listings.py`
- Modify: `backend/tests/test_listing_lifecycle.py`

### Step 2.1: Write failing tests for `_changed_material_fields`

Append to `backend/tests/test_listing_lifecycle.py`:

```python
from app.services.supabase_listings import _changed_material_fields
from app.schemas.domain import ListingDraftSave


class ChangedMaterialFieldsTests(unittest.TestCase):
    def _base_existing(self) -> dict:
        return {
            "title": "PCR Thermocycler",
            "category": "lab_equipment",
            "item_condition": "good",
            "quantity": 1,
            "description": "A reliable thermocycler.",
            "working_status": "fully_functional",
            "delivery_mode": "pickup_only",
            "handling_requirements": "None",
            "special_handling_flags": "",
            "availability_window": "2026-05-01",
            "dimensions_weight": "30cm x 20cm, 5kg",
        }

    def _base_payload(self) -> ListingDraftSave:
        return ListingDraftSave(
            title="PCR Thermocycler",
            category="lab_equipment",
            condition="good",
            quantity=1,
            location="New York",
            availability_window="2026-05-01",
            description="A reliable thermocycler.",
            dimensions_weight="30cm x 20cm, 5kg",
            handling_requirements="None",
            working_status="fully_functional",
            documentation_included="",
            special_handling_flags="",
            delivery_mode="pickup_only",
            photo_urls=[],
        )

    def test_no_changes_returns_empty_set(self) -> None:
        result = _changed_material_fields(self._base_existing(), self._base_payload())
        assert result == set()

    def test_title_change_detected(self) -> None:
        payload = self._base_payload()
        payload = ListingDraftSave(**{**payload.model_dump(), "title": "Updated Title"})
        result = _changed_material_fields(self._base_existing(), payload)
        assert "title" in result

    def test_quantity_change_detected(self) -> None:
        payload = self._base_payload()
        payload = ListingDraftSave(**{**payload.model_dump(), "quantity": 3})
        result = _changed_material_fields(self._base_existing(), payload)
        assert "quantity" in result

    def test_condition_change_detected(self) -> None:
        # payload uses "condition", DB row uses "item_condition"
        payload = self._base_payload()
        payload = ListingDraftSave(**{**payload.model_dump(), "condition": "fair"})
        result = _changed_material_fields(self._base_existing(), payload)
        assert "condition" in result

    def test_non_material_field_not_detected(self) -> None:
        # location and documentation_included are NOT material fields
        payload = self._base_payload()
        payload = ListingDraftSave(**{**payload.model_dump(), "location": "Boston", "documentation_included": "Yes"})
        result = _changed_material_fields(self._base_existing(), payload)
        assert result == set()

    def test_whitespace_difference_is_not_a_change(self) -> None:
        existing = {**self._base_existing(), "title": "  PCR Thermocycler  "}
        payload = self._base_payload()  # title = "PCR Thermocycler" (no spaces)
        result = _changed_material_fields(existing, payload)
        assert "title" not in result
```

### Step 2.2: Run tests to verify they fail

```bash
cd /Users/daniellee/Code/lablink/backend
python -m pytest tests/test_listing_lifecycle.py::ChangedMaterialFieldsTests -v
```

Expected: `ImportError` or `AttributeError` — `_changed_material_fields` does not exist yet.

### Step 2.3: Add `_changed_material_fields` as a module-level function

In `backend/app/services/supabase_listings.py`, add this function after the `RESEND_API_URL` constant (around line 52, before the `SupabaseListingService` class definition):

```python
def _changed_material_fields(existing: dict[str, Any], payload: "ListingDraftSave") -> set[str]:
    """Return the set of material field names that differ between the DB row and the incoming payload."""

    def _s(v: Any) -> str:
        return str(v or "").strip()

    changed: set[str] = set()
    if _s(existing.get("title")) != _s(payload.title):
        changed.add("title")
    if _s(existing.get("category")) != _s(payload.category):
        changed.add("category")
    if _s(existing.get("item_condition")) != _s(payload.condition):
        changed.add("condition")
    if int(existing.get("quantity") or 1) != payload.quantity:
        changed.add("quantity")
    if _s(existing.get("description")) != _s(payload.description):
        changed.add("description")
    if _s(existing.get("working_status")) != _s(payload.working_status):
        changed.add("working_status")
    if _s(existing.get("delivery_mode")) != _s(payload.delivery_mode):
        changed.add("delivery_mode")
    if _s(existing.get("handling_requirements")) != _s(payload.handling_requirements):
        changed.add("handling_requirements")
    if _s(existing.get("special_handling_flags")) != _s(payload.special_handling_flags):
        changed.add("special_handling_flags")
    if _s(existing.get("availability_window")) != _s(payload.availability_window):
        changed.add("availability_window")
    if _s(existing.get("dimensions_weight")) != _s(payload.dimensions_weight):
        changed.add("dimensions_weight")
    return changed
```

### Step 2.4: Run tests to verify they pass

```bash
cd /Users/daniellee/Code/lablink/backend
python -m pytest tests/test_listing_lifecycle.py::ChangedMaterialFieldsTests -v
```

Expected: all 6 tests pass.

### Step 2.5: Write a failing test for the re-review trigger in `save_donor_listing`

Append to `backend/tests/test_listing_lifecycle.py`:

```python
class SaveDonorListingReReviewTests(unittest.TestCase):
    def _make_actor(self) -> object:
        from app.schemas.domain import (
            AccountStatus, AuthenticatedUser, Institution, Role,
            User, VerificationStatus,
        )
        institution = Institution(
            id="inst_donor",
            name="Donor Lab",
            type=Role.DONOR_LAB,
            verification_status=VerificationStatus.VERIFIED,
            location="New York",
        )
        user = User(
            id="user_donor",
            full_name="Dana Donor",
            email="dana@example.com",
            role=Role.DONOR_LAB,
            account_status=AccountStatus.VERIFIED,
            institution_id="inst_donor",
        )
        return AuthenticatedUser(user=user, institution=institution)

    def _live_listing_row(self) -> dict:
        return {
            "id": "listing_abc",
            "title": "PCR Thermocycler",
            "status": "live",
            "donor_institution_id": "inst_donor",
            "created_by_user_id": "user_donor",
            "category": "lab_equipment",
            "item_condition": "good",
            "quantity": 1,
            "location": "New York",
            "availability_window": "2026-05-01",
            "description": "A reliable thermocycler.",
            "dimensions_weight": "30cm x 20cm, 5kg",
            "handling_requirements": "None",
            "working_status": "fully_functional",
            "documentation_included": "",
            "special_handling_flags": "",
            "delivery_mode": "pickup_only",
            "request_count": 1,
            "created_at": "2026-01-01T00:00:00Z",
            "listing_photos": [],
        }

    def _payload_with_material_change(self) -> "ListingDraftSave":
        return ListingDraftSave(
            title="PCR Thermocycler Model II",  # changed
            category="lab_equipment",
            condition="good",
            quantity=1,
            location="New York",
            availability_window="2026-05-01",
            description="A reliable thermocycler.",
            dimensions_weight="30cm x 20cm, 5kg",
            handling_requirements="None",
            working_status="fully_functional",
            documentation_included="",
            special_handling_flags="",
            delivery_mode="pickup_only",
            photo_urls=[],
        )

    def _open_request_row(self) -> dict:
        return {
            "id": "req_1",
            "listing_id": "listing_abc",
            "recipient_institution_id": "inst_rec",
            "status": "submitted",
            "intended_use": "teaching",
            "department": "Biology",
            "audience": "undergraduate",
            "urgency": "medium",
            "delivery_constraints": "",
            "storage_confirmation": True,
            "funding_notes": "",
            "created_at": "2026-01-02T00:00:00Z",
            "updated_at": "2026-01-02T00:00:00Z",
            "listing": None,
            "recipient_institution": None,
        }

    def test_material_change_on_live_listing_with_requests_triggers_re_review(self) -> None:
        service = make_service()
        actor = self._make_actor()
        listing_row = self._live_listing_row()
        open_request = self._open_request_row()

        def fake_request(method, table, **kwargs):
            if method == "GET" and table == "listings":
                return [listing_row]
            if method == "GET" and table == "equipment_requests":
                return [open_request]
            if method == "GET" and table == "app_users":
                return []
            return None

        service._request = MagicMock(side_effect=fake_request)  # type: ignore[method-assign]

        service.save_donor_listing(actor, "listing_abc", self._payload_with_material_change())  # type: ignore[arg-type]

        # Find the listing PATCH call
        listing_patches = [
            c for c in service._request.call_args_list
            if c[0][0] == "PATCH" and c[0][1] == "listings"
            and c[1].get("json", {}).get("status") is not None
        ]
        assert listing_patches, "Expected a PATCH on listings with a status field"
        patched_status = listing_patches[0][1]["json"]["status"]
        assert patched_status == "pending_admin_approval", (
            f"Expected pending_admin_approval, got {patched_status}"
        )

    def test_material_change_on_live_listing_without_requests_does_not_trigger_re_review(self) -> None:
        service = make_service()
        actor = self._make_actor()
        listing_row = self._live_listing_row()

        def fake_request(method, table, **kwargs):
            if method == "GET" and table == "listings":
                return [listing_row]
            if method == "GET" and table == "equipment_requests":
                return []  # no open requests
            if method == "GET" and table == "app_users":
                return []
            return None

        service._request = MagicMock(side_effect=fake_request)  # type: ignore[method-assign]

        service.save_donor_listing(actor, "listing_abc", self._payload_with_material_change())  # type: ignore[arg-type]

        listing_patches = [
            c for c in service._request.call_args_list
            if c[0][0] == "PATCH" and c[0][1] == "listings"
            and c[1].get("json", {}).get("status") is not None
        ]
        if listing_patches:
            patched_status = listing_patches[0][1]["json"]["status"]
            assert patched_status == "live", f"Expected status to stay live, got {patched_status}"

    def test_non_material_change_on_live_listing_with_requests_does_not_trigger_re_review(self) -> None:
        service = make_service()
        actor = self._make_actor()
        listing_row = self._live_listing_row()
        open_request = self._open_request_row()

        # Only change location — a non-material field
        payload = ListingDraftSave(
            title="PCR Thermocycler",
            category="lab_equipment",
            condition="good",
            quantity=1,
            location="Boston",  # changed but NOT material
            availability_window="2026-05-01",
            description="A reliable thermocycler.",
            dimensions_weight="30cm x 20cm, 5kg",
            handling_requirements="None",
            working_status="fully_functional",
            documentation_included="",
            special_handling_flags="",
            delivery_mode="pickup_only",
            photo_urls=[],
        )

        def fake_request(method, table, **kwargs):
            if method == "GET" and table == "listings":
                return [listing_row]
            if method == "GET" and table == "equipment_requests":
                return [open_request]
            if method == "GET" and table == "app_users":
                return []
            return None

        service._request = MagicMock(side_effect=fake_request)  # type: ignore[method-assign]

        service.save_donor_listing(actor, "listing_abc", payload)  # type: ignore[arg-type]

        listing_patches = [
            c for c in service._request.call_args_list
            if c[0][0] == "PATCH" and c[0][1] == "listings"
            and c[1].get("json", {}).get("status") is not None
        ]
        if listing_patches:
            patched_status = listing_patches[0][1]["json"]["status"]
            assert patched_status == "live", f"Expected status to stay live, got {patched_status}"
```

### Step 2.6: Run the tests to verify they fail

```bash
cd /Users/daniellee/Code/lablink/backend
python -m pytest tests/test_listing_lifecycle.py::SaveDonorListingReReviewTests -v
```

Expected: tests fail because `save_donor_listing` does not yet check for material changes.

### Step 2.7: Modify `save_donor_listing` to detect material changes and trigger re-review

In `backend/app/services/supabase_listings.py`, replace the `save_donor_listing` method body (starting around line 560). The current method is:

```python
def save_donor_listing(self, actor: AuthenticatedUser, listing_id: str, payload: ListingDraftSave) -> Listing:
    existing = self._get_listing_row(listing_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Listing {listing_id} not found.")
    self._ensure_donor_controls_listing(actor, existing)
    self._ensure_listing_mutable(existing, action="edit")

    normalized_status = self._normalize_listing_status(existing["status"])
    next_status = ListingStatus.DRAFT.value if normalized_status == ListingStatus.DRAFT.value else existing["status"]

    self._request(
        "PATCH",
        "listings",
        params={"id": f"eq.{listing_id}"},
        json={
            ...
            "status": next_status,
            ...
        },
        headers={"Prefer": "return=minimal"},
    )
    ...
```

Replace the section from the `normalized_status` line through the `next_status` assignment (before the main PATCH call) with:

```python
    normalized_status = self._normalize_listing_status(existing["status"])

    # Determine if this edit triggers re-review:
    # live listing + material field changed + at least one open request
    triggers_re_review = False
    open_requests_for_re_review: list[EquipmentRequest] = []
    if normalized_status == ListingStatus.LIVE.value:
        if _changed_material_fields(existing, payload):
            open_requests_for_re_review = self._get_requests_for_listing_ids(
                [listing_id],
                exclude_statuses={RequestStatus.REJECTED_CANCELLED, RequestStatus.COMPLETED},
                latest_per_recipient=True,
            )
            if open_requests_for_re_review:
                triggers_re_review = True

    if triggers_re_review:
        next_status = ListingStatus.PENDING_ADMIN_APPROVAL.value
    elif normalized_status == ListingStatus.DRAFT.value:
        next_status = ListingStatus.DRAFT.value
    else:
        next_status = existing["status"]
```

The rest of the method (the PATCH body, photo sync, reload, and return) stays exactly as-is — only `next_status` changes.

After the `updated = self._get_listing_row(listing_id)` reload (the last block before `return self._to_listing(updated)`), add the notification block:

```python
        if triggers_re_review:
            notified_institutions: set[str] = set()
            for request in open_requests_for_re_review:
                if request.recipient_institution_id in notified_institutions:
                    continue
                notified_institutions.add(request.recipient_institution_id)
                self._notify_institution(
                    request.recipient_institution_id,
                    notification_type=NotificationType.LISTING_STATUS_CHANGED,
                    message=(
                        f"A listing you requested, '{updated['title']}', has been updated by the donor "
                        f"and is temporarily under review. You'll be notified when it's approved again."
                    ),
                    cta_href="/recipient",
                    entity_type="listing",
                    entity_id=listing_id,
                    metadata={
                        "email_template_key": "listing_under_review",
                        "entity_title": updated["title"],
                        "listing_id": listing_id,
                        "status": ListingStatus.PENDING_ADMIN_APPROVAL.value,
                        "request_id": request.id,
                    },
                    role_value="recipient_institution",
                    account_statuses={AccountStatus.VERIFIED.value},
                )
            self._notify_role(
                "admin",
                notification_type=NotificationType.ADMIN_LISTING_SUBMITTED,
                message=f"{actor.institution.name} edited a live listing back into review: {updated['title']}.",
                cta_href="/admin",
                entity_type="listing",
                entity_id=listing_id,
                metadata={
                    "email_template_key": "listing_submitted_for_review",
                    "entity_title": updated["title"],
                    "listing_id": listing_id,
                    "institution_id": actor.institution.id,
                    "status": ListingStatus.PENDING_ADMIN_APPROVAL.value,
                    "actor_institution_name": actor.institution.name,
                    "resubmitted": True,
                },
                account_statuses={AccountStatus.VERIFIED.value},
            )
```

### Step 2.8: Run tests to verify they pass

```bash
cd /Users/daniellee/Code/lablink/backend
python -m pytest tests/test_listing_lifecycle.py -v
```

Expected: all tests pass.

### Step 2.9: Commit

```bash
cd /Users/daniellee/Code/lablink
git add backend/app/services/supabase_listings.py backend/tests/test_listing_lifecycle.py
git commit -m "feat: return live listing to review when material fields are edited

When a donor edits a live listing that has active requests and changes
any material field (title, category, condition, quantity, description,
working_status, delivery_mode, handling_requirements, special_handling_flags,
availability_window, dimensions_weight), the listing is returned to
pending_admin_approval. Affected recipients and admins are notified.
Adds _changed_material_fields pure function and full test coverage."
```

---

## Task 3: Warning Banner on Edit Page (Frontend)

**Files:**
- Modify: `frontend/app/donor/listings/[listingId]/edit/page.tsx`

### Step 3.1: Add the warning banner in the edit page server component

In `frontend/app/donor/listings/[listingId]/edit/page.tsx`, find the final `return` block (line ~91):

```tsx
  return (
    <section className="page-section">
      <div className="shell donor-form-page">
        <DonorListingForm listing={listing} mode="edit" documentTemplates={documentTemplates.templates} />
      </div>
    </section>
  );
```

Replace it with:

```tsx
  const isLiveWithRequests = listing.status === "live" && listing.request_count > 0;

  return (
    <section className="page-section">
      <div className="shell donor-form-page">
        {isLiveWithRequests ? (
          <p className="auth-notice auth-notice-warning" style={{ marginBottom: "1.5rem" }}>
            This listing is live and has active requests. Editing key fields (title, condition, quantity, etc.) will return it to admin review until re-approved.
          </p>
        ) : null}
        <DonorListingForm listing={listing} mode="edit" documentTemplates={documentTemplates.templates} />
      </div>
    </section>
  );
```

### Step 3.2: Verify the TypeScript compiles

```bash
cd /Users/daniellee/Code/lablink/frontend
npx tsc --noEmit
```

Expected: no errors.

### Step 3.3: Commit

```bash
cd /Users/daniellee/Code/lablink
git add frontend/app/donor/listings/[listingId]/edit/page.tsx
git commit -m "feat: show re-review warning banner on edit page for live listings with requests"
```

---

## Task 4: Edit Button Hover Tooltip (Frontend)

**Files:**
- Modify: `frontend/components/donor-listing-actions.tsx`

### Step 4.1: Add a tooltip to the Edit `<Link>` for live listings

In `frontend/components/donor-listing-actions.tsx`, find the Edit `<Link>` (line ~74):

```tsx
      {canManageListing ? (
        <Link href={`/donor/listings/${listingId}/edit`} className="button button-secondary">
          {isRejectedListing ? "Edit / Resubmit" : "Edit"}
        </Link>
      ) : null}
```

Replace with:

```tsx
      {canManageListing ? (
        <Link
          href={`/donor/listings/${listingId}/edit`}
          className="button button-secondary"
          title={
            status === "live"
              ? "Editing key fields (title, condition, quantity, etc.) may return this listing to admin review."
              : undefined
          }
        >
          {isRejectedListing ? "Edit / Resubmit" : "Edit"}
        </Link>
      ) : null}
```

### Step 4.2: Verify the TypeScript compiles

```bash
cd /Users/daniellee/Code/lablink/frontend
npx tsc --noEmit
```

Expected: no errors.

### Step 4.3: Commit

```bash
cd /Users/daniellee/Code/lablink
git add frontend/components/donor-listing-actions.tsx
git commit -m "feat: add hover tooltip on edit button for live listings warning about re-review"
```

---

## Final Verification

Run all backend tests:

```bash
cd /Users/daniellee/Code/lablink/backend
python -m pytest tests/ -v
```

Expected: all tests pass including pre-existing notification tests.

Run frontend type check:

```bash
cd /Users/daniellee/Code/lablink/frontend
npx tsc --noEmit
```

Expected: no errors.
