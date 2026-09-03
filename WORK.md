# LabLink — Work Log

## Active Work
_Nothing in progress._

---

## Completed Work

### Session — 2026-09-03 (E2E Testing)

**E2E test infrastructure:** Created `e2e/` directory with Playwright config (Chromium, sequential, auto-starts dev servers), auth helper (`loginAs()` using real form selectors), and 3 test specs: donor listing lifecycle (4-step wizard fill, photo + PDF upload, admin approval), recipient request board post submission, and admin institution verification. Added test fixtures (minimal JPEG + two PDFs for upload tests). Updated `.gitignore` for Playwright artifacts and `Makefile` with `setup-e2e`, `test-backend`, `test-e2e` targets.
**Backlog change:** Removed Stripe platform donations (dropped from scope).

### Session — 2026-09-02 (Admin Polish + Data Integrity)

| Commit | Summary |
|---|---|
| `ea290b7` | feat: add client-side search and filter controls to admin dashboard queues |
| `255f030` | feat: add image upload validation — restrict to JPEG/PNG/WebP, max 10 MB |
| `cf5ab3f` | feat: add listing expiration with expires_at date field and cron sweep |
| `ad8ccd2` | feat: add duplicate institution detection and merge for admins |

**Frontend changes:** `admin-review-dashboard.tsx` — added `useState` filter state per queue (search text + dropdown selections), `useMemo` for derived filtered arrays, filter bar UI with search inputs and contextual dropdowns above each queue table. Sidebar counts update to reflect filtered results. Footer shows "X of Y" when filters narrow results. Empty states distinguish "no data" from "no filter matches." Added duplicate institutions section with merge confirmation modal. `globals.css` — added `.admin-filter-bar`, `.admin-filter-search`, `.admin-filter-select`, `.admin-duplicate-*`, `.admin-merge-*` styles. `donor-listing-form.tsx` — client-side file type and size validation before upload, tightened `accept` attribute, added optional expiration date picker. `types.ts` — added `expires_at` to Listing/ListingCreateInput/ListingDraftSaveInput, added `DuplicateInstitutionGroup`. `api.ts` — added `getDuplicateInstitutions()` and `mergeInstitutions()`.
**Backend changes:** `donor.py` — restricted image uploads to JPEG/PNG/WebP, added 10 MB size limit. `domain.py` — added `expires_at` to Listing/ListingDraftSave/ListingPayloadBase, added `ListingExpirationResponse`, `DuplicateInstitutionGroup`, `InstitutionMergeRequest`. `supabase_listings.py` — added `expire_stale_listings()` method. `internal.py` — added `POST /internal/jobs/listings/expire` cron endpoint. `supabase_profiles.py` — added `get_duplicate_institution_groups()` and `merge_institutions()`. `admin.py` — added `GET /admin/institutions/duplicates` and `POST /admin/institutions/merge`.
**Database:** Migration `0010_add_listing_expires_at.sql` — added optional `expires_at` timestamptz column to listings.

---

### Session — 2026-08-31 (Request Board Feature)
Spec: `docs/superpowers/specs/2026-08-31-lablink-upgrade-spec.md`
Plan: `docs/superpowers/plans/2026-08-31-request-board.md`

| Commit | Summary |
|---|---|
| `a123e5b` | docs: add request board plan and upgrade spec |
| `9689623` | feat: add request board CRUD service methods and tests |
| `0272a7a` | feat: wire up request board routes for recipient and donor |
| `b37332a` | feat: link listings to board posts with migration and route |
| `63c3fbc` | fix: add board_post_id to ListingDraftSaveInput TypeScript type |
| `ab9d5d3` | feat: add recipient request board UI with creation form |
| `839e909` | feat: add donor request board browse page with respond-with-listing flow |
| `2d7773d` | feat: add board post admin visibility and status transitions |
| `6a28c7b` | fix: add missing RBAC role check on recipient close board post route |

**Backend changes:** `supabase_listings.py` — added 6 service methods for board post CRUD (`create_board_post`, `get_board_posts_for_recipient/donor/admin`, `close_board_post`, `_to_board_post`), wired board posts into recipient dashboard, added `board_post_id` to `create_draft_listing` with status transition to `match_in_progress`. `domain.py` — updated `RequestBoardPost`, `RequestBoardPostCreate`, `Listing`, `ListingDraftSave`, `AdminDashboardResponse` schemas. Routes added for recipient (POST/GET/close), donor (GET, create-listing-from-post), admin (close).
**Frontend changes:** New `request-board-form.tsx` (recipient creation form), `request-board-browser.tsx` (donor browse page), `donor/request-board/page.tsx`. Updated recipient and donor dashboards with board post sections. Added admin board posts section with close functionality. Added nav links for donors.
**Database:** Migration `0003_board_post_listing_link.sql` — added `board_post_id` FK column to listings table.
**Tests:** `test_request_board.py` — 7 new tests for board post CRUD and listing linking (41 total passing).
**Docs:** Created upgrade spec covering request board, intelligent matching, and CI/CD plans. Created detailed implementation plan for request board (6 tasks). Also created plans for intelligent matching and CI/CD+testing (next phases).

---

### Session — 2026-08-28 (Homepage UI Tweaks)

| Commit | Summary |
|---|---|
| `1b43a94` | fix: enlarge mission image and hide Browse tab for unauthenticated users |

**Frontend changes:** `home-page-redesign.module.css` — mission section grid changed to equal columns (`1fr 1fr`) and image frame max-width cap removed so the photo fills available space. `site-header.tsx` — Browse nav link now only renders when the user is logged in.

---

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
- [x] **Request board** — Done. Recipients create/view/close board posts; donors browse and respond with linked listings; admins see all posts.
- [x] **Admin queue search/filter** — Done. Client-side text search and dropdown filters per admin queue section.
- [x] **Image upload validation** — Done. JPEG/PNG/WebP only, 10 MB max; validated client + server.
- [x] **Duplicate institution detection** — Done. Name similarity detection, admin merge UI with FK reassignment.
- [x] **Listing expiration** — Done. Optional expires_at date field + cron sweep endpoint.

### Lower Priority
- [ ] **Email unsubscribe** — Unsubscribe management for notification emails.
- [x] **E2E tests** — Done. 3 Playwright specs: donor listing lifecycle, recipient request board, admin institution verification.
- [ ] **Admin bulk operations** — Bulk approve/reject in verification and moderation queues.
