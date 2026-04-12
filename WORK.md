# LabLink — Work Log

## Active Work
_Nothing in progress._

---

## Completed Work

### Session — 2026-04-12 (Lifecycle Enforcement)
Spec: `docs/superpowers/specs/2026-04-12-listing-lifecycle-enforcement-design.md`
Plan: `docs/superpowers/plans/2026-04-12-listing-lifecycle-enforcement.md`

| Commit | Summary |
|---|---|
| `dae3d8a` | feat: cancel open requests when a listing is removed |
| `04776af` | fix: strengthen lifecycle tests and guard unnecessary cancel round-trip |
| `0e82c7a` | feat: return live listing to review when material fields are edited |
| `d781c8a` | fix: harden material-edit re-review logic and tests |
| `b3588cc` | feat: show re-review warning banner on edit page for live listings with requests |
| `186e1b6` | feat: add hover tooltip on edit button for live listings warning about re-review |
| `276637f` | fix: exclude terminal requests from admin removal notification loop |

**Backend changes:** `supabase_listings.py` — new `_cancel_open_requests_for_listing` helper, new `_changed_material_fields` module-level pure function, upgraded `save_donor_listing` with re-review logic, wired cancellation into both removal paths.
**Tests:** `test_listing_lifecycle.py` — 14 new tests covering all new behavior.

---

## Completed Work

### Session — 2026-04-12
- Created `CLAUDE.md` with project instructions, architecture patterns, coding rules, and dev commands.
- Created `PROGRESS.md` with full implementation status across all PRD feature areas.
- Created `WORK.md` to track work sessions.
- Performed full codebase exploration to establish baseline understanding of what is built vs. missing.

### Prior Development (from git history)
| Commit | Summary |
|---|---|
| `3f2fdd2` | Set up internal webhook for emailing (Supabase → FastAPI → Resend) |
| `cc19e4b` | Set up Supabase migration commands (Makefile targets) |
| `381ffc3` | Add animations |
| `ee39593` | Railway deployment setup |
| `1d6e4d7` | Update in-app and email messaging copy |

---

## Backlog (Prioritized)

### High Priority
- [ ] **Messaging UI** — Deferred. Communication happens via email (Resend). No in-app chat UI planned for now.
- [x] **Material-edit re-review** — Done. 11 material fields trigger re-review; recipients + admin notified.
- [x] **Requests closed on listing removal** — Done. Bulk-cancelled on donor and admin removal; reason-aware emails sent.

### Medium Priority
- [ ] **Request board** — Recipient UI for posting wanted-item requests; donor UI for browsing and responding with a new listing.
- [ ] **Admin queue search/filter** — Server-side filtering by date, institution, status, category in admin verification and moderation queues.
- [ ] **Image upload validation** — Server-side file type and size limits on listing photo uploads.
- [ ] **Duplicate institution detection** — Admin tooling to review and merge duplicate institution records.
- [ ] **Listing expiration** — Automated expiry of listings past their availability window.

### Lower Priority
- [ ] **Stripe platform donations** — Optional Stripe integration for donations to LabLink (not equipment payments).
- [ ] **Email unsubscribe** — Unsubscribe management for notification emails.
- [ ] **E2E tests** — Playwright tests for critical user flows (sign up, list equipment, submit request, admin approve).
- [ ] **Admin bulk operations** — Bulk approve/reject in verification and moderation queues.
