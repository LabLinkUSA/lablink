# LabLink Design System

Every frontend route is built on the homepage's design system. Use `frontend/components/ui` for all new UI; do not add new global CSS. Source spec: `docs/superpowers/specs/2026-09-30-app-wide-redesign-design.md`.

## Tokens, type, shape, components, motion

Source of truth: `frontend/app/tokens.css` (tokens originate from the homepage, `frontend/components/home-page-redesign.module.css`).

### Color tokens

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

**Status colors (implemented in `frontend/components/ui/status-pill.module.css`) (new — the homepage has none; derived to sit inside the palette):**

| Group | Statuses | Pill bg / text |
|---|---|---|
| Positive | live, verified, approved_matched, completed, fulfilled, active, open | `rgba(16,199,154,.14)` / `#0B6E55` |
| Pending | draft, submitted, admin_review, pending_*, listing_under_review, match_in_progress | `rgba(214,163,40,.16)` / `#6B4F0A` |
| Reserved / neutral | matched_reserved, closed, locked, restricted | `rgba(20,48,42,.08)` / `#14302A` |
| Negative | rejected, rejected_cancelled, removed_by_admin, removed_by_donor, suspended | `rgba(196,64,52,.12)` / `#8C2A20` |

All text/background pairs must meet WCAG AA (4.5:1). Verified during implementation; adjust text shade only, never the canvas.

### Typography

- **Display:** Playfair Display 500/600/700 + italic 500/600, loaded once in `app/layout.tsx` via `next/font` as `--font-playfair`.
- **Body:** DM Sans 400–700, loaded via `next/font` in `app/layout.tsx` as `--font-dm-sans`.
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

### Shape, depth, spacing

- Radii: `999px` pills (buttons, inputs' focus ring container, badges, nav), `24px` major cards/panels/modals, `16px` inner cards and table shells' inner rows, `12px` inputs, `10px` chips/captions.
- Shadows: flat at rest with hairline border; on hover `0 30px 60px -30px rgba(20,48,42,.45)`; modals `0 40px 80px -30px rgba(20,48,42,.45)`.
- Section rhythm: public pages use the homepage's `clamp(90px,11vw,160px)`; operate pages use `clamp(32px,4vw,56px)` between sections.
- Container: `max-width: 1240px; padding-inline: clamp(20px,5vw,72px)`.
- Grids: `repeat(auto-fit, minmax(...))` first; media queries only where auto-fit can't express it (sidebar collapse, nav menu).

### Components (the shared kit)

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

### Motion tiers

| Tier | Pages | Allowed |
|---|---|---|
| **Persuade** | auth, catalog, listing detail | Reveal-on-scroll, Highlight wipe, word-rise on title, decorative orbit rings (auth only), card hover lift |
| **Operate** | dashboards, admin, wizard, request board, password pages | Reveal on first paint of page header only, hover states, modal fade/scale (200ms) |

All motion respects `prefers-reduced-motion: reduce` (the existing global rule stays; new JS-driven motion checks `matchMedia` and renders final state). Tilt and magnetic buttons stay homepage-only.

## Where things live

| Path | What |
|---|---|
| `frontend/app/tokens.css` | `--ll-*` design tokens (colors, fonts, easing, nav offset, container, gutter) and the body baseline |
| `frontend/app/globals.css` | Resets, `.site-main`, `.shell`, `.sr-only`, `.page-section`, homepage page-level rules, reduced-motion block. Nothing component-specific. |
| `frontend/app/layout.tsx` | Loads Playfair Display and DM Sans via `next/font` (the only place fonts load) |
| `frontend/components/ui/*` | The shared kit (Button, Card, Field, Modal, DataTable, StatusPill, Reveal, ...), one CSS module each; import from `@/components/ui` |
| `frontend/components/chrome/*` | App-wide nav (`AppNav`) and footer |
| `frontend/components/dashboard/*` | Dashboard shell (sidebar rail, tabs) shared by `/donor`, `/recipient`, `/admin` |
| `frontend/components/auth/*` | Auth split layout and centered-card layout |
| `frontend/components/catalog/*`, `listing-detail/*`, `donor-form/*`, `admin/*` | Page-group modules (styles and sub-components) |
| `frontend/components/home-page-redesign.*` | Homepage body; must stay pixel-identical to `docs/design/homepage-redesign/export.html` (see `e2e/redesign/home-regression.spec.ts`) |
| `e2e/redesign/` + `e2e/redesign.config.ts` | Redesign Playwright suite (authed tests skip without the backend) |
