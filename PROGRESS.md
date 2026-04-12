# LabLink — Implementation Progress

Status key: ✅ Complete | 🔄 In Progress | ⬜ Not Started | 🚫 Out of Scope (v1)

---

## Authentication & Accounts
| Feature | Status | Notes |
|---|---|---|
| Sign up / sign in / password reset | ✅ | Supabase Auth, full UI flow |
| Role selection during onboarding | ✅ | donor_lab, recipient_institution |
| Institution creation during signup | ✅ | Institution record linked to user |
| Pending verification state on new accounts | ✅ | account_status enum enforced |
| Admin email allowlist auto-provisioning | ✅ | Admin created on first login |
| Admin approve / reject / suspend accounts | ✅ | Via admin dashboard |
| Duplicate institution detection + merging | ⬜ | Not implemented |

---

## Listings
| Feature | Status | Notes |
|---|---|---|
| Create draft listing | ✅ | Auto-saved multi-step form |
| Equipment detail fields (title, category, condition, qty, etc.) | ✅ | All PRD-required fields present |
| Photo upload to Supabase Storage | ✅ | |
| Compliance PDFs (decontamination + liability release) | ✅ | Modal editor, upload, stored in Supabase |
| Submit draft for admin review | ✅ | Requires PDFs to be completed |
| Edit listing before submission | ✅ | Draft can be edited |
| Listing lifecycle states | ✅ | draft → pending_admin_approval → live → matched_reserved → fulfilled → removed |
| Admin approve / reject / remove listings | ✅ | Via admin moderation queue |
| Public catalog browser with filters | ✅ | Search, category, condition, location |
| Listing detail page | ✅ | Photos, donor info, full specs |
| Material-edit re-review (live listing edited after requests exist) | ✅ | 11 material fields trigger re-review; recipients + admin notified |
| Listing expiration / auto-removal on timeout | ⬜ | Not automated |

---

## Requests
| Feature | Status | Notes |
|---|---|---|
| Submit equipment request (verified recipients only) | ✅ | All PRD-required fields |
| Multiple institutions can request same item | ✅ | Supported in schema |
| Cancel / withdraw request | ✅ | |
| Admin selects final recipient | ✅ | Via admin request management |
| Request lifecycle states | ✅ | submitted → admin_review → approved_matched → completed → rejected_cancelled |
| Request state visible to recipient | ✅ | Status pill in recipient dashboard |
| Requests closed when listing removed | ✅ | Bulk-cancelled on donor and admin removal; reason-aware email sent |

---

## Messaging
| Feature | Status | Notes |
|---|---|---|
| Message thread schema | ✅ | request_message_threads + request_messages tables |
| Chat UI for donor / recipient | ⬜ | No frontend built |
| Admin thread monitoring | ⬜ | No UI (data visible in admin dashboard response) |
| Admin lock / disable thread | ⬜ | |

---

## Dashboards
| Feature | Status | Notes |
|---|---|---|
| Donor dashboard (listings, requests, impact summary) | ✅ | |
| Recipient dashboard (requests, saved listings, threads) | ✅ | |
| Admin dashboard (verification queue, moderation, requests, audit) | ✅ | |
| Save / favorite listings | ✅ | |
| Admin search / filter within queues | ⬜ | Loads all items; no server-side filtering |

---

## Equipment Request Board
| Feature | Status | Notes |
|---|---|---|
| Schema + backend stub | ✅ | Returns empty array in v1 |
| Recipient post wanted-item requests | ⬜ | No UI |
| Board visible to verified donors | ⬜ | |
| Donor responds by creating listing tied to board post | ⬜ | |

---

## Notifications
| Feature | Status | Notes |
|---|---|---|
| In-app notification system | ✅ | Create, list, mark viewed |
| Email via Resend API | ✅ | |
| Outbox pattern (webhook + cron + retries) | ✅ | Exponential backoff up to 5 retries |
| Email templates per notification type | ✅ | |
| Email unsubscribe management | ⬜ | |

---

## Payments
| Feature | Status | Notes |
|---|---|---|
| Stripe for optional platform donations | ⬜ | Noted in PRD but not implemented |
| Buyer-to-seller payments | 🚫 | Explicitly out of scope for v1 |

---

## Infrastructure & Non-Functional
| Feature | Status | Notes |
|---|---|---|
| Role-based access control (RBAC) | ✅ | Enforced at route + RLS level |
| Audit trail for admin actions | ✅ | admin_audit_logs table |
| Image upload limits + validation | ⬜ | No server-side validation |
| Row-level security policies | ✅ | All core tables |
| E2E tests (Playwright) | ⬜ | Dependency added; no tests written |
| Unit/integration tests (backend) | ✅ | Notification email tests present |
| Mobile responsiveness | ⬜ | Not prioritized in v1 |
