# Listing Lifecycle Enforcement — Design Spec
_2026-04-12_

## Summary
Two lifecycle enforcement gaps in the LabLink marketplace:

1. **Material-edit re-review** — When a donor edits key fields on a `live` listing that has active requests, the listing returns to `pending_admin_approval` and affected recipients are notified.
2. **Requests closed on listing removal** — When a listing is removed (by admin or donor), all open requests are automatically closed and each recipient receives a reason-aware email.

---

## Feature 1: Material-Edit Re-Review

### Trigger Conditions
All three must be true:
- Listing status is `live`
- The edit payload contains at least one field from `MATERIAL_FIELDS`
- At least one request exists with status `submitted`, `admin_review`, or `approved_matched`

### Material Fields
```
title, category, item_condition, quantity, description, working_status,
delivery_mode, handling_requirements, special_handling_flags,
availability_window, dimensions_weight
```

### Backend

**New endpoint:** `PUT /donor/listings/{listing_id}`
- Auth: verified donor, must own the listing
- Accepts a partial update payload (all fields optional)
- Delegates to service layer

**Service logic in `SupabaseListingService.update_donor_listing()`:**
1. Fetch current listing; assert donor ownership and that status is `draft`, `pending_admin_approval`, or `live`
2. Diff incoming payload against `MATERIAL_FIELDS`
3. If listing is `live` AND material fields changed AND active requests exist:
   - Set listing status → `pending_admin_approval`
   - Insert one notification per affected recipient:
     - Type: `generic_notification`
     - Metadata: `{ "email_template_key": "listing_returned_to_review" }`
     - Body: "A listing you requested has been updated and is under review. We'll let you know when it's approved."
4. Save all changed fields regardless of whether re-review was triggered
5. Return updated listing

### Frontend

**Edit button tooltip (donor dashboard):**
- Applies only when listing status is `live`
- Tooltip text: *"Editing key fields (title, condition, quantity, etc.) may return this listing to admin review."*
- Rendered on the edit button/link in `donor-dashboard-workspace.tsx`

**Edit page warning banner (`frontend/app/donor/listings/[listingId]/edit/page.tsx`):**
- Rendered when listing status is `live` and it has at least one active request
- Dismissible
- Text: *"This listing is live and has active requests. Editing key fields will return it to admin review until re-approved."*

**API call (`frontend/lib/api.ts`):**
- Add `updateDonorListing(listingId, payload)` function calling `PUT /donor/listings/{listing_id}`

---

## Feature 2: Requests Closed on Listing Removal

### Trigger Conditions
A listing transitions to `removed_by_admin` or `removed_by_donor`.

### Affected Requests
Requests with status `submitted`, `admin_review`, or `approved_matched` for the removed listing.

### Backend

**Changes to `SupabaseListingService.update_listing_status()`:**
After persisting the new listing status, if the new status is `removed_by_admin` or `removed_by_donor`:
1. Query all open requests for the listing
2. Batch-update their status → `rejected_cancelled`
3. For each affected request, insert a notification to the recipient user:
   - Type: `generic_notification`
   - Metadata carries `removed_by: "admin"` or `removed_by: "donor"` and `email_template_key: "request_closed_listing_removed"`
   - Email copy:
     - Donor removal: *"The donor has removed this listing. Your request has been closed."*
     - Admin removal: *"This listing has been removed by LabLink. Your request has been closed."*

The existing outbox pattern (Supabase webhook → Resend) handles email delivery with no new plumbing.

**Also applies to donor self-removal:**
The donor remove action must go through `update_listing_status()` with `removed_by_donor` — verify this path exists or add it.

### No Frontend Changes
Removal UI already exists. The cascade happens server-side on status write.

---

## Notification Email Templates

Two new `email_template_key` values to add to `notification_email.py`:

| Key | Subject | Body |
|---|---|---|
| `listing_returned_to_review` | "Your requested listing is under review" | "A listing you requested has been updated and is temporarily under review. We'll notify you when it's approved again." |
| `request_closed_listing_removed` | "Your request has been closed" | Varies by `removed_by` metadata — see above |

---

## What Does Not Change
- No new database tables or columns needed
- No changes to the listing or request status enums
- No changes to the admin removal flow UI
- Volunteer transport, payments, and messaging remain out of scope
