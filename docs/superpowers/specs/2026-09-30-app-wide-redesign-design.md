# App-Wide Redesign — Homepage Design System

**Date:** 2026-09-30
**Status:** Draft for review
**Scope:** Full redesign (layouts + visuals) of every frontend route except the homepage body, using the design system established by the Claude Design homepage export (`docs/design/homepage-redesign/export.html`).

---

## 1. Intent

**What the user asked for (stated):**
- Analyze the homepage's design system and redesign the rest of the pages to share its aesthetic.
- Depth: **full redesign** — every page, dashboards included, gets new layouts, not just a reskin.
- Use the installed design skills (impeccable, web-design-guidelines, plus the already-available frontend-design and react-best-practices).
- Implementation starts only on the user's explicit command.

**Assumptions (correct these during review):**
- A1. The homepage body stays pixel-identical to the export for signed-out visitors. It is the reference, not a redesign target.
- A2. The homepage's floating pill nav becomes the **single app-wide nav**, made auth-aware (fixes the "logged-in users lose navigation on `/`" issue). Signed-out it renders exactly like the export.
- A3. Dashboards and admin use the same visual language but a calmer motion tier (no orbits, tilt, magnetic buttons).
- A4. No backend, API, data, or permission changes. Copy stays as-is except where a layout needs a new heading/eyebrow (new copy is listed explicitly in §6).
- A5. Mobile (≥ 360px) must work on every page, because the homepage system is responsive by construction. This upgrades "Mobile responsiveness ⬜" in PROGRESS.md as a side effect.

**Success criteria:**
1. A visitor moving from `/` to `/auth`, `/listings`, a listing, and a dashboard sees one continuous visual system (same palette, type, shapes, motion vocabulary).
2. Every E2E selector listed in §8.2 still resolves; existing flows behave identically.
3. `tsc --noEmit` and `next build` pass.
4. No route has horizontal scroll at 390px; all interactive targets ≥ 40px.
5. web-design-guidelines audit has no unresolved accessibility findings on redesigned files.

---

## 2. Design System (extracted from the homepage)

Source of truth: `frontend/components/home-page-redesign.module.css`. The tokens below are lifted verbatim.

### 2.1 Color tokens

| Token | Value | Role |
|---|---|---|
| `--ll-ink` | `#14302A` | headings, dark surfaces, primary-button text |
| `--ll-ink-deep` | `#0F2621` | footer, sidebar rail |
| `--ll-text` | `#1E3B30` | body text |
| `--ll-muted` | `#3D5148` | secondary text |
| `--ll-mint` | `#10C79A` | accent fill (buttons, rings, dots, highlights) |
| `--ll-mint-text` | `#0BA982` | accent text on light (eyebrows, italic emphasis) |
| `--ll-mint-hover` | `#5FE0BC` | primary hover |
| `--ll-canvas` | `#EEF4F1` | page background |
| `--ll-surface` | `#FFFFFF` | cards |
| `--ll-surface-hover` | `#DDEFE7` | card/row hover |
| `--ll-line` | `rgba(20,48,42,.08)` | hairline borders |
| `--ll-line-strong` | `rgba(20,48,42,.3)` | outline buttons, inputs |
| `--ll-glass` | `rgba(20,48,42,.55)` + `blur(12px)` | nav pill, overlays |

**Status colors (new — the homepage has none; derived to sit inside the palette):**

| Group | Statuses | Pill bg / text |
|---|---|---|
| Positive | live, verified, approved_matched, completed, fulfilled, active, open | `rgba(16,199,154,.14)` / `#0B7A5F` |
| Pending | draft, submitted, admin_review, pending_*, listing_under_review, match_in_progress | `rgba(214,163,40,.16)` / `#7A5A0B` |
| Reserved / neutral | matched_reserved, closed, locked, restricted | `rgba(20,48,42,.08)` / `#14302A` |
| Negative | rejected, rejected_cancelled, removed_by_admin, removed_by_donor, suspended | `rgba(196,64,52,.12)` / `#8C2A20` |

All text/background pairs must meet WCAG AA (4.5:1). Verified during implementation; adjust text shade only, never the canvas.

### 2.2 Typography

- **Display:** Playfair Display 500/600/700 + italic 500/600, loaded once in `app/layout.tsx` via `next/font` as `--font-playfair`. Replaces DM Serif Display everywhere.
- **Body:** DM Sans 400–700, moved from the `@import` in `globals.css` to `next/font` (`--font-dm-sans`).
- **Scale (app pages):**

| Role | Size | Weight / tracking |
|---|---|---|
| Page title (public: auth, catalog, detail) | `clamp(40px,5.2vw,76px)` | Playfair 600, `-.02em`, lh 1.05 |
| Page title (operate: dashboards, forms) | `clamp(32px,3.6vw,52px)` | Playfair 600, `-.02em` |
| Section title | `clamp(24px,2.4vw,34px)` | Playfair 600 |
| Card title | 22–26px | Playfair 600 |
| Stat number | `clamp(36px,4vw,56px)` (operate) | Playfair 700, tabular nums |
| Body | 16px / 1.65 (18px on public pages) | DM Sans 400 |
| Small / table | 14–15px | DM Sans 400–500 |
| Eyebrow / label | 11–12px | DM Sans 700, uppercase, `.12–.16em`, `--ll-mint-text` |

- **Signature move:** one italic mint phrase *or* one highlighted word per page title, never both.

### 2.3 Shape, depth, spacing

- Radii: `999px` pills (buttons, inputs' focus ring container, badges, nav), `24px` major cards/panels/modals, `16px` inner cards and table shells' inner rows, `12px` inputs, `10px` chips/captions.
- Shadows: flat at rest with hairline border; on hover `0 30px 60px -30px rgba(20,48,42,.45)`; modals `0 40px 80px -30px rgba(20,48,42,.45)`.
- Section rhythm: public pages use the homepage's `clamp(90px,11vw,160px)`; operate pages use `clamp(32px,4vw,56px)` between sections.
- Container: `max-width: 1240px; padding-inline: clamp(20px,5vw,72px)`.
- Grids: `repeat(auto-fit, minmax(...))` first; media queries only where auto-fit can't express it (sidebar collapse, nav menu).

### 2.4 Components (the shared kit)

Built once in `frontend/components/ui/` with one CSS module each:

| Component | Variants | Notes |
|---|---|---|
| `Button` / `ButtonLink` | `primary` (mint), `secondary` (outline), `ink` (dark), `danger`, `ghost`; sizes `md`/`lg`; optional arrow-circle | pill; replaces `.button-*` |
| `Eyebrow` | `plain`, `badge` (outlined pill + pulse dot) | |
| `Highlight` | — | the homepage's wipe-in mint bar, IntersectionObserver-driven |
| `Card` | tone `white` / `ink` / `mint`; `interactive` (hover lift) | |
| `StatTile` | tone `white` / `ink` / `mint` | Playfair number + label + sublabel |
| `Avatar` | `ink` (initials), `dashed` | |
| `StatusPill` | by status group (§2.1) | keeps `.status-pill` + `.status-{status}` classes as hooks |
| `Field`, `Input`, `Select`, `Textarea`, `Checkbox` | error state, hint, full-width span | 12px radius, hairline-strong border, mint focus ring |
| `Modal` | `default`, `wide` | glass backdrop, 24px card, focus trap, Esc closes |
| `PageHeader` | `public` / `operate` | eyebrow + title (+ highlight/italic) + lead + actions |
| `EmptyState` | `gate` (access/verification), `empty` (no data) | replaces `.empty-state` + `.auth-state-card` combos |
| `DataTable` | — | white 24px shell, hairline rows, hover `--ll-surface-hover`, clickable rows keep `.ops-table-row-clickable` |
| `Notice` | `success` / `error` / `warning` / `info` | fixes the missing `.auth-notice-warning` style |
| `Reveal` | — | wraps children; fade + rise on scroll; no-op under reduced motion |

### 2.5 Motion tiers

| Tier | Pages | Allowed |
|---|---|---|
| **Persuade** | auth, catalog, listing detail | Reveal-on-scroll, Highlight wipe, word-rise on title, decorative orbit rings (auth only), card hover lift |
| **Operate** | dashboards, admin, wizard, request board, password pages | Reveal on first paint of page header only, hover states, modal fade/scale (200ms) |

All motion respects `prefers-reduced-motion: reduce` (the existing global rule stays; new JS-driven motion checks `matchMedia` and renders final state). Tilt and magnetic buttons stay homepage-only.

---

## 3. Approaches considered

**A. Retheme in place** — change `:root` values and restyle existing `globals.css` rules page by page.
✗ `globals.css` is 5,646 lines with a 320-line `!important` override layer and ~90 dead `landing-*` rules; a full re-layout through it would compound the debt and make every change a specificity fight.

**B. New design-system layer, page-by-page migration (recommended).**
Add tokens + a small UI kit as CSS modules, rebuild each page's markup on the kit, and delete the legacy `globals.css` rules each page stops using. Legacy `:root` variables are remapped to the new values in step 1 so un-migrated pages shift palette immediately and nothing looks broken mid-migration.
✓ Matches the homepage's CSS-module pattern, keeps each task reviewable, shrinks `globals.css` instead of growing it.

**C. Adopt Tailwind/shadcn.**
✗ New dependency and paradigm for a codebase with zero Tailwind; the homepage system is already expressed as plain CSS.

**Chosen: B.**

---

## 4. Architecture

```
frontend/
  app/
    layout.tsx            ← next/font (Playfair + DM Sans), AppNav, AppFooter
    tokens.css            ← NEW: --ll-* tokens, base element styles, legacy var remap
    globals.css           ← shrinks each task; ends as resets + remaining legacy only
  components/
    ui/                   ← NEW kit (§2.4), one .tsx + .module.css per component
    chrome/               ← NEW: app-nav.tsx, app-footer.tsx (+ modules)
    dashboard/            ← NEW: dashboard-shell.tsx (replaces dashboard-sidebar-shell
                             + admin's inline copy), metric-row, section
    <existing page components, rewritten in place to keep import paths stable>
```

- **Server/client split unchanged:** pages stay async server components; only interactive widgets are `"use client"`.
- **Class hooks:** every class/ID in §8.2 is kept on the equivalent new element (as a second className where needed) so E2E keeps working.
- **Homepage:** `home-page-redesign.tsx` swaps its inline nav for `<AppNav variant="home" />` and stops loading Playfair itself (uses the layout variable). Signed-out render must stay pixel-identical — verified by the screenshot diff used in the port.

---

## 5. Global chrome

### 5.1 AppNav (replaces `SiteHeader` + `HeaderAuthActions`)
- Floating, fixed, glass pills exactly as the homepage: logo pill left, link pill right.
- **Signed out:** on `/` → Mission · Team · **Sign in** (export-identical). Elsewhere → Home · Donate (→ `/auth`) · **Sign in** (same items as today; Browse stays hidden when signed out).
- **Donor:** Browse · Donate · Request Board · Dashboard + bell + avatar menu.
- **Recipient:** Browse · Dashboard + bell + avatar menu.
- **Admin:** logo → `/admin`, no links, bell + avatar menu (current behavior).
- Active route: link gets `rgba(255,255,255,.1)` background.
- Avatar menu: replaces hover tooltip with a click/keyboard popover (name, role, institution, email, Dashboard, Log out). Fixes hover-only access.
- Notification bell + panel: restyled as an ink glass panel (24px radius), toasts as ink pills bottom-right; behavior unchanged.
- **Mobile (<760px):** link pill collapses to a menu button; opens a full-width glass sheet with the same items.
- Pages add `padding-top` for the fixed nav (`--ll-nav-offset: 96px`).

### 5.2 AppFooter
The homepage footer (`#0F2621`, logo, "A Yale nonprofit · New Haven, CT · Founded 2024", managed-marketplace note) on every page. Auth's duplicate footer with placeholder `#` links is removed.

---

## 6. Page designs

New copy is marked **[new copy]**; everything else reuses existing strings.

### 6.1 `/auth` and `/auth/sign-up` (Persuade)
- Split layout on `--ll-canvas`: **left** a 24px-radius ink panel (homepage stat-card language) with orbit rings + mint dot (from the CTA section), eyebrow badge, Playfair title with italic mint phrase — sign-in: "Welcome *back.*" **[new copy, replaces "Powering the next generation of discovery." / external stock photo]**; sign-up: "Join the *LabLink network.*" **[new copy]** — and the two feature rows restyled as mini flow cards (01 Supply / 02 Verify language).
- **Right** a white 24px card with the form using `Field` components; primary submit is a full-width mint pill (`auth-screen-primary-button` kept).
- Sign-up two-column field rows collapse to one column < 640px.
- Signed-in state on sign-up becomes an `EmptyState gate` card.

### 6.2 `/auth/forgot-password`, `/auth/update-password` (Operate)
- Centered single white card (max 520px) on canvas with orbit ring decoration behind, `PageHeader operate` inside the card, `Notice` for states, actions as pills.

### 6.3 `/listings` (Persuade)
- `PageHeader public`: eyebrow "Equipment catalog" **[new copy]**, title "Inventory *Catalog*" with Highlight on "Catalog", lead "Browsing N items" + search pill input on the right.
- Filters move from a tall left sidebar to a **sticky horizontal filter bar** under the header: condition pills, category multi-select popover, location select. (Mobile: horizontal scroll row.) The "Impact note" becomes a mint `Card` at the end of the grid.
- Listing cards: white 24px cards, 4:3 image with glass status caption (homepage field-photo caption style), Playfair title, condition chip, meta row, footer with request count and an arrow-circle "View" button. Hover lift.
- Grid `repeat(auto-fill, minmax(280px,1fr))`, Reveal stagger.

### 6.4 `/listings/[listingId]` (Persuade)
- Breadcrumb as small mint-text links.
- Hero: two columns like the homepage hero — left: image card (24px, 4:5, glass "Verified donor" chip, floating white badge with request count in the homepage "equipment moved" style); right: status pill + eyebrow category, Playfair title, donor row with ink avatar, description, action stack (Request / Requested / Cancel / Save as pills).
- "Technical overview" as a 3-up `StatTile`-style fact grid (white tiles, label eyebrow + value).
- "About this item", "Fulfillment details" (ink card), "Donor institution" (white card) in an auto-fit grid.

### 6.5 Dashboard shell (shared by `/donor`, `/recipient`, `/admin`) (Operate)
- **Rail:** ink (`--ll-ink-deep`) sidebar, 24px radius, inset 16px from the viewport edge, under the floating nav. Nav items: icon + title + count pill; active item mint text with a mint left bar; collapse toggle retained (same localStorage key `lablink-admin-sidebar-collapsed`).
- **Admin migrates onto this shared shell**, removing its duplicated inline sidebar markup.
- **Header:** `PageHeader operate` — eyebrow (role workspace), title with Highlight word ("Donor *Dashboard*"), actions on the right.
- **Metrics:** a row of `StatTile`s cycling white / ink / mint (homepage flow-card rotation), numbers count up once on load (Operate tier exception: counter only, no other motion).
- **Sections:** Playfair section title + optional action; content in `DataTable` or card grids.
- **Mobile:** rail becomes a horizontal pill tab bar under the header.

### 6.6 `/donor`
- Header action: "+ Donate equipment" primary pill (`donor-dashboard-cta` kept).
- Equipment Submissions: `DataTable` (thumb + title, status pill, condition chip, actions as small pills).
- Request Board link panel: mint `Card` with Playfair line + "Browse request board" ink pill.
- Incoming Requests: `DataTable` with clickable rows → `Modal wide` showing request cards (white inner cards, eyebrow program, Playfair intended use).
- Remove-listing confirm: `Modal` with danger pill.

### 6.7 `/recipient`
- Requested Items, Saved Listings: `DataTable`s.
- Request Board: section action "New request" toggles an inline white card containing `RequestBoardForm` rebuilt on `Field` components (fixes the unstyled `form-*` classes; `#board-*` IDs kept).

### 6.8 `/donor/list-equipment` and `/donor/listings/[id]/edit` (Operate)
- Header: draft-status pill (saving / saved / error with dot), Playfair title, "Back to dashboard" ghost link.
- Progress: four numbered step pills connected by the homepage's dashed mint connector (animated dash), active = mint, complete = ink with check.
- Each step: white 24px card with eyebrow "Step 0N" + Playfair step title + lead; fields on `Field` grid.
- Upload: dashed-border drop zone (homepage `+5` avatar dashed language) with preview card.
- Compliance PDFs: two cards with status pill and pill actions; PDF modal on `Modal wide`.
- Footer bar: sticky bottom action bar (white glass) with Back (secondary) / Continue (primary, `donor-form-primary-action` kept).
- Edit-page re-review warning uses `Notice warning`.

### 6.9 `/donor/request-board` (Operate)
- `PageHeader operate`: eyebrow "Donor workspace", title "Recipient *Request Board*".
- Board posts as an auto-fit grid of white cards: eyebrow category, Playfair title, status pill, description, meta row (location / quantity / needed by), "Respond with listing" primary pill. (Fixes the unstyled `board-post-*` classes.)

### 6.10 `/admin` (Operate)
- Shared dashboard shell (§6.5) with five sections. Each section: title + **filter bar** (search pill + select pills) + `DataTable`.
- Duplicate institutions: grouped cards, merge `Modal` with selectable option cards (mint border when selected).
- Review modals (institution, listing, recipient selection): `Modal wide` with image card, detail tiles, compliance document cards, and a status form on `Field` components. `select[name='status']` / `select[name='verificationStatus']` and "Update status" button text kept.

### 6.11 Gate / empty states (all role-gated pages)
- `EmptyState gate`: centered white card, ink avatar icon, eyebrow, Playfair title, lead, pill actions. Used for Access limited / Sign in required / Verification required / Not ready.

---

## 7. Out of scope

- Homepage body changes (beyond swapping in `AppNav`, which must render identically signed-out).
- Backend, API, schema, permissions, copy rewrites beyond §6's marked lines.
- Known data issues noticed during exploration — reported, not fixed: admin metric labels ("Total Donations" = `recent_actions.length`), admin request-board "Institution" column showing raw IDs, hardcoded `0` request-board count on donor dashboard, request-board page lacking a verification check.
- Deleting unused TSX (`ListingCard`, `ListingListRow`, `DashboardPanel`, unused `operations-dashboard-ui` exports, `app/admin/actions.ts`) — listed for a later cleanup.

**One prerequisite that is not design work:** `next build` currently fails because three client components (`request-board-browser.tsx`, `request-board-form.tsx`, `recipient-dashboard-workspace.tsx`) import server-only `lib/api.ts`. The plan fixes this first (a client-side API module using the browser Supabase session) so builds can verify the redesign. This also fixes those calls at runtime.

---

## 8. Verification

### 8.1 Per task
- `npx tsc --noEmit`, `npx next build`.
- Screenshots at 1440×900 and 390×844 of every touched route (Playwright via installed Chrome), reviewed against §6.
- Homepage regression: signed-out pixel diff vs. the export stays at zero differing pixels outside the dev badge.

### 8.2 E2E selector contract (must keep)
`#sign-in-email`, `#sign-in-password`, `button.auth-screen-primary-button`, all `#listing-*` field IDs, `#board-*` field IDs, `button.donor-form-primary-action`, `.donor-compliance-card`, `input[type="file"][accept*="pdf"]`, `.ops-table-row-clickable`, `select[name='status']`, `select[name='verificationStatus']`, button names matching `/update status/i`, `/submit request/i`, `/open pdf form|replace pdf/i`, link matching `/post.*request|request.*equipment/i`, and visible text matching `/pending/i`, `/submitted|success/i`.

### 8.3 Audits (end of each page group)
- `web-design-guidelines` on changed files → fix accessibility/interaction findings.
- `impeccable audit` on each page group (optional: its launcher downloads a native binary from GitHub releases on first run — requires user OK).
- Full Playwright E2E run if the backend and seeded test accounts are available; otherwise report as not run.

---

## 9. Risks

| Risk | Mitigation |
|---|---|
| Mid-migration pages look half-old | Step 1 remaps legacy `:root` vars to new tokens so everything shifts together |
| E2E breakage | §8.2 contract checked in every task's review |
| Dashboards can't be screenshotted without auth/backend | Use E2E test accounts with `make back`; if unavailable, verify with a static fixture route **not** shipped (dev-only, deleted at end) |
| Admin file (1,712 lines) is large to rework | Split into section components during its task (`admin/` subfolder) — targeted, because the redesign touches every section anyway |
| Contrast of new status colors | Measured during the kit task; text shades adjusted to ≥ 4.5:1 |
