# App-Wide Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild every LabLink frontend route except the homepage body on the homepage's design system (tokens, Playfair/DM Sans type, pill buttons, 24px cards, mint/ink palette, reveal motion) with new layouts, without changing behavior.

**Architecture:** A token layer (`app/tokens.css`) plus a small UI kit (`components/ui/*`, CSS modules) is built first; a shared floating nav/footer replaces the old header; then each page group is rebuilt on the kit and the legacy `globals.css` rules it no longer uses are deleted. Legacy `:root` variables are remapped to the new tokens in Task 1 so un-migrated pages already share the palette.

**Tech Stack:** Next.js 15.3 App Router, React 19, TypeScript, CSS Modules, `next/font/google`, Playwright (`@playwright/test` 1.58, installed Chrome via `channel: "chrome"`).

**Spec:** `docs/superpowers/specs/2026-09-30-app-wide-redesign-design.md`

## Global Constraints

- Homepage body (`components/home-page-redesign.tsx` sections) must render pixel-identical to `docs/design/homepage-redesign/export.html` for signed-out visitors at 1440×900 and 390×844 (dev indicator hidden).
- Tokens are exactly: ink `#14302A`, ink-deep `#0F2621`, text `#1E3B30`, muted `#3D5148`, mint `#10C79A`, mint-text `#0BA982`, mint-hover `#5FE0BC`, canvas `#EEF4F1`, surface `#FFFFFF`, surface-hover `#DDEFE7`, line `rgba(20,48,42,.08)`, line-strong `rgba(20,48,42,.3)`.
- Display font Playfair Display 500/600/700 (+ italic); body DM Sans 400–700; both via `next/font` in `app/layout.tsx` only.
- Radii: pills `999px`; major cards/modals `24px`; inner cards `16px`; inputs `12px`; chips `10px`.
- Every selector in spec §8.2 keeps resolving (E2E contract).
- No backend/API/schema/permission changes. No copy changes except spec §6 lines marked **[new copy]**.
- Pages remain async server components; `"use client"` only for interactive widgets.
- All new motion honors `prefers-reduced-motion: reduce`; content must be visible without JS.
- No horizontal page scroll at 390px wide; tables scroll inside their own shell.
- Never use seller/buyer wording; donor/recipient only.
- Work happens on branch `feat/app-wide-redesign` (create with `superpowers:using-git-worktrees` at execution time).

## Review Focus

1. **Signed-in visitor on `/`** — expects their role links, bell, and avatar menu in the nav, not "Sign in". Test: Task 3 `nav-authed.spec.ts`.
2. **Long strings at 390px** (long listing titles, institution names, emails in the avatar menu) — expects wrapping/ellipsis inside cards and tables scrolling inside their shell, never page-level horizontal scroll. Test: `assertNoHorizontalScroll` in every page task's spec + Task 2 kit long-text fixture.
3. **Keyboard-only use** — avatar menu, mobile menu, filter popover, and every modal open with Enter/Space, close with Esc, and return focus; focus ring visible. Tests: Task 2 `kit.spec.ts` (Modal), Task 3 `nav.spec.ts` (mobile menu), Task 6 `catalog.spec.ts` (category popover).
4. **Reduced motion / no JS** — expects all content visible immediately; reveal never strands content at `opacity: 0`. Test: Task 2 `kit.spec.ts` reduced-motion + `javaScriptEnabled: false` cases.
5. **Empty states** — catalog with zero listings, dashboard tables with zero rows, empty notification panel — expects a designed empty state, not a blank box. Tests: Task 6 (catalog empty), Task 2 (DataTable `empty`), Task 3 (notification panel empty, authed).

---

## File Structure

**Create**
| Path | Responsibility |
|---|---|
| `frontend/lib/api-client.ts` | Browser-side authed fetch for client components (fixes build) |
| `frontend/app/tokens.css` | `--ll-*` tokens, base element styles, legacy-variable remap |
| `frontend/components/ui/cx.ts` | className joiner |
| `frontend/components/ui/button.tsx` + `.module.css` | `Button`, `ButtonLink`, `buttonClass` |
| `frontend/components/ui/eyebrow.tsx` + `.module.css` | `Eyebrow` |
| `frontend/components/ui/highlight.tsx` + `.module.css` | `Highlight` (wipe-in bar) |
| `frontend/components/ui/reveal.tsx` + `.module.css` | `Reveal`, `useInView` |
| `frontend/components/ui/card.tsx` + `.module.css` | `Card` |
| `frontend/components/ui/stat-tile.tsx` + `.module.css` | `StatTile`, `StatRow` |
| `frontend/components/ui/avatar.tsx` + `.module.css` | `Avatar` |
| `frontend/components/ui/field.tsx` + `.module.css` | `Field`, `Input`, `Select`, `Textarea`, `Checkbox` |
| `frontend/components/ui/modal.tsx` + `.module.css` | `Modal` (native `<dialog>`) |
| `frontend/components/ui/notice.tsx` + `.module.css` | `Notice` |
| `frontend/components/ui/page-header.tsx` + `.module.css` | `PageHeader` |
| `frontend/components/ui/empty-state.tsx` + `.module.css` | `EmptyState` |
| `frontend/components/ui/data-table.tsx` + `.module.css` | `DataTable`, `tableStyles` |
| `frontend/components/ui/index.ts` | barrel export |
| `frontend/app/dev/kit/page.tsx` | dev-only kit fixture (404 in production; deleted in Task 14) |
| `frontend/components/chrome/app-nav.tsx` | server: profile → nav model |
| `frontend/components/chrome/app-nav-client.tsx` + `app-nav.module.css` | client: pills, active route, mobile sheet, avatar menu, hash scroll |
| `frontend/components/chrome/nav-model.ts` | pure nav-item builder (unit of truth for links per role) |
| `frontend/components/chrome/app-footer.tsx` + `.module.css` | footer |
| `frontend/components/notification-center.module.css` | restyled bell/panel/toasts |
| `frontend/components/auth/auth-split.tsx` + `.module.css` | auth split layout (ink panel + form card) |
| `frontend/components/dashboard/dashboard-shell.tsx` + `.module.css` | shared rail + content shell (replaces `dashboard-sidebar-shell.tsx` and admin's inline copy) |
| `frontend/components/dashboard/dashboard-icons.tsx` | rail icons (moved from sidebar shell + admin) |
| `frontend/components/catalog/catalog.module.css` | catalog styles |
| `frontend/components/listing-detail/listing-detail.module.css` | detail styles |
| `frontend/components/donor-form/donor-form.module.css` | wizard styles |
| `frontend/components/admin/*.tsx` | admin sections + modals split out of `admin-review-dashboard.tsx` |
| `e2e/redesign.config.ts` | Playwright config for redesign specs (frontend only, Chrome channel) |
| `e2e/redesign/helpers.ts` | `assertNoHorizontalScroll`, `hideDevIndicator`, `backendUp` |
| `e2e/redesign/*.spec.ts` | per-task specs (named in each task) |
| `DESIGN.md` (repo root) | the design system, for humans and the impeccable skill |

**Modify**
`app/layout.tsx`, `app/globals.css` (shrinks every task), `components/home-page-redesign.tsx` + module (nav/font hand-off only), `components/notification-center.tsx`, `components/status-pill.tsx`, `components/auth-shell.tsx`, `components/forgot-password-shell.tsx`, `components/update-password-shell.tsx`, `components/public-catalog-browser.tsx`, `app/listings/[listingId]/page.tsx`, `components/listing-request-button.tsx`, `components/recipient-save-listing-button.tsx`, `components/operations-dashboard-ui.tsx`, `components/donor-dashboard-workspace.tsx`, `components/donor-listing-actions.tsx`, `components/recipient-dashboard-workspace.tsx`, `components/request-board-form.tsx`, `components/donor-listing-form.tsx`, `components/request-board-browser.tsx`, `components/admin-review-dashboard.tsx`, gate screens in `app/donor/**/page.tsx`, `app/recipient/page.tsx`, `app/admin/page.tsx`, `PROGRESS.md`, `WORK.md`.

**Delete (Task 3 / 8 / 14)**
`components/site-header.tsx`, `components/header-auth-actions.tsx` (Task 3); `components/dashboard-sidebar-shell.tsx` (Task 8); `app/dev/kit/page.tsx` (Task 14).

---

### Task 0: Unblock `next build` (client API module)

Three client components import server-only `lib/api.ts` (which pulls `next/headers`). Builds fail, and those calls cannot work in the browser.

**Files:**
- Create: `frontend/lib/api-client.ts`
- Modify: `frontend/components/request-board-browser.tsx:6`, `frontend/components/request-board-form.tsx:5`, `frontend/components/recipient-dashboard-workspace.tsx:15`
- Modify: `frontend/lib/api.ts` (remove the four moved functions)

**Interfaces:**
- Produces: `getDonorRequestBoard(): Promise<RequestBoardPost[] | null>`, `createListingFromBoardPost(postId: string): Promise<Listing | null>`, `createRequestBoardPost(payload: RequestBoardPostCreate): Promise<RequestBoardPost | null>`, `closeBoardPost(postId: string): Promise<RequestBoardPost | null>` — all from `@/lib/api-client`.

- [ ] **Step 1: Confirm the failure**

Run: `cd frontend && npx next build 2>&1 | grep -E "Failed to compile|next/headers"`
Expected: `Failed to compile.` and the `next/headers` import trace through `components/request-board-browser.tsx`.

- [ ] **Step 2: Create `frontend/lib/api-client.ts`**

```ts
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Listing, RequestBoardPost, RequestBoardPostCreate } from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";

async function fetchAuthedJson<T>(path: string, init?: RequestInit): Promise<T | null> {
  const {
    data: { session },
  } = await createSupabaseBrowserClient().auth.getSession();
  if (!session?.access_token) {
    return null;
  }

  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${session.access_token}`);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, cache: "no-store" });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function getDonorRequestBoard(): Promise<RequestBoardPost[] | null> {
  return fetchAuthedJson<RequestBoardPost[]>("/donor/request-board");
}

export async function createListingFromBoardPost(postId: string): Promise<Listing | null> {
  return fetchAuthedJson<Listing>(`/donor/request-board/${postId}/create-listing`, { method: "POST" });
}

export async function createRequestBoardPost(payload: RequestBoardPostCreate): Promise<RequestBoardPost | null> {
  return fetchAuthedJson<RequestBoardPost>("/recipient/request-board", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function closeBoardPost(postId: string): Promise<RequestBoardPost | null> {
  return fetchAuthedJson<RequestBoardPost>(`/recipient/request-board/${postId}/close`, { method: "POST" });
}
```

- [ ] **Step 3: Repoint the three imports and delete the moved functions from `lib/api.ts`**

```ts
// request-board-browser.tsx
import { createListingFromBoardPost, getDonorRequestBoard } from "@/lib/api-client";
// request-board-form.tsx
import { createRequestBoardPost } from "@/lib/api-client";
// recipient-dashboard-workspace.tsx
import { closeBoardPost } from "@/lib/api-client";
```

Run `grep -rn "getDonorRequestBoard\|createListingFromBoardPost\|createRequestBoardPost\|closeBoardPost" frontend/app frontend/components` first; if any **server** file still uses one, keep it in `lib/api.ts` too and only repoint the client imports.

- [ ] **Step 4: Verify**

Run: `cd frontend && npx tsc --noEmit && npx next build 2>&1 | tail -5`
Expected: tsc silent; build ends with the route table (no `Failed to compile`).

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/api-client.ts frontend/lib/api.ts frontend/components/request-board-browser.tsx frontend/components/request-board-form.tsx frontend/components/recipient-dashboard-workspace.tsx
git commit -m "fix: move client-side request board calls off server-only api module"
```

---

### Task 1: Redesign test harness, fonts, tokens, legacy remap

**Files:**
- Create: `e2e/redesign.config.ts`, `e2e/redesign/helpers.ts`, `e2e/redesign/foundation.spec.ts`, `e2e/redesign/home-regression.spec.ts`, `frontend/app/tokens.css`
- Modify: `frontend/app/layout.tsx`, `frontend/app/globals.css:1` (remove Google `@import`), `frontend/components/home-page-redesign.tsx` (drop local Playfair loader), `frontend/components/home-page-redesign.module.css` (`.home` font-family → `var(--font-dm-sans)`)

**Interfaces:**
- Produces: CSS custom properties `--ll-ink, --ll-ink-deep, --ll-text, --ll-muted, --ll-mint, --ll-mint-text, --ll-mint-hover, --ll-canvas, --ll-surface, --ll-surface-hover, --ll-line, --ll-line-strong, --ll-glass, --ll-display, --ll-body, --ll-ease, --ll-nav-offset, --ll-container, --ll-gutter`; `html` carries `--font-playfair` and `--font-dm-sans`.
- Produces (tests): `assertNoHorizontalScroll(page)`, `hideDevIndicator(page)`, `backendUp(): Promise<boolean>`, `gotoSettled(page, path)` from `e2e/redesign/helpers.ts`.

- [ ] **Step 1: Write the harness**

`e2e/redesign.config.ts`:
```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./redesign",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  snapshotPathTemplate: "{testDir}/__snapshots__/{arg}{ext}",
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    channel: "chrome",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
  ],
  webServer: {
    command: "cd ../frontend && npm run dev",
    port: 3000,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
```

`e2e/redesign/helpers.ts`:
```ts
import { expect, type Page } from "@playwright/test";

export async function hideDevIndicator(page: Page) {
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
}

export async function gotoSettled(page: Page, path: string) {
  await page.goto(path, { waitUntil: "load" });
  await hideDevIndicator(page);
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 300) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(80);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(2500);
}

export async function assertNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, "page must not scroll horizontally").toBeLessThanOrEqual(0);
}

export async function backendUp(): Promise<boolean> {
  const base = process.env.E2E_API_URL || "http://127.0.0.1:8000";
  try {
    const response = await fetch(`${base}/docs`, { signal: AbortSignal.timeout(1500) });
    return response.ok;
  } catch {
    return false;
  }
}
```

`e2e/redesign/foundation.spec.ts`:
```ts
import { expect, test } from "@playwright/test";

test("tokens are defined on :root", async ({ page }) => {
  await page.goto("/auth");
  const mint = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--ll-mint").trim().toLowerCase(),
  );
  expect(mint).toBe("#10c79a");
});

test("legacy variables are remapped to the new palette", async ({ page }) => {
  await page.goto("/auth");
  const forest = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--forest").trim().toLowerCase(),
  );
  expect(forest).toBe("#14302a");
});

test("display headings use Playfair Display", async ({ page }) => {
  await page.goto("/listings");
  // With no backend the catalog renders its empty state, whose heading may be h1 or h2.
  const family = await page.locator("h1, h2").first().evaluate((el) => getComputedStyle(el).fontFamily);
  expect(family).toMatch(/Playfair/i);
});
```

`e2e/redesign/home-regression.spec.ts`:
```ts
import { expect, test } from "@playwright/test";
import path from "node:path";

import { gotoSettled } from "./helpers";

const EXPORT = "file://" + path.resolve(__dirname, "../../docs/design/homepage-redesign/export.html");

test("signed-out homepage matches the design export", async ({ page }, info) => {
  const target = process.env.HOME_BASELINE ? EXPORT : "/";
  await gotoSettled(page, target);
  await expect(page).toHaveScreenshot(`home-${info.project.name}.png`, {
    fullPage: true,
    animations: "disabled",
    maxDiffPixels: 0,
  });
});
```

- [ ] **Step 2: Record the homepage baseline from the export and run the suite (expect failures)**

```bash
cd e2e
HOME_BASELINE=1 npx playwright test -c redesign.config.ts home-regression --update-snapshots
npx playwright test -c redesign.config.ts
```
Expected: `home-regression` PASS (port already matches); `tokens are defined` FAIL (`""`), `legacy variables` FAIL (`#1a3a2a`), `Playfair` FAIL (`DM Serif Display`).

- [ ] **Step 3: Create `frontend/app/tokens.css`**

```css
:root {
  --ll-ink: #14302a;
  --ll-ink-deep: #0f2621;
  --ll-text: #1e3b30;
  --ll-muted: #3d5148;
  --ll-mint: #10c79a;
  --ll-mint-text: #0ba982;
  --ll-mint-hover: #5fe0bc;
  --ll-canvas: #eef4f1;
  --ll-surface: #ffffff;
  --ll-surface-hover: #ddefe7;
  --ll-line: rgba(20, 48, 42, 0.08);
  --ll-line-strong: rgba(20, 48, 42, 0.3);
  --ll-glass: rgba(20, 48, 42, 0.55);
  --ll-shadow-hover: 0 30px 60px -30px rgba(20, 48, 42, 0.45);
  --ll-shadow-modal: 0 40px 80px -30px rgba(20, 48, 42, 0.45);
  --ll-display: var(--font-playfair), Georgia, serif;
  --ll-body: var(--font-dm-sans), Helvetica, Arial, sans-serif;
  --ll-ease: cubic-bezier(0.2, 0.7, 0.2, 1);
  --ll-nav-offset: 96px;
  --ll-container: 1240px;
  --ll-gutter: clamp(20px, 5vw, 72px);

  /* Legacy variables remapped so un-migrated rules share the new palette. */
  --font-body: var(--ll-body);
  --font-display: var(--ll-display);
  --forest: var(--ll-ink);
  --mid: var(--ll-ink);
  --mint: var(--ll-mint);
  --light: var(--ll-canvas);
  --background: var(--ll-canvas);
  --background-soft: var(--ll-canvas);
  --surface: var(--ll-surface);
  --surface-muted: var(--ll-surface-hover);
  --text: var(--ll-text);
  --muted: var(--ll-muted);
  --muted-soft: var(--ll-muted);
  --primary: var(--ll-ink);
  --primary-container: var(--ll-ink);
  --primary-strong: var(--ll-ink);
  --primary-soft: rgba(16, 199, 154, 0.1);
  --secondary: var(--ll-mint);
  --secondary-container: rgba(16, 199, 154, 0.14);
  --secondary-text: var(--ll-ink);
  --line: var(--ll-line);
  --line-strong: var(--ll-line-strong);
}

body.app-body {
  background: var(--ll-canvas);
  color: var(--ll-text);
  font-family: var(--ll-body);
  -webkit-font-smoothing: antialiased;
}
```

- [ ] **Step 4: Load fonts in `app/layout.tsx`, import tokens after globals**

```tsx
import { DM_Sans, Playfair_Display } from "next/font/google";
// ...existing imports...
import "./globals.css";
import "./tokens.css";

const playfair = Playfair_Display({
  subsets: ["latin", "latin-ext", "cyrillic", "vietnamese"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
});

const dmSans = DM_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
});

// in RootLayout:
<html lang="en" className={`${playfair.variable} ${dmSans.variable}`}>
```

Delete line 1 of `globals.css` (`@import url("https://fonts.googleapis.com/...")`).
In `home-page-redesign.tsx` delete the `Playfair_Display` import/loader and `${playfair.variable}` from the root className. In `home-page-redesign.module.css` change `.home { font-family: "DM Sans", Helvetica, Arial, sans-serif; }` to `font-family: var(--font-dm-sans), Helvetica, Arial, sans-serif;`.

- [ ] **Step 5: Run the suite**

Run: `cd e2e && npx playwright test -c redesign.config.ts`
Expected: all PASS on both projects, including `home-regression` (0 differing pixels). If home differs only in glyph rendering, the DM Sans subset list is missing a subset the export used — compare `@font-face` unicode ranges in the export's `<style>` and add the subset; do not accept a non-zero diff.

- [ ] **Step 6: Verify build + commit**

```bash
cd frontend && npx tsc --noEmit && npx next build 2>&1 | tail -3
git add e2e/redesign.config.ts e2e/redesign frontend/app/tokens.css frontend/app/layout.tsx frontend/app/globals.css frontend/components/home-page-redesign.tsx frontend/components/home-page-redesign.module.css
git commit -m "feat: add design tokens, next/font loading, and redesign test harness"
```

---

### Task 2: UI kit

**Files:**
- Create: everything under `frontend/components/ui/` listed in File Structure; `frontend/app/dev/kit/page.tsx`; `e2e/redesign/kit.spec.ts`
- Modify: `frontend/components/status-pill.tsx`

**Interfaces (Produces — later tasks import from `@/components/ui`):**
```ts
cx(...parts: (string | false | null | undefined)[]): string
type ButtonVariant = "primary" | "secondary" | "ink" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";
buttonClass(o?: { variant?: ButtonVariant; size?: ButtonSize; block?: boolean; className?: string }): string
<Button variant? size? block? arrow? {...ButtonHTMLAttributes}>        // type defaults to "button"
<ButtonLink href variant? size? block? arrow? {...AnchorHTMLAttributes}> // next/link
<Eyebrow variant?: "plain" | "badge" as?: "div" | "span">
<Highlight>text</Highlight>
<Reveal as?: "div" | "section" | "li" delay?: number className?>
useInView<T extends Element>(options?: IntersectionObserverInit): [RefObject<T | null>, boolean]
<Card tone?: "white" | "ink" | "mint" interactive? padding?: "md" | "lg" as?: "div" | "article" | "section">
<StatTile tone? value label sublabel?>   <StatRow>{tiles}</StatRow>
<Avatar initials variant?: "ink" | "dashed" size?: "md" | "lg">
<Field label htmlFor hint? error? span?: "full" required?>{control}</Field>
<Input invalid? {...InputHTMLAttributes}> <Select invalid?> <Textarea invalid?> <Checkbox label {...InputHTMLAttributes}>
<Modal open onClose title eyebrow? wide? footer? labelledById?>
<Notice tone: "success" | "error" | "warning" | "info">
<PageHeader variant: "public" | "operate" eyebrow? title: ReactNode lead? actions?>
<EmptyState variant: "gate" | "empty" eyebrow? title lead? icon? actions?>
<DataTable head: ReactNode[] footer? empty?: ReactNode isEmpty?: boolean minWidth?: number>{rows}</DataTable>
tableStyles: { row, rowClickable, rowMuted, cellRight, thumb, thumbEmpty, titleCell, subtitle }
<StatusPill status className?>  // keeps classes "status-pill status-{status}"
statusTone(status: string): "positive" | "pending" | "neutral" | "negative"
```

- [ ] **Step 1: Write the failing kit spec** — `e2e/redesign/kit.spec.ts`

```ts
import { expect, test } from "@playwright/test";

import { assertNoHorizontalScroll } from "./helpers";

test.describe("ui kit", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dev/kit");
  });

  test("primary button is a mint pill", async ({ page }) => {
    const button = page.getByRole("button", { name: "Primary action" });
    await expect(button).toHaveCSS("border-radius", "999px");
    await expect(button).toHaveCSS("background-color", "rgb(16, 199, 154)");
  });

  test("status pills map to tone groups", async ({ page }) => {
    await expect(page.locator(".status-pill.status-live")).toHaveAttribute("data-tone", "positive");
    await expect(page.locator(".status-pill.status-admin_review")).toHaveAttribute("data-tone", "pending");
    await expect(page.locator(".status-pill.status-matched_reserved")).toHaveAttribute("data-tone", "neutral");
    await expect(page.locator(".status-pill.status-rejected_cancelled")).toHaveAttribute("data-tone", "negative");
  });

  test("field error is announced", async ({ page }) => {
    const input = page.locator("#kit-error-input");
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(input).toHaveAttribute("aria-describedby", "kit-error-input-error");
    await expect(page.locator("#kit-error-input-error")).toHaveText("This field is required.");
  });

  test("modal opens from keyboard, closes on Escape, restores focus", async ({ page }) => {
    const trigger = page.getByRole("button", { name: "Open modal" });
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "Kit modal" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Kit modal" })).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("empty data table renders its empty state", async ({ page }) => {
    await expect(page.getByText("Nothing here yet")).toBeVisible();
  });

  test("long text never causes page overflow", async ({ page }) => {
    await assertNoHorizontalScroll(page);
  });
});

test("reveal content is visible under reduced motion", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/dev/kit");
  await expect(page.getByTestId("kit-reveal-below-fold")).toHaveCSS("opacity", "1");
  await context.close();
});

test("reveal content is visible without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/dev/kit");
  await expect(page.getByTestId("kit-reveal-below-fold")).toHaveCSS("opacity", "1");
  await context.close();
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `cd e2e && npx playwright test -c redesign.config.ts kit`
Expected: FAIL — `/dev/kit` returns 404.

- [ ] **Step 3: Implement the kit**

`components/ui/cx.ts`
```ts
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
```

`components/ui/button.tsx`
```tsx
import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

import styles from "./button.module.css";
import { cx } from "./cx";

export type ButtonVariant = "primary" | "secondary" | "ink" | "danger" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

type Shared = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  arrow?: boolean;
  className?: string;
  children: ReactNode;
};

export function buttonClass({
  variant = "primary",
  size = "md",
  block = false,
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; block?: boolean; className?: string } = {}) {
  return cx(styles.button, styles[variant], styles[size], block && styles.block, className);
}

function Arrow() {
  return (
    <span className={styles.arrow} aria-hidden="true">
      →
    </span>
  );
}

export function Button({
  variant,
  size,
  block,
  arrow,
  className,
  children,
  type = "button",
  ...rest
}: Shared & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...rest} type={type} className={buttonClass({ variant, size, block, className })}>
      {children}
      {arrow ? <Arrow /> : null}
    </button>
  );
}

export function ButtonLink({
  href,
  variant,
  size,
  block,
  arrow,
  className,
  children,
  ...rest
}: Shared & { href: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  return (
    <Link {...rest} href={href} className={buttonClass({ variant, size, block, className })}>
      {children}
      {arrow ? <Arrow /> : null}
    </Link>
  );
}
```

`components/ui/button.module.css`
```css
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border: 1px solid transparent;
  border-radius: 999px;
  font-family: var(--ll-body);
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
  cursor: pointer;
  transition: background 0.25s, box-shadow 0.3s, transform 0.2s ease-out, color 0.25s;
}
.button:disabled,
.button[aria-disabled="true"] {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}
.button:focus-visible {
  outline: 2px solid var(--ll-mint);
  outline-offset: 3px;
}
.sm { min-height: 36px; padding: 8px 16px; font-size: 13px; }
.md { min-height: 44px; padding: 12px 22px; font-size: 15px; }
.lg { min-height: 54px; padding: 16px 26px; font-size: 16px; }
.block { width: 100%; }

.primary { background: var(--ll-mint); color: var(--ll-ink); }
.primary:hover:not(:disabled) { background: var(--ll-mint-hover); box-shadow: 0 20px 40px -16px rgba(16, 199, 154, 0.7); color: var(--ll-ink); }

.secondary { background: transparent; border-color: var(--ll-line-strong); color: var(--ll-ink); }
.secondary:hover:not(:disabled) { background: rgba(20, 48, 42, 0.06); color: var(--ll-ink); }

.ink { background: var(--ll-ink); color: #ffffff; }
.ink:hover:not(:disabled) { background: var(--ll-ink-deep); color: var(--ll-mint); }

.danger { background: #8c2a20; color: #ffffff; }
.danger:hover:not(:disabled) { background: #6e2019; color: #ffffff; }

.ghost { background: transparent; color: var(--ll-mint-text); padding-inline: 8px; }
.ghost:hover:not(:disabled) { color: var(--ll-ink); }

.arrow {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--ll-ink);
  color: var(--ll-mint);
  display: grid;
  place-items: center;
  font-size: 14px;
}
.ink .arrow { background: var(--ll-mint); color: var(--ll-ink); }
```

`components/ui/eyebrow.tsx`
```tsx
import type { ReactNode } from "react";

import { cx } from "./cx";
import styles from "./eyebrow.module.css";

export function Eyebrow({
  variant = "plain",
  as: Tag = "div",
  className,
  children,
}: {
  variant?: "plain" | "badge";
  as?: "div" | "span";
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag className={cx(styles.eyebrow, variant === "badge" && styles.badge, className)}>
      {variant === "badge" ? (
        <span className={styles.pulse} aria-hidden="true">
          <span className={styles.dot} />
          <span className={styles.ring} />
        </span>
      ) : null}
      {children}
    </Tag>
  );
}
```

`components/ui/eyebrow.module.css`
```css
.eyebrow { font-size: 12px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ll-mint-text); }
.badge { display: inline-flex; align-items: center; gap: 10px; padding: 8px 14px 8px 8px; border-radius: 999px; border: 1px solid rgba(16, 199, 154, 0.4); letter-spacing: 0.12em; }
.pulse { position: relative; width: 20px; height: 20px; display: grid; place-items: center; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: var(--ll-mint); }
.ring { position: absolute; inset: 0; border-radius: 50%; background: var(--ll-mint); animation: pulse 1.8s ease-out infinite; }
@keyframes pulse { 0% { transform: scale(0.6); opacity: 0.9; } 100% { transform: scale(2.4); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .ring { animation: none; opacity: 0; } }
```

`components/ui/reveal.tsx`
```tsx
"use client";

import type { CSSProperties, ReactNode, RefObject } from "react";
import { useEffect, useRef, useState } from "react";

import { cx } from "./cx";
import styles from "./reveal.module.css";

export function useInView<T extends Element>(
  options: IntersectionObserverInit = { threshold: 0.1, rootMargin: "0px 0px -5% 0px" },
): [RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setInView(true);
        observer.disconnect();
      }
    }, options);
    observer.observe(el);
    return () => observer.disconnect();
    // options are static per call site
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [ref, inView];
}

type RevealState = "static" | "pending" | "shown";

export function Reveal({
  as: Tag = "div",
  delay = 0,
  className,
  children,
  ...rest
}: {
  as?: "div" | "section" | "li";
  delay?: number;
  className?: string;
  children: ReactNode;
  "data-testid"?: string;
}) {
  const ref = useRef<HTMLDivElement & HTMLLIElement>(null);
  // "static" on the server and without JS: content is fully visible.
  const [state, setState] = useState<RevealState>("static");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Only hide elements that start below the fold, so nothing visible flashes.
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    setState("pending");
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setState("shown");
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -5% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      {...rest}
      ref={ref}
      data-reveal={state}
      className={cx(styles.reveal, className)}
      style={{ "--reveal-delay": `${delay}s` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}
```

`components/ui/reveal.module.css`
```css
.reveal { transition: opacity 0.9s var(--ll-ease) var(--reveal-delay, 0s), transform 0.9s var(--ll-ease) var(--reveal-delay, 0s); }
.reveal[data-reveal="pending"] { opacity: 0; transform: translateY(24px); }
.reveal[data-reveal="shown"] { opacity: 1; transform: none; }
```

`components/ui/highlight.tsx`
```tsx
"use client";

import { cx } from "./cx";
import styles from "./highlight.module.css";
import { useInView } from "./reveal";

export function Highlight({ children }: { children: string }) {
  const [ref, inView] = useInView<HTMLSpanElement>({ threshold: 0.5 });
  return (
    <span ref={ref} className={styles.hl}>
      <span className={cx(styles.bar, inView && styles.barOn)} aria-hidden="true" />
      <span className={styles.text}>{children}</span>
    </span>
  );
}
```

`components/ui/highlight.module.css` (values from homepage `.hl*`)
```css
.hl { position: relative; display: inline-block; padding: 0 0.08em; }
.bar { position: absolute; left: 0; right: 0; bottom: 0.06em; height: 0.28em; background: var(--ll-mint); opacity: 0.55; transform: scaleX(0); transform-origin: left; transition: transform 1.1s 0.5s cubic-bezier(0.2, 0.8, 0.2, 1); z-index: 0; }
.barOn { transform: scaleX(1); }
.text { position: relative; z-index: 1; }
@media (prefers-reduced-motion: reduce) { .bar { transform: scaleX(1); transition: none; } }
@media (scripting: none) { .bar { transform: scaleX(1); } }
```

`components/ui/card.tsx`
```tsx
import type { HTMLAttributes, ReactNode } from "react";

import styles from "./card.module.css";
import { cx } from "./cx";

export function Card({
  tone = "white",
  interactive = false,
  padding = "md",
  as: Tag = "div",
  className,
  children,
  ...rest
}: {
  tone?: "white" | "ink" | "mint";
  interactive?: boolean;
  padding?: "md" | "lg";
  as?: "div" | "article" | "section";
  className?: string;
  children: ReactNode;
} & HTMLAttributes<HTMLElement>) {
  return (
    <Tag {...rest} className={cx(styles.card, styles[tone], styles[padding], interactive && styles.interactive, className)}>
      {children}
    </Tag>
  );
}
```

`components/ui/card.module.css`
```css
.card { border-radius: 24px; min-width: 0; }
.md { padding: 28px; }
.lg { padding: 36px; }
.white { background: var(--ll-surface); border: 1px solid var(--ll-line); color: var(--ll-text); }
.ink { background: var(--ll-ink); color: #ffffff; }
.mint { background: var(--ll-mint); color: var(--ll-ink); }
.interactive { transition: transform 0.3s, box-shadow 0.3s; }
.interactive:hover { transform: translateY(-6px); box-shadow: var(--ll-shadow-hover); }
@media (prefers-reduced-motion: reduce) { .interactive:hover { transform: none; } }
@media (max-width: 640px) { .md { padding: 22px; } .lg { padding: 26px; } }
```

`components/ui/stat-tile.tsx`
```tsx
import type { ReactNode } from "react";

import { cx } from "./cx";
import styles from "./stat-tile.module.css";

export function StatTile({
  tone = "white",
  value,
  label,
  sublabel,
}: {
  tone?: "white" | "ink" | "mint";
  value: ReactNode;
  label: string;
  sublabel?: string;
}) {
  return (
    <div className={cx(styles.tile, styles[tone])}>
      <div className={styles.value}>{value}</div>
      <div className={styles.label}>{label}</div>
      {sublabel ? <div className={styles.sublabel}>{sublabel}</div> : null}
    </div>
  );
}

export function StatRow({ children }: { children: ReactNode }) {
  return <div className={styles.row}>{children}</div>;
}
```

`components/ui/stat-tile.module.css`
```css
.row { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
.tile { padding: 28px; border-radius: 24px; min-width: 0; }
.white { background: var(--ll-surface); border: 1px solid var(--ll-line); color: var(--ll-ink); }
.ink { background: var(--ll-ink); color: #ffffff; }
.mint { background: var(--ll-mint); color: var(--ll-ink); }
.value { font-family: var(--ll-display); font-size: clamp(36px, 4vw, 56px); font-weight: 700; line-height: 1; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; }
.label { margin-top: 14px; font-size: 12px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ll-mint-text); }
.ink .label { color: var(--ll-mint); }
.mint .label { color: var(--ll-ink); opacity: 0.75; }
.sublabel { margin-top: 6px; font-size: 14px; color: var(--ll-muted); }
.ink .sublabel { color: rgba(255, 255, 255, 0.7); }
.mint .sublabel { color: rgba(20, 48, 42, 0.8); }
```

`components/ui/avatar.tsx`
```tsx
import { cx } from "./cx";
import styles from "./avatar.module.css";

export function Avatar({
  initials,
  variant = "ink",
  size = "md",
}: {
  initials: string;
  variant?: "ink" | "dashed";
  size?: "md" | "lg";
}) {
  return (
    <span className={cx(styles.avatar, styles[variant], styles[size])} aria-hidden="true">
      {initials}
    </span>
  );
}
```

`components/ui/avatar.module.css`
```css
.avatar { display: inline-grid; place-items: center; flex: none; border-radius: 50%; font-family: var(--ll-display); font-weight: 700; }
.md { width: 44px; height: 44px; font-size: 15px; }
.lg { width: 60px; height: 60px; font-size: 18px; }
.ink { background: var(--ll-ink); color: var(--ll-mint); }
.dashed { border: 2px dashed rgba(20, 48, 42, 0.5); color: var(--ll-ink); }
```

`components/ui/field.tsx`
```tsx
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { Children, cloneElement, isValidElement } from "react";

import { cx } from "./cx";
import styles from "./field.module.css";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  span,
  required,
  children,
}: {
  label: ReactNode;
  htmlFor: string;
  hint?: ReactNode;
  error?: string | null;
  span?: "full";
  required?: boolean;
  children: ReactNode;
}) {
  const describedBy = [hint ? `${htmlFor}-hint` : null, error ? `${htmlFor}-error` : null].filter(Boolean).join(" ") || undefined;
  const control = Children.only(children);
  const wired = isValidElement<{ "aria-describedby"?: string; "aria-invalid"?: boolean }>(control)
    ? cloneElement(control, { "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })
    : control;

  return (
    <div className={cx(styles.field, span === "full" && styles.full)}>
      <label className={styles.label} htmlFor={htmlFor}>
        {label}
        {required ? <span className={styles.required} aria-hidden="true"> *</span> : null}
      </label>
      {wired}
      {hint ? <p id={`${htmlFor}-hint`} className={styles.hint}>{hint}</p> : null}
      {error ? <p id={`${htmlFor}-error`} className={styles.error}>{error}</p> : null}
    </div>
  );
}

export function FieldGrid({ children }: { children: ReactNode }) {
  return <div className={styles.grid}>{children}</div>;
}

export function Input({ invalid, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input {...rest} className={cx(styles.control, invalid && styles.invalid, className)} />;
}

export function Select({ invalid, className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select {...rest} className={cx(styles.control, styles.select, invalid && styles.invalid, className)}>
      {children}
    </select>
  );
}

export function Textarea({ invalid, className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return <textarea {...rest} className={cx(styles.control, styles.textarea, invalid && styles.invalid, className)} />;
}

export function Checkbox({ label, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label className={cx(styles.checkbox, className)}>
      <input {...rest} type="checkbox" />
      <span>{label}</span>
    </label>
  );
}
```

`components/ui/field.module.css`
```css
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; }
.field { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.full { grid-column: 1 / -1; }
.label { font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ll-ink); }
.required { color: var(--ll-mint-text); }
.control { width: 100%; min-height: 48px; padding: 12px 16px; border-radius: 12px; border: 1px solid var(--ll-line-strong); background: var(--ll-surface); color: var(--ll-text); font: 16px/1.4 var(--ll-body); transition: border-color 0.2s, box-shadow 0.2s; }
.control:focus { outline: none; border-color: var(--ll-mint); box-shadow: 0 0 0 4px rgba(16, 199, 154, 0.2); }
.select { appearance: none; padding-right: 44px; background-image: linear-gradient(45deg, transparent 50%, var(--ll-ink) 50%), linear-gradient(135deg, var(--ll-ink) 50%, transparent 50%); background-position: calc(100% - 22px) 50%, calc(100% - 16px) 50%; background-size: 6px 6px; background-repeat: no-repeat; }
.textarea { min-height: 120px; resize: vertical; }
.invalid { border-color: #8c2a20; }
.invalid:focus { box-shadow: 0 0 0 4px rgba(196, 64, 52, 0.18); }
.hint { margin: 0; font-size: 13px; color: var(--ll-muted); }
.error { margin: 0; font-size: 13px; font-weight: 600; color: #8c2a20; }
.checkbox { display: inline-flex; align-items: center; gap: 10px; min-height: 40px; font-size: 15px; color: var(--ll-text); cursor: pointer; }
.checkbox input { width: 18px; height: 18px; accent-color: var(--ll-mint); }
```

`components/ui/modal.tsx`
```tsx
"use client";

import type { ReactNode } from "react";
import { useEffect, useId, useRef } from "react";

import { cx } from "./cx";
import styles from "./modal.module.css";

export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  wide = false,
  footer,
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  eyebrow?: ReactNode;
  wide?: boolean;
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnFocus.current = document.activeElement as HTMLElement | null;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={cx(styles.dialog, wide && styles.wide, className)}
      onClose={() => {
        onClose();
        returnFocus.current?.focus();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <div className={styles.card}>
        <header className={styles.header}>
          <div>
            {eyebrow ? <div className={styles.eyebrow}>{eyebrow}</div> : null}
            <h2 id={titleId} className={styles.title}>{title}</h2>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <div className={styles.body}>{children}</div>
        {footer ? <footer className={styles.footer}>{footer}</footer> : null}
      </div>
    </dialog>
  );
}
```

`components/ui/modal.module.css`
```css
.dialog { padding: 0; border: 0; background: transparent; width: min(560px, calc(100vw - 32px)); max-height: calc(100dvh - 48px); }
.wide { width: min(1080px, calc(100vw - 32px)); }
.dialog::backdrop { background: rgba(15, 38, 33, 0.55); backdrop-filter: blur(8px); }
.dialog[open] { animation: rise 0.2s var(--ll-ease); }
.card { display: flex; flex-direction: column; max-height: calc(100dvh - 48px); border-radius: 24px; background: var(--ll-surface); box-shadow: var(--ll-shadow-modal); overflow: hidden; }
.header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; padding: 28px 28px 0; }
.eyebrow { font-size: 12px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ll-mint-text); }
.title { margin: 6px 0 0; font-family: var(--ll-display); font-size: 28px; font-weight: 600; color: var(--ll-ink); }
.close { flex: none; width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--ll-line-strong); background: transparent; color: var(--ll-ink); font-size: 22px; line-height: 1; cursor: pointer; }
.close:hover { background: rgba(20, 48, 42, 0.06); }
.body { padding: 24px 28px; overflow: auto; }
.footer { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 12px; padding: 20px 28px; border-top: 1px solid var(--ll-line); }
@keyframes rise { from { opacity: 0; transform: translateY(12px) scale(0.98); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .dialog[open] { animation: none; } }
```

`components/ui/notice.tsx`
```tsx
import type { ReactNode } from "react";

import { cx } from "./cx";
import styles from "./notice.module.css";

export function Notice({
  tone,
  className,
  children,
}: {
  tone: "success" | "error" | "warning" | "info";
  className?: string;
  children: ReactNode;
}) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cx(styles.notice, styles[tone], className)}>
      {children}
    </div>
  );
}
```

`components/ui/notice.module.css`
```css
.notice { padding: 14px 18px; border-radius: 16px; font-size: 15px; line-height: 1.5; border: 1px solid transparent; }
.success { background: rgba(16, 199, 154, 0.12); border-color: rgba(16, 199, 154, 0.35); color: #0b5e49; }
.error { background: rgba(196, 64, 52, 0.1); border-color: rgba(196, 64, 52, 0.3); color: #8c2a20; }
.warning { background: rgba(214, 163, 40, 0.14); border-color: rgba(214, 163, 40, 0.4); color: #6b4f0a; }
.info { background: var(--ll-surface); border-color: var(--ll-line); color: var(--ll-muted); }
```

`components/ui/page-header.tsx`
```tsx
import type { ReactNode } from "react";

import { cx } from "./cx";
import styles from "./page-header.module.css";

export function PageHeader({
  variant,
  eyebrow,
  title,
  lead,
  actions,
}: {
  variant: "public" | "operate";
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className={cx(styles.header, styles[variant])}>
      <div className={styles.copy}>
        {eyebrow ? <div className={styles.eyebrow}>{eyebrow}</div> : null}
        <h1 className={styles.title}>{title}</h1>
        {lead ? <p className={styles.lead}>{lead}</p> : null}
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  );
}
```

`components/ui/page-header.module.css`
```css
.header { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 24px; }
.copy { min-width: 0; max-width: 820px; }
.eyebrow { font-size: 12px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--ll-mint-text); }
.title { margin: 14px 0 0; font-family: var(--ll-display); font-weight: 600; letter-spacing: -0.02em; line-height: 1.05; color: var(--ll-ink); text-wrap: balance; }
.public .title { font-size: clamp(40px, 5.2vw, 76px); }
.operate .title { font-size: clamp(32px, 3.6vw, 52px); }
.title em { font-style: italic; font-weight: 500; color: var(--ll-mint-text); }
.lead { margin: 16px 0 0; font-size: 17px; line-height: 1.65; color: var(--ll-muted); text-wrap: pretty; }
.public .lead { font-size: 18px; }
.actions { display: flex; flex-wrap: wrap; gap: 12px; }
```

`components/ui/empty-state.tsx`
```tsx
import type { ReactNode } from "react";

import { cx } from "./cx";
import styles from "./empty-state.module.css";

export function EmptyState({
  variant,
  eyebrow,
  title,
  lead,
  icon,
  actions,
  children,
}: {
  variant: "gate" | "empty";
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className={cx(styles.state, styles[variant])}>
      {icon ? <div className={styles.icon}>{icon}</div> : null}
      {eyebrow ? <div className={styles.eyebrow}>{eyebrow}</div> : null}
      <h2 className={styles.title}>{title}</h2>
      {lead ? <p className={styles.lead}>{lead}</p> : null}
      {children}
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </section>
  );
}
```

`components/ui/empty-state.module.css`
```css
.state { display: flex; flex-direction: column; align-items: center; text-align: center; }
.gate { max-width: 640px; margin: 0 auto; padding: clamp(32px, 5vw, 56px); border-radius: 24px; background: var(--ll-surface); border: 1px solid var(--ll-line); }
.empty { padding: 40px 24px; }
.icon { margin-bottom: 20px; }
.eyebrow { font-size: 12px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--ll-mint-text); }
.title { margin: 12px 0 0; font-family: var(--ll-display); font-weight: 600; font-size: clamp(26px, 3vw, 40px); line-height: 1.1; color: var(--ll-ink); text-wrap: balance; }
.empty .title { font-size: 22px; }
.lead { margin: 12px 0 0; max-width: 520px; font-size: 16px; line-height: 1.65; color: var(--ll-muted); }
.actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; margin-top: 28px; }
```

`components/ui/data-table.tsx`
```tsx
import type { ReactNode } from "react";

import styles from "./data-table.module.css";

export const tableStyles = {
  row: styles.row,
  rowClickable: styles.rowClickable,
  rowMuted: styles.rowMuted,
  cellRight: styles.cellRight,
  thumb: styles.thumb,
  thumbEmpty: styles.thumbEmpty,
  titleCell: styles.titleCell,
  subtitle: styles.subtitle,
};

export function DataTable({
  head,
  footer,
  empty,
  isEmpty = false,
  minWidth = 720,
  children,
}: {
  head: ReactNode[];
  footer?: ReactNode;
  empty?: ReactNode;
  isEmpty?: boolean;
  minWidth?: number;
  children?: ReactNode;
}) {
  return (
    <div className={styles.shell}>
      <div className={styles.scroll}>
        <table className={styles.table} style={{ minWidth }}>
          <thead>
            <tr>
              {head.map((cell, index) => (
                <th key={index} scope="col" className={index === head.length - 1 ? styles.cellRight : undefined}>
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isEmpty ? (
              <tr>
                <td colSpan={head.length} className={styles.emptyCell}>
                  {empty}
                </td>
              </tr>
            ) : (
              children
            )}
          </tbody>
        </table>
      </div>
      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </div>
  );
}
```

`components/ui/data-table.module.css`
```css
.shell { border-radius: 24px; background: var(--ll-surface); border: 1px solid var(--ll-line); overflow: hidden; }
.scroll { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 15px; }
.table th { padding: 16px 20px; text-align: left; font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ll-muted); border-bottom: 1px solid var(--ll-line); white-space: nowrap; }
.table td { padding: 16px 20px; border-bottom: 1px solid var(--ll-line); vertical-align: middle; color: var(--ll-text); }
.table tbody tr:last-child td { border-bottom: 0; }
.row { transition: background 0.2s; }
.rowClickable { cursor: pointer; }
.rowClickable:hover, .rowClickable:focus-visible { background: var(--ll-surface-hover); outline: none; }
.rowMuted { opacity: 0.6; }
.cellRight { text-align: right !important; }
.titleCell { display: flex; align-items: center; gap: 14px; min-width: 0; }
.thumb { width: 52px; height: 52px; flex: none; border-radius: 14px; object-fit: cover; background: var(--ll-canvas); }
.thumbEmpty { display: grid; place-items: center; font-size: 11px; font-weight: 700; color: var(--ll-muted); }
.subtitle { display: block; margin-top: 2px; font-size: 13px; color: var(--ll-muted); }
.emptyCell { padding: 0 !important; }
.footer { padding: 14px 20px; border-top: 1px solid var(--ll-line); font-size: 13px; color: var(--ll-muted); }
```

`components/status-pill.tsx` (replace)
```tsx
import { cx } from "@/components/ui/cx";
import styles from "@/components/ui/status-pill.module.css";
import { titleCaseStatus } from "@/lib/format";

const POSITIVE = new Set(["live", "verified", "approved_matched", "completed", "fulfilled", "active", "open"]);
const PENDING = new Set(["draft", "submitted", "admin_review", "pending_verification", "pending_admin_approval", "listing_under_review", "pending_request", "match_in_progress"]);
const NEGATIVE = new Set(["rejected", "rejected_cancelled", "removed_by_admin", "removed_by_donor", "suspended"]);

export function statusTone(status: string): "positive" | "pending" | "neutral" | "negative" {
  if (POSITIVE.has(status)) return "positive";
  if (PENDING.has(status)) return "pending";
  if (NEGATIVE.has(status)) return "negative";
  return "neutral";
}

export function StatusPill({ status, className }: { status: string; className?: string }) {
  const tone = statusTone(status);
  return (
    <span data-tone={tone} className={cx("status-pill", `status-${status}`, styles.pill, styles[tone], className)}>
      <span className={styles.dot} aria-hidden="true" />
      {titleCaseStatus(status)}
    </span>
  );
}
```

`components/ui/status-pill.module.css`
```css
.pill { display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; white-space: nowrap; }
.dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.positive { background: rgba(16, 199, 154, 0.14); color: #0b6e55; }
.pending { background: rgba(214, 163, 40, 0.16); color: #6b4f0a; }
.neutral { background: rgba(20, 48, 42, 0.08); color: var(--ll-ink); }
.negative { background: rgba(196, 64, 52, 0.12); color: #8c2a20; }
```

`components/ui/index.ts`
```ts
export { Avatar } from "./avatar";
export { Button, ButtonLink, buttonClass, type ButtonSize, type ButtonVariant } from "./button";
export { Card } from "./card";
export { cx } from "./cx";
export { DataTable, tableStyles } from "./data-table";
export { EmptyState } from "./empty-state";
export { Eyebrow } from "./eyebrow";
export { Checkbox, Field, FieldGrid, Input, Select, Textarea } from "./field";
export { Highlight } from "./highlight";
export { Modal } from "./modal";
export { Notice } from "./notice";
export { PageHeader } from "./page-header";
export { Reveal, useInView } from "./reveal";
export { StatRow, StatTile } from "./stat-tile";
```

`app/dev/kit/page.tsx` (dev fixture; the client island holds the modal state)
```tsx
import { notFound } from "next/navigation";

import { KitDemo } from "./kit-demo";

export default function KitPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <KitDemo />;
}
```

`app/dev/kit/kit-demo.tsx`
```tsx
"use client";

import { useState } from "react";

import { StatusPill } from "@/components/status-pill";
import {
  Avatar, Button, ButtonLink, Card, DataTable, EmptyState, Eyebrow, Field, FieldGrid,
  Highlight, Input, Modal, Notice, PageHeader, Reveal, Select, StatRow, StatTile, Textarea,
} from "@/components/ui";

const LONG = "Ultra-low-temperature freezer with redundant compressor and an extraordinarily long model name that should wrap";

export function KitDemo() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ maxWidth: 1240, margin: "0 auto", padding: "120px clamp(20px,5vw,72px)", display: "grid", gap: 40 }}>
      <PageHeader variant="public" eyebrow="Kit" title={<>Design <Highlight>kit</Highlight></>} lead={LONG} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <Button>Primary action</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ink" arrow>Ink</Button>
        <Button variant="danger">Danger</Button>
        <ButtonLink href="/" variant="ghost">Ghost link</ButtonLink>
        <Button onClick={() => setOpen(true)}>Open modal</Button>
      </div>
      <Eyebrow variant="badge">Yale-founded · Nonprofit</Eyebrow>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {["live", "admin_review", "matched_reserved", "rejected_cancelled"].map((s) => <StatusPill key={s} status={s} />)}
      </div>
      <StatRow>
        <StatTile value="12" label="Pending approvals" sublabel="Across institutions" />
        <StatTile tone="ink" value="$40K" label="Total donations" />
        <StatTile tone="mint" value="3" label="Deliveries" />
      </StatRow>
      <Card><Avatar initials="DL" /> <strong>{LONG}</strong></Card>
      <FieldGrid>
        <Field label="Title" htmlFor="kit-title"><Input id="kit-title" /></Field>
        <Field label="Required" htmlFor="kit-error-input" error="This field is required."><Input id="kit-error-input" /></Field>
        <Field label="Category" htmlFor="kit-select"><Select id="kit-select"><option>Microscopy</option></Select></Field>
        <Field label="Notes" htmlFor="kit-notes" span="full"><Textarea id="kit-notes" /></Field>
      </FieldGrid>
      <Notice tone="warning">Editing material fields sends this listing back to review.</Notice>
      <DataTable head={["Equipment", "Status", "Action"]} isEmpty empty={<EmptyState variant="empty" title="Nothing here yet" />} />
      <div style={{ height: "120vh" }} />
      <Reveal data-testid="kit-reveal-below-fold"><Card tone="mint">Revealed content</Card></Reveal>
      <Modal open={open} onClose={() => setOpen(false)} title="Kit modal" eyebrow="Review">
        <p>{LONG}</p>
      </Modal>
    </div>
  );
}
```

- [ ] **Step 4: Run the kit spec**

Run: `cd e2e && npx playwright test -c redesign.config.ts kit foundation home-regression`
Expected: all PASS on desktop and mobile. Then check contrast of each status tone (text vs. its background over white) with any WCAG calculator; each must be ≥ 4.5:1 — darken only the text color if not.

- [ ] **Step 5: Verify + commit**

```bash
cd frontend && npx tsc --noEmit && npx next build 2>&1 | tail -3
git add frontend/components/ui frontend/components/status-pill.tsx frontend/app/dev e2e/redesign/kit.spec.ts
git commit -m "feat: add homepage-system UI kit and dev kit fixture"
```

---

### Task 3: App chrome — AppNav, AppFooter, notifications

**Files:**
- Create: `frontend/components/chrome/nav-model.ts`, `app-nav.tsx`, `app-nav-client.tsx`, `app-nav.module.css`, `app-footer.tsx`, `app-footer.module.css`; `frontend/components/notification-center.module.css`; `e2e/redesign/nav.spec.ts`, `e2e/redesign/nav-authed.spec.ts`
- Modify: `frontend/app/layout.tsx`, `frontend/components/notification-center.tsx` (classNames only; logic untouched), `frontend/components/home-page-redesign.tsx` (remove `<header>` nav + footer markup; keep hash-scroll for in-page links inside its own root), `frontend/components/home-page-redesign.module.css` (move `.nav*`, `.logoImage`, `.footer*` rules to chrome modules verbatim), `frontend/app/globals.css` (delete `.site-header*`, `.site-nav*`, `.brand-mark*`, `.header-profile-*`, `.footer*`, `.notification-*`, `body.app-body:has(.home-redesign-page) .site-header` and `.footer` rules)
- Delete: `frontend/components/site-header.tsx`, `frontend/components/header-auth-actions.tsx`

**Interfaces:**
- Consumes: `getCurrentProfile()` from `@/lib/api`; `NotificationBell` from `@/components/notification-center`; `createSupabaseBrowserClient`.
- Produces:
```ts
type NavLink = { href: string; label: string };
type NavModel = {
  brandHref: string;
  links: NavLink[];                 // role links (excluding hash links)
  homeLinks: NavLink[];             // [{href:"#mission",label:"Mission"},{href:"#team",label:"Team"}]
  profile: null | { initial: string; name: string; email: string; roleLabel: string; institution: string; dashboardHref: string };
};
buildNavModel(profile: AuthenticatedUser | null): NavModel   // nav-model.ts, pure
<AppNav />            // server component, rendered once in layout
<AppFooter />
```

- [ ] **Step 1: Write the failing specs**

`e2e/redesign/nav.spec.ts`
```ts
import { expect, test } from "@playwright/test";

import { assertNoHorizontalScroll } from "./helpers";

test("signed-out homepage nav shows Mission, Team, Sign in", async ({ page, isMobile }) => {
  test.skip(isMobile, "mobile covered below");
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Primary" });
  await expect(nav.getByRole("link", { name: "Mission" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Team" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/auth");
});

test("signed-out nav off the homepage shows Home, Donate, Sign in", async ({ page, isMobile }) => {
  test.skip(isMobile, "mobile covered below");
  await page.goto("/listings");
  const nav = page.getByRole("navigation", { name: "Primary" });
  await expect(nav.getByRole("link", { name: "Home" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Donate" })).toHaveAttribute("href", "/auth");
  await expect(nav.getByRole("link", { name: "Browse" })).toHaveCount(0);
});

test("mobile menu opens from keyboard and closes on Escape", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile only");
  await page.goto("/listings");
  const toggle = page.getByRole("button", { name: "Menu" });
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("link", { name: "Donate" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toBeFocused();
  await assertNoHorizontalScroll(page);
});

test("footer is the homepage footer", async ({ page }) => {
  await page.goto("/listings");
  await expect(page.getByText("A Yale nonprofit · New Haven, CT · Founded 2024")).toBeVisible();
});
```

`e2e/redesign/nav-authed.spec.ts`
```ts
import { expect, test } from "@playwright/test";

import { loginAs } from "../helpers/auth";
import { backendUp } from "./helpers";

test.beforeEach(async () => {
  test.skip(!(await backendUp()), "backend not running (make back) — authed checks skipped");
});

test("signed-in donor on / sees role links, bell, avatar menu", async ({ page, isMobile }) => {
  test.skip(isMobile, "desktop layout");
  await loginAs(page, "donor");
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Primary" });
  await expect(nav.getByRole("link", { name: "Dashboard" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Sign in" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /notifications/i })).toBeVisible();
  const avatar = page.getByRole("button", { name: /account menu/i });
  await avatar.press("Enter");
  await expect(page.getByRole("menuitem", { name: "Log out" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(avatar).toBeFocused();
});

test("empty notification panel shows a designed empty state", async ({ page, isMobile }) => {
  test.skip(isMobile, "desktop layout");
  await loginAs(page, "recipient");
  await page.goto("/recipient");
  await page.getByRole("button", { name: /notifications/i }).click();
  const panel = page.getByRole("dialog", { name: /notifications/i });
  await expect(panel).toBeVisible();
  await expect(panel.locator("[data-empty], [data-has-items]")).toHaveCount(1);
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `cd e2e && npx playwright test -c redesign.config.ts nav`
Expected: FAIL — no `navigation` named "Primary"; footer text missing on `/listings`.

- [ ] **Step 3: Implement `nav-model.ts`** (moves `getNavItems`/`getDashboardHref`/`getRoleLabel`/`getProfileInitial` out of `site-header.tsx` unchanged in behavior)

```ts
import type { AuthenticatedUser, Role } from "@/lib/types";

export type NavLink = { href: string; label: string };
export type NavModel = {
  brandHref: string;
  links: NavLink[];
  homeLinks: NavLink[];
  profile: null | {
    initial: string;
    name: string;
    email: string;
    roleLabel: string;
    institution: string;
    dashboardHref: string;
  };
};

function dashboardHref(role?: Role) {
  if (role === "donor_lab") return "/donor";
  if (role === "recipient_institution") return "/recipient";
  if (role === "admin") return "/admin";
  return "/auth";
}

function roleLabel(role?: Role) {
  if (role === "donor_lab") return "Donor dashboard";
  if (role === "recipient_institution") return "Recipient dashboard";
  if (role === "admin") return "Admin dashboard";
  return "LabLink account";
}

function links(profile: AuthenticatedUser | null): NavLink[] {
  const role = profile?.user.role;
  if (role === "admin") return [];
  const items: NavLink[] = [{ href: "/", label: "Home" }];
  if (profile) items.push({ href: "/listings", label: "Browse" });
  const verifiedDonor =
    role === "donor_lab" &&
    profile?.user.account_status === "verified" &&
    profile?.institution.verification_status === "verified";
  if (role === "donor_lab") {
    items.push({ href: verifiedDonor ? "/donor/list-equipment" : "/donor", label: "Donate" });
    items.push({ href: "/donor/request-board", label: "Request Board" });
    items.push({ href: "/donor", label: "Dashboard" });
  } else if (role === "recipient_institution") {
    items.push({ href: "/recipient", label: "Dashboard" });
  } else {
    items.push({ href: "/auth", label: "Donate" });
  }
  return items;
}

export function buildNavModel(profile: AuthenticatedUser | null): NavModel {
  const role = profile?.user.role;
  return {
    brandHref: role === "admin" ? "/admin" : "/",
    links: links(profile),
    homeLinks: [
      { href: "#mission", label: "Mission" },
      { href: "#team", label: "Team" },
    ],
    profile: profile
      ? {
          initial: profile.user.full_name?.trim().charAt(0).toUpperCase() || "U",
          name: profile.user.full_name,
          email: profile.user.email,
          roleLabel: roleLabel(role),
          institution: profile.institution.name,
          dashboardHref: dashboardHref(role),
        }
      : null,
  };
}
```

- [ ] **Step 4: Implement `app-nav.tsx` (server) and `app-nav-client.tsx`**

```tsx
// app-nav.tsx
import { getCurrentProfile } from "@/lib/api";

import { AppNavClient } from "./app-nav-client";
import { buildNavModel } from "./nav-model";

export async function AppNav() {
  let profile = null;
  try {
    profile = await getCurrentProfile();
  } catch {
    profile = null;
  }
  return <AppNavClient model={buildNavModel(profile)} />;
}
```

```tsx
// app-nav-client.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { NotificationBell } from "@/components/notification-center";
import { cx } from "@/components/ui/cx";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

import styles from "./app-nav.module.css";
import type { NavLink, NavModel } from "./nav-model";

function useEscape(active: boolean, onEscape: () => void) {
  useEffect(() => {
    if (!active) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onEscape();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [active, onEscape]);
}

function scrollToHash(event: React.MouseEvent<HTMLAnchorElement>, href: string) {
  const target = document.querySelector(href);
  if (!target) return;
  event.preventDefault();
  window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" });
}

export function AppNavClient({ model }: { model: NavModel }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const signedOutHome = isHome && !model.profile;
  const items: NavLink[] = signedOutHome ? model.homeLinks : model.links;
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const accountButton = useRef<HTMLButtonElement>(null);

  useEffect(() => setMenuOpen(false), [pathname]);
  useEscape(menuOpen, () => {
    setMenuOpen(false);
    menuButton.current?.focus();
  });
  useEscape(accountOpen, () => {
    setAccountOpen(false);
    accountButton.current?.focus();
  });

  async function signOut() {
    await createSupabaseBrowserClient().auth.signOut({ scope: "local" });
    window.location.replace("/");
  }

  const linkList = items.map((item) => {
    const active = !item.href.startsWith("#") && (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href));
    return (
      <a
        key={`${item.label}-${item.href}`}
        href={item.href}
        className={cx(styles.navLink, active && styles.navLinkActive)}
        aria-current={active ? "page" : undefined}
        onClick={item.href.startsWith("#") ? (event) => scrollToHash(event, item.href) : undefined}
      >
        {item.label}
      </a>
    );
  });

  return (
    <header className={cx(styles.nav, isHome && styles.navHome)}>
      <Link href={model.brandHref} className={styles.navLogo} aria-label="LabLink home">
        <img src="/lablink-header-logo.png" alt="LabLink" className={styles.logoImage} />
      </Link>
      <nav aria-label="Primary" className={styles.navPill}>
        <div className={styles.desktopLinks}>{linkList}</div>
        {model.profile ? (
          <>
            <NotificationBell />
            <div className={styles.account}>
              <button
                ref={accountButton}
                type="button"
                className={styles.avatarButton}
                aria-label="Account menu"
                aria-haspopup="menu"
                aria-expanded={accountOpen}
                onClick={() => setAccountOpen((open) => !open)}
              >
                {model.profile.initial}
              </button>
              {accountOpen ? (
                <div role="menu" className={styles.accountMenu}>
                  <div className={styles.accountIdentity}>
                    <strong>{model.profile.name}</strong>
                    <span>{model.profile.roleLabel}</span>
                    <span>{model.profile.institution}</span>
                    <span className={styles.accountEmail}>{model.profile.email}</span>
                  </div>
                  <Link role="menuitem" href={model.profile.dashboardHref} className={styles.accountItem}>
                    Dashboard
                  </Link>
                  <button role="menuitem" type="button" className={styles.accountItem} onClick={signOut}>
                    Log out
                  </button>
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <Link href="/auth" className={styles.navSignIn}>
            Sign in
          </Link>
        )}
        {items.length > 0 ? (
          <button
            ref={menuButton}
            type="button"
            className={styles.menuButton}
            aria-label="Menu"
            aria-expanded={menuOpen}
            aria-controls="app-nav-sheet"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span aria-hidden="true" />
          </button>
        ) : null}
      </nav>
      {menuOpen ? (
        <div id="app-nav-sheet" className={styles.sheet}>
          {linkList}
        </div>
      ) : null}
    </header>
  );
}
```

Close the account menu on outside click: add a `pointerdown` document listener while `accountOpen` that closes when `event.target` is outside `.account` (use a ref on the wrapper).

- [ ] **Step 5: `app-nav.module.css`** — copy `.nav`, `.navLogo`, `.logoImage`, `.navPill`, `.navLink`, `.navLink:hover`, `.navSignIn`, `.navSignIn:hover` **verbatim** from `home-page-redesign.module.css`, but move `animation: fadeIn 1s 0.3s both;` from `.nav` into `.navHome` (with its `@keyframes fadeIn`). Then add:

```css
.desktopLinks { display: contents; }
.navLinkActive { background: rgba(255, 255, 255, 0.1); }
.account { position: relative; }
.avatarButton { width: 34px; height: 34px; border-radius: 50%; border: 0; background: var(--ll-mint); color: var(--ll-ink); font-family: var(--ll-display); font-weight: 700; cursor: pointer; }
.avatarButton:focus-visible, .menuButton:focus-visible, .navLink:focus-visible, .navSignIn:focus-visible { outline: 2px solid var(--ll-mint); outline-offset: 3px; }
.accountMenu { position: absolute; right: 0; top: calc(100% + 12px); width: min(300px, calc(100vw - 32px)); padding: 16px; border-radius: 20px; background: rgba(20, 48, 42, 0.96); backdrop-filter: blur(12px); color: #ffffff; box-shadow: var(--ll-shadow-modal); display: grid; gap: 4px; }
.accountIdentity { display: grid; gap: 2px; padding: 4px 8px 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); margin-bottom: 6px; font-size: 13px; color: rgba(255, 255, 255, 0.7); }
.accountIdentity strong { font-family: var(--ll-display); font-size: 18px; font-weight: 600; color: #ffffff; }
.accountEmail { overflow-wrap: anywhere; }
.accountItem { display: block; width: 100%; padding: 10px 12px; border: 0; border-radius: 12px; background: transparent; color: #ffffff; font: 600 14px var(--ll-body); text-align: left; cursor: pointer; }
.accountItem:hover, .accountItem:focus-visible { background: rgba(255, 255, 255, 0.1); color: var(--ll-mint); outline: none; }
.menuButton { display: none; width: 40px; height: 40px; border: 0; border-radius: 999px; background: transparent; cursor: pointer; position: relative; }
.menuButton span, .menuButton span::before, .menuButton span::after { position: absolute; left: 11px; width: 18px; height: 2px; background: #ffffff; content: ""; }
.menuButton span { top: 19px; }
.menuButton span::before { left: 0; top: -6px; }
.menuButton span::after { left: 0; top: 6px; }
.sheet { position: absolute; top: calc(100% - 6px); left: clamp(20px, 4vw, 48px); right: clamp(20px, 4vw, 48px); display: grid; gap: 4px; padding: 12px; border-radius: 24px; background: rgba(20, 48, 42, 0.96); backdrop-filter: blur(12px); }
.sheet .navLink { padding: 14px 16px; font-size: 15px; }
@media (max-width: 760px) {
  .desktopLinks { display: none; }
  .menuButton { display: inline-block; }
}
@media (min-width: 761px) {
  .sheet { display: none; }
}
```

The signed-out homepage must still render the exact export markup at ≥761px: logo pill, then link pill with Mission/Team/Sign in. At 390px the export shows the full pill (it fits); keep `.desktopLinks` visible on `/` when signed out by adding `.navHome .desktopLinks { display: contents; } .navHome .menuButton { display: none; }` **only when** `signedOutHome` (apply a `styles.navHomeSignedOut` class instead of `navHome` for that case and scope these two rules to it).

- [ ] **Step 6: AppFooter** — move the homepage footer markup + `.footer`, `.footerInner`, `.footerMeta`, `.footerNote`, `.logoImage` CSS verbatim into `app-footer.tsx`/`.module.css`; remove them from the homepage component/module.

- [ ] **Step 7: Wire the layout**

```tsx
// layout.tsx body
<body className="app-body">
  <AuthStateSync />
  <NotificationProvider>
    <AppNav />
    <main className="site-main">{children}</main>
    <AppFooter />
  </NotificationProvider>
</body>
```
In `globals.css` set `.site-main { padding-top: var(--ll-nav-offset); }` and keep `body.app-body:has(.home-redesign-page) .site-main { padding-top: 0; }`. Remove `body.app-body:has(.auth-screen-root) .site-header/.footer { display:none }` (auth now shows nav and footer — spec §5.2).

- [ ] **Step 8: Restyle notifications** — in `notification-center.tsx` replace each `notification-*` className with the matching module class (bell button: 34px circle, transparent, white icon; badge: mint circle with ink text; panel: `role="dialog"` `aria-label="Notifications"`, ink glass, 24px radius, width `min(380px, calc(100vw - 32px))`; item: 14px radius rows, unread = `rgba(16,199,154,.12)`; toast stack bottom-right, ink 16px-radius cards). Add `aria-label="Notifications"` to the bell button. Add `data-empty` to the empty element and `data-has-items` to the groups wrapper. Do not change polling, toast timing, or mark-viewed logic.

- [ ] **Step 9: Run specs**

Run: `cd e2e && npx playwright test -c redesign.config.ts`
Expected: nav/foundation/kit PASS; `home-regression` PASS (0 px) — if the homepage diff is non-zero, the moved nav/footer CSS was not copied verbatim; diff the rules. `nav-authed` PASS with backend up, SKIPPED otherwise (report which).

- [ ] **Step 10: Verify + commit**

```bash
cd frontend && npx tsc --noEmit && npx next build 2>&1 | tail -3
git rm frontend/components/site-header.tsx frontend/components/header-auth-actions.tsx
git add -A frontend/components/chrome frontend/components/notification-center.* frontend/components/home-page-redesign.* frontend/app/layout.tsx frontend/app/globals.css e2e/redesign/nav*.spec.ts
git commit -m "feat: replace site header with auth-aware floating nav and shared footer"
```

---

### Task 4: Auth — sign in and sign up

**Files:**
- Create: `frontend/components/auth/auth-split.tsx`, `auth-split.module.css`, `e2e/redesign/auth.spec.ts`
- Modify: `frontend/components/auth-shell.tsx` (render tree only; all state, Supabase calls, onboarding POST, redirects unchanged), `frontend/app/globals.css` (delete `.auth-screen-*`, `.auth-mode*`, `.auth-image*` blocks and their overrides at the end of the file)

**Interfaces:**
- Consumes: kit `Field`, `Input`, `Select`, `Textarea`, `Checkbox`, `Button`, `ButtonLink`, `Notice`, `Eyebrow`, `EmptyState`, `StatusPill`.
- Produces: `<AuthSplit aside={ReactNode} card={ReactNode} />` — two-column split (ink aside 24px + white card), single column < 900px with the aside shortened to its title block.

- [ ] **Step 1: Failing spec** — `e2e/redesign/auth.spec.ts`
```ts
import { expect, test } from "@playwright/test";

import { assertNoHorizontalScroll } from "./helpers";

for (const path of ["/auth", "/auth/sign-up"]) {
  test(`${path} uses the split layout and keeps the E2E contract`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("[data-auth-aside]")).toHaveCSS("background-color", "rgb(20, 48, 42)");
    await expect(page.locator("[data-auth-card]")).toHaveCSS("border-radius", "24px");
    await assertNoHorizontalScroll(page);
  });
}

test("sign-in contract selectors resolve", async ({ page }) => {
  await page.goto("/auth");
  await expect(page.locator("#sign-in-email")).toBeVisible();
  await expect(page.locator("#sign-in-password")).toBeVisible();
  const submit = page.locator("button.auth-screen-primary-button");
  await expect(submit).toHaveCSS("border-radius", "999px");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Welcome");
});

test("sign-up two-column rows collapse on mobile", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile only");
  await page.goto("/auth/sign-up");
  const password = await page.getByLabel(/^password/i).boundingBox();
  const confirm = await page.getByLabel(/confirm/i).boundingBox();
  expect(confirm!.y).toBeGreaterThan(password!.y);
});
```

- [ ] **Step 2: Run → FAIL** (`[data-auth-aside]` not found).

- [ ] **Step 3: Build `AuthSplit`**

```tsx
import type { ReactNode } from "react";

import styles from "./auth-split.module.css";

export function AuthSplit({ aside, card }: { aside: ReactNode; card: ReactNode }) {
  return (
    <section className={`auth-screen-root ${styles.page}`}>
      <div className={styles.frame}>
        <div data-auth-aside className={styles.aside}>
          <div className={styles.orbit} aria-hidden="true"><span className={styles.orbitDot} /></div>
          <div className={styles.orbitDashed} aria-hidden="true" />
          <div className={styles.asideContent}>{aside}</div>
        </div>
        <div data-auth-card className={styles.card}>{card}</div>
      </div>
    </section>
  );
}
```

```css
/* auth-split.module.css */
.page { padding: 24px var(--ll-gutter) clamp(64px, 8vw, 120px); }
.frame { max-width: var(--ll-container); margin: 0 auto; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 16px; align-items: stretch; }
.aside { position: relative; overflow: hidden; border-radius: 24px; background: var(--ll-ink); color: #ffffff; padding: clamp(32px, 4vw, 56px); display: flex; align-items: flex-end; min-height: 560px; }
.asideContent { position: relative; z-index: 1; }
.orbit { position: absolute; top: -18%; right: -22%; width: 520px; height: 520px; border-radius: 50%; border: 1px solid rgba(16, 199, 154, 0.35); animation: spin 40s linear infinite; }
.orbitDot { position: absolute; top: 50%; left: -6px; width: 12px; height: 12px; border-radius: 50%; background: var(--ll-mint); box-shadow: 0 0 24px var(--ll-mint); }
.orbitDashed { position: absolute; top: 4%; right: 2%; width: 300px; height: 300px; border-radius: 50%; border: 1px dashed rgba(16, 199, 154, 0.25); animation: spin 50s linear infinite reverse; }
.card { border-radius: 24px; background: var(--ll-surface); border: 1px solid var(--ll-line); padding: clamp(28px, 4vw, 56px); }
@keyframes spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .orbit, .orbitDashed { animation: none; } }
@media (max-width: 900px) {
  .frame { grid-template-columns: 1fr; }
  .aside { min-height: 0; }
}
```

- [ ] **Step 4: Rebuild `auth-shell.tsx` render tree on the kit**

Aside content (sign in):
```tsx
<>
  <Eyebrow variant="badge">Yale-founded · Student-run · Nonprofit</Eyebrow>
  <h2 className={styles.asideTitle}>Welcome <em>back.</em></h2>
  <p className={styles.asideLead}>Manage your laboratory assets and donate critical equipment to research institutions worldwide.</p>
</>
```
Aside content (sign up): eyebrow badge, `<h2>Join the <em>LabLink network.</em></h2>`, then the two existing feature items rendered as stacked mini cards (`border-radius: 20px; background: rgba(255,255,255,.06); padding: 20px;` step label `01 · Verify` / `02 · Match` in mint uppercase, existing h3/p copy).

Add to `auth-split.module.css`:
```css
.asideTitle { margin: 24px 0 0; font-family: var(--ll-display); font-weight: 600; font-size: clamp(40px, 5vw, 72px); line-height: 1; letter-spacing: -0.02em; }
.asideTitle em { font-style: italic; font-weight: 500; color: var(--ll-mint); }
.asideLead { margin: 18px 0 0; max-width: 440px; font-size: 17px; line-height: 1.65; color: rgba(255, 255, 255, 0.72); }
.cardTitle { margin: 0; font-family: var(--ll-display); font-weight: 600; font-size: clamp(30px, 3vw, 40px); color: var(--ll-ink); }
.cardLead { margin: 10px 0 28px; font-size: 16px; color: var(--ll-muted); }
.form { display: grid; gap: 18px; }
.switch { margin-top: 28px; padding-top: 24px; border-top: 1px solid var(--ll-line); text-align: center; font-size: 15px; color: var(--ll-muted); }
```

Card content: `<h1 className={styles.cardTitle}>` (existing "Welcome Back"/"Create your account" copy), lead, `form.${styles.form}` with `Field`/`Input` for every existing field **keeping each existing `id`, `name`, `type`, `autoComplete`, `required` attribute and onChange handler**; sign-in "Forgot password?" becomes a `ButtonLink variant="ghost" size="sm"` in the password field's `hint` slot; "Remember me" is `Checkbox`; submit is:
```tsx
<Button type="submit" size="lg" block arrow className="auth-screen-primary-button" disabled={isPending}>
  {isPending ? "Signing in…" : "Sign In"}
</Button>
```
(sign-up: same pattern, label "Create Account"). Sign-up rows: wrap Password+Confirm and Type+Location in `<FieldGrid>` (auto-fit collapses on mobile). Notices → `<Notice tone="success|error">`. Switch link → `ButtonLink variant="secondary"`. Signed-in state on sign-up → `EmptyState variant="gate"` containing the StatusPill, email, role text, and existing Sign out / View dashboard actions as pills. Remove `footer.auth-screen-footer` (placeholder links) — the global footer now renders.

- [ ] **Step 5: Delete legacy CSS** — remove every `.auth-screen-*`, `.auth-mode-*`, `.auth-image*` rule (base blocks ~2642–3036, plus any in the 1100px/760px media blocks and the override layer). Run `grep -n "auth-screen" frontend/app/globals.css` → only `auth-screen-root` usage in `:has()` selectors may remain; delete those too if unused.

- [ ] **Step 6: Run** `npx playwright test -c redesign.config.ts auth home-regression` → PASS. With backend up also run the original suite's login helper via `npx playwright test admin-institution-verification` (root config) → PASS (login still works).

- [ ] **Step 7: Screenshot review** — capture `/auth` and `/auth/sign-up` at both sizes (`npx playwright test -c redesign.config.ts auth --update-snapshots` is not used; take ad-hoc screenshots with `page.screenshot` in a scratch script) and compare to spec §6.1.

- [ ] **Step 8: Commit**
```bash
git add frontend/components/auth frontend/components/auth-shell.tsx frontend/app/globals.css e2e/redesign/auth.spec.ts
git commit -m "feat: redesign sign-in and sign-up on the homepage design system"
```

---

### Task 5: Password pages

**Files:**
- Modify: `frontend/components/forgot-password-shell.tsx`, `frontend/components/update-password-shell.tsx` (render trees only), `frontend/app/globals.css` (delete `.auth-layout*`, `.auth-panel`, `.auth-form`, `.auth-field*` **only if** Task 11/13 no longer need them — they do; leave `.auth-field*` until Task 14)
- Create: `frontend/components/auth/centered-card.tsx` + `.module.css`, `e2e/redesign/password.spec.ts`

**Interfaces:**
- Produces: `<CenteredCard>{children}</CenteredCard>` — max-width 520px white 24px card centered on canvas, single dashed orbit ring behind (decorative, `aria-hidden`).

- [ ] **Step 1: Failing spec**
```ts
import { expect, test } from "@playwright/test";

import { assertNoHorizontalScroll } from "./helpers";

for (const path of ["/auth/forgot-password", "/auth/update-password"]) {
  test(`${path} renders in a centered card`, async ({ page }) => {
    await page.goto(path);
    const card = page.locator("[data-centered-card]");
    await expect(card).toHaveCSS("border-radius", "24px");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await assertNoHorizontalScroll(page);
  });
}

test("forgot-password submit is a pill", async ({ page }) => {
  await page.goto("/auth/forgot-password");
  await expect(page.getByRole("button", { name: /send|reset/i })).toHaveCSS("border-radius", "999px");
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement**
```tsx
// centered-card.tsx
import type { ReactNode } from "react";

import styles from "./centered-card.module.css";

export function CenteredCard({ children }: { children: ReactNode }) {
  return (
    <section className={styles.page}>
      <div className={styles.ring} aria-hidden="true" />
      <div data-centered-card className={styles.card}>{children}</div>
    </section>
  );
}
```
```css
.page { position: relative; overflow: hidden; display: grid; place-items: center; padding: clamp(40px, 8vw, 120px) var(--ll-gutter); min-height: calc(100dvh - var(--ll-nav-offset) - 140px); }
.ring { position: absolute; left: 50%; top: 50%; width: min(900px, 120vw); aspect-ratio: 1; transform: translate(-50%, -50%); border-radius: 50%; border: 1px dashed rgba(16, 199, 154, 0.25); pointer-events: none; }
.card { position: relative; width: min(520px, 100%); padding: clamp(28px, 5vw, 48px); border-radius: 24px; background: var(--ll-surface); border: 1px solid var(--ll-line); display: grid; gap: 20px; }
```
Each shell: `<CenteredCard><PageHeader variant="operate" eyebrow="Password reset" title={…existing h1 copy…} lead={…existing p…} />` + form with `Field`/`Input` (keep ids/handlers) + `Button type="submit" block size="lg"` + `Notice`s + actions as `ButtonLink variant="secondary"` (Back to sign in) and `variant="ghost"` (Create account). Update-password invalid/checking states use `Notice tone="info|error"` inside the same card.

- [ ] **Step 4: Run** `npx playwright test -c redesign.config.ts password` → PASS.
- [ ] **Step 5: Commit** `git commit -m "feat: redesign password reset pages"` (add the touched files).

---

### Task 6: Catalog `/listings`

**Files:**
- Modify: `frontend/components/public-catalog-browser.tsx` (render tree; filtering/search/useDeferredValue logic unchanged), `frontend/app/listings/page.tsx` (empty state), `frontend/app/globals.css` (delete `.catalog-*`, `.listings-page-section`)
- Create: `frontend/components/catalog/catalog.module.css`, `frontend/components/catalog/category-filter.tsx`, `e2e/redesign/catalog.spec.ts`

**Interfaces:**
- Produces: `<CategoryFilter options: string[] selected: string[] onChange(next: string[]) />` — pill button opening a popover checkbox list; Esc/outside click closes; returns focus to the pill.

- [ ] **Step 1: Failing spec**
```ts
import { expect, test } from "@playwright/test";

import { assertNoHorizontalScroll } from "./helpers";

test("catalog header uses the public page header", async ({ page }) => {
  await page.goto("/listings");
  await expect(page.getByText("Equipment catalog", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Catalog");
  await assertNoHorizontalScroll(page);
});

test("empty catalog shows a designed empty state", async ({ page }) => {
  await page.goto("/listings");
  const cards = page.locator("[data-listing-card]");
  if ((await cards.count()) === 0) {
    await expect(page.locator("[data-catalog-empty]")).toBeVisible();
    await expect(page.locator("[data-catalog-empty] h2")).toBeVisible();
  }
});

test("category filter popover is keyboard operable", async ({ page }) => {
  await page.goto("/listings");
  const pill = page.getByRole("button", { name: /category/i });
  test.skip((await pill.count()) === 0, "no listings → no filter bar");
  await pill.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("group", { name: /category/i })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(pill).toBeFocused();
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement layout** (spec §6.3)

Page structure:
```tsx
<section className={styles.page}>
  <div className={styles.container}>
    <PageHeader
      variant="public"
      eyebrow="Equipment catalog"
      title={<>Inventory <Highlight>Catalog</Highlight></>}
      lead={`Browsing ${filtered.length} items`}
      actions={<label className={styles.search}><span className="sr-only">Search equipment</span><input type="search" … /></label>}
    />
    <div className={styles.filterBar} role="toolbar" aria-label="Filters">
      <div className={styles.pillRow}>{/* condition pills: "All" + each condition; active pill = ink bg, white text */}</div>
      <CategoryFilter options={categories} selected={selectedCategories} onChange={setSelectedCategories} />
      <Select aria-label="Location" …>{/* existing location options */}</Select>
    </div>
    <div className={styles.grid}>
      {filtered.map((listing, index) => (
        <Reveal as="div" key={listing.id} delay={(index % 4) * 0.06}>
          <article data-listing-card className={styles.card}>…</article>
        </Reveal>
      ))}
      <Card tone="mint" className={styles.impact}>{/* existing Impact Note copy */}</Card>
    </div>
    {filtered.length === 0 ? <EmptyState variant="empty" title="No equipment matches these filters" … /> : null}
  </div>
</section>
```

Card markup:
```tsx
<article data-listing-card className={styles.card}>
  <Link href={`/listings/${listing.id}`} className={styles.media}>
    {photo ? <Image src={photo} alt={listing.title} fill sizes="(max-width: 760px) 100vw, 33vw" className={styles.image} /> : <span className={styles.mediaEmpty}>No photo</span>}
    <span className={styles.statusCaption}><StatusPill status={listing.status} /></span>
  </Link>
  <div className={styles.body}>
    <div className={styles.headingRow}><h3 className={styles.title}>{listing.title}</h3><span className={styles.condition}>{conditionLabel}</span></div>
    <p className={styles.description}>{listing.description}</p>
    <div className={styles.meta}>{category} · {location} · {posted}</div>
  </div>
  <div className={styles.footer}>
    <span>{requestLabel}</span>
    <ButtonLink href={`/listings/${listing.id}`} variant="ink" size="sm" arrow>View</ButtonLink>
  </div>
</article>
```

`catalog.module.css` key rules (write all of them):
```css
.page { padding: 24px 0 clamp(90px, 11vw, 160px); }
.container { max-width: var(--ll-container); margin: 0 auto; padding: 0 var(--ll-gutter); }
.search input { width: min(360px, 100%); min-height: 48px; padding: 12px 20px; border-radius: 999px; border: 1px solid var(--ll-line-strong); background: var(--ll-surface); font: 16px var(--ll-body); }
.filterBar { position: sticky; top: var(--ll-nav-offset); z-index: 5; display: flex; gap: 12px; align-items: center; margin-top: 40px; padding: 10px; border-radius: 999px; background: rgba(238, 244, 241, 0.85); backdrop-filter: blur(12px); border: 1px solid var(--ll-line); overflow-x: auto; }
.pillRow { display: flex; gap: 6px; flex: none; }
.pill { min-height: 40px; padding: 8px 16px; border-radius: 999px; border: 1px solid var(--ll-line-strong); background: var(--ll-surface); font: 600 14px var(--ll-body); color: var(--ll-ink); cursor: pointer; white-space: nowrap; }
.pillActive { background: var(--ll-ink); border-color: var(--ll-ink); color: #ffffff; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; margin-top: 32px; }
.card { display: flex; flex-direction: column; height: 100%; border-radius: 24px; background: var(--ll-surface); border: 1px solid var(--ll-line); overflow: hidden; transition: transform 0.3s, box-shadow 0.3s; }
.card:hover { transform: translateY(-6px); box-shadow: var(--ll-shadow-hover); }
.media { position: relative; display: block; aspect-ratio: 4 / 3; background: var(--ll-canvas); }
.image { object-fit: cover; }
.mediaEmpty { position: absolute; inset: 0; display: grid; place-items: center; color: var(--ll-muted); font-size: 13px; }
.statusCaption { position: absolute; left: 14px; bottom: 14px; padding: 4px; border-radius: 999px; background: rgba(20, 48, 42, 0.85); backdrop-filter: blur(8px); }
.body { padding: 22px 22px 0; display: grid; gap: 10px; flex: 1; }
.headingRow { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
.title { margin: 0; font-family: var(--ll-display); font-size: 22px; font-weight: 600; line-height: 1.2; color: var(--ll-ink); overflow-wrap: anywhere; }
.condition { flex: none; padding: 4px 10px; border-radius: 10px; background: var(--ll-canvas); font-size: 12px; font-weight: 700; color: var(--ll-ink); }
.description { margin: 0; font-size: 14.5px; line-height: 1.6; color: var(--ll-muted); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.meta { font-size: 13px; color: var(--ll-muted); }
.footer { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 18px 22px 22px; font-size: 13px; font-weight: 600; color: var(--ll-ink); }
.impact { align-self: stretch; }
@media (prefers-reduced-motion: reduce) { .card:hover { transform: none; } }
@media (max-width: 760px) { .filterBar { border-radius: 20px; } }
```

`category-filter.tsx`: a `Button variant="secondary" size="sm"` labelled `Category{selected.length ? ` (${selected.length})` : ""}` with `aria-expanded`, `aria-controls`; popover `<div role="group" aria-label="Category">` with a `Checkbox` per option; Esc and outside-pointerdown close and refocus the button.

`app/listings/page.tsx` empty case → `<EmptyState variant="gate" … data-catalog-empty>` (add a `data-catalog-empty` wrapper div) with the existing "No listings yet" title and copy.

- [ ] **Step 4: Delete `.catalog-*` and `.listings-page-section` rules from `globals.css`** (base ~1569–1975, media blocks, override layer).
- [ ] **Step 5: Run** `npx playwright test -c redesign.config.ts catalog home-regression` → PASS. With backend up and at least one live listing, also confirm `[data-listing-card]` count > 0 and the popover test runs (not skipped).
- [ ] **Step 6: Commit** `git commit -m "feat: redesign equipment catalog"` (touched files + spec).

---

### Task 7: Listing detail `/listings/[listingId]`

**Files:**
- Modify: `frontend/app/listings/[listingId]/page.tsx` (render tree; data fetch, role logic, `notFound()` unchanged), `frontend/components/listing-request-button.tsx`, `frontend/components/recipient-save-listing-button.tsx` (buttons → kit; toast → module class), `frontend/app/globals.css` (delete `.listing-detail-*`, `.listing-save-*`, `.save-listing-*`, `.details-meta`, `.detail-sidebar`)
- Create: `frontend/components/listing-detail/listing-detail.module.css`, `e2e/redesign/listing-detail.spec.ts`

- [ ] **Step 1: Failing spec**
```ts
import { expect, test } from "@playwright/test";

import { assertNoHorizontalScroll, backendUp } from "./helpers";

test("listing detail hero and fact tiles", async ({ page }) => {
  test.skip(!(await backendUp()), "needs backend with a live listing");
  await page.goto("/listings");
  const first = page.locator("[data-listing-card] a").first();
  test.skip((await first.count()) === 0, "no live listings");
  await first.click();
  await expect(page.locator("[data-detail-media]")).toHaveCSS("border-radius", "24px");
  await expect(page.getByRole("heading", { name: "Technical overview" })).toBeVisible();
  await expect(page.locator("[data-fact-tile]")).toHaveCount(6);
  await assertNoHorizontalScroll(page);
});

test("unknown listing returns not found", async ({ page }) => {
  const response = await page.goto("/listings/00000000-0000-0000-0000-000000000000");
  expect(response?.status()).toBe(404);
});
```

- [ ] **Step 2: Run → FAIL** (or SKIP without backend — then the 404 test must still PASS before and after; record that the hero test needs a backend run before merging).

- [ ] **Step 3: Implement** (spec §6.4)
```tsx
<section className={styles.page}>
  <div className={styles.container}>
    <nav aria-label="Breadcrumb" className={styles.crumbs}>…Equipment / {category} / {title}…</nav>
    <div className={styles.hero}>
      <div className={styles.mediaWrap}>
        <div data-detail-media className={styles.media}>
          {/* image or empty */}
          <span className={styles.chip}>Verified donor</span>
        </div>
        <div className={styles.floatBadge}>
          <div className={styles.floatValue}>{listing.request_count}</div>
          <div className={styles.floatLabel}>active requests</div>
        </div>
      </div>
      <div className={styles.copy}>
        <div className={styles.statusRow}><StatusPill status={listing.status} /><Eyebrow as="span">{category}</Eyebrow></div>
        <h1 className={styles.title}>{listing.title}</h1>
        <div className={styles.donorRow}><Avatar initials={donorInitials} /><span>Donated by <strong>{donorName}</strong></span></div>
        <p className={styles.description}>{listing.description}</p>
        <div className={styles.actions}>{/* existing action-stack branches, buttons via kit */}</div>
      </div>
    </div>
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Technical overview</h2>
      <div className={styles.facts}>{facts.map((f) => <div data-fact-tile key={f.label} className={styles.fact}><div className={styles.factLabel}>{f.label}</div><div className={styles.factValue}>{f.value}</div></div>)}</div>
    </section>
    <div className={styles.context}>
      <Card><h2 className={styles.sectionTitle}>About this item</h2>…</Card>
      <Card tone="ink"><h2>Fulfillment details</h2><dl className={styles.dl}>…</dl></Card>
      <Card><h2>Donor institution</h2><dl className={styles.dl}>…</dl></Card>
    </div>
  </div>
</section>
```
The "active requests" float badge is **[new copy]** derived from existing `request_count`; hide it when the viewer is not a donor/admin **and** count is 0 (show only when > 0).
CSS: `.hero` = `grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 40px; align-items: center`; `.media` = `aspect-ratio: 4/5; border-radius: 24px; overflow: hidden; box-shadow: 0 40px 80px -30px rgba(20,48,42,.45)`; `.floatBadge` copies homepage `.heroFloat` (white, 14px radius, `top:-22px; left:-22px`, float animation off under reduced motion, `left: 12px; top: 12px` under 760px); `.title` Playfair 600 `clamp(36px,4.6vw,64px)`; `.facts` `repeat(auto-fit,minmax(180px,1fr))` gap 16px, each `.fact` white 16px radius padding 20px, label eyebrow, value Playfair 22px; `.context` `repeat(auto-fit,minmax(300px,1fr))` gap 16px; `.dl` grid `max-content 1fr` gap `10px 20px`, dt muted 13px uppercase, dd 15px.
`ListingRequestButton`: Request → `Button size="lg" arrow`, Requested → `Button variant="ink" disabled`, Cancel → `Button variant="secondary"`; error → `Notice tone="error"`. `RecipientSaveListingButton variant="full"`: `Button variant="secondary"` with heart SVG; toast uses the notification toast style from Task 3 (`notification-center.module.css` export `toast`).

- [ ] **Step 4: Delete legacy CSS**, run spec (with backend), commit `feat: redesign listing detail page`.

---

### Task 8: Dashboard shell (shared rail) + gate screens

**Files:**
- Create: `frontend/components/dashboard/dashboard-shell.tsx`, `dashboard-shell.module.css`, `dashboard-icons.tsx`, `e2e/redesign/dashboard-shell.spec.ts`
- Modify: `frontend/components/operations-dashboard-ui.tsx` (`OperationsHeader` → wraps `PageHeader operate`; `OperationsMetricGrid` → `StatRow`/`StatTile` cycling white/ink/mint; `OperationsTableSection` → section title + `DataTable`), `frontend/components/donor-dashboard-workspace.tsx`, `frontend/components/recipient-dashboard-workspace.tsx`, `frontend/components/admin-review-dashboard.tsx` (swap inline sidebar markup for `DashboardShell`; sections' content untouched in this task), gate branches in `frontend/app/donor/page.tsx`, `frontend/app/recipient/page.tsx`, `frontend/app/admin/page.tsx`, `frontend/app/donor/list-equipment/page.tsx`, `frontend/app/donor/listings/[listingId]/edit/page.tsx`, `frontend/app/donor/request-board/page.tsx` (→ `EmptyState variant="gate"`), `frontend/app/globals.css` (delete `.admin-ops-*`, `.ops-header*`, `.ops-metric-*`, `.admin-page-*`, `.empty-state`, `.auth-state-card`, `.page-actions`)
- Delete: `frontend/components/dashboard-sidebar-shell.tsx`

**Interfaces:**
- Produces:
```ts
type DashboardSection = { id: string; title: string; description?: string; count?: number; icon: DashboardIconName; content: ReactNode; action?: ReactNode };
type DashboardIconName = "shield" | "listings" | "competition" | "requests" | "saved" | "board" | "duplicates";
<DashboardShell workspaceLabel={string} header={ReactNode} sections={DashboardSection[]} />
```
Same props shape the old `DashboardSidebarShell` took (check its current prop names in `dashboard-sidebar-shell.tsx` and keep them identical if they differ, so callers change only the import). Keeps localStorage key `lablink-admin-sidebar-collapsed`, IntersectionObserver active section, and nav-click scroll (use `behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"`).

- [ ] **Step 1: Failing spec**
```ts
import { expect, test } from "@playwright/test";

import { loginAs } from "../helpers/auth";
import { assertNoHorizontalScroll, backendUp } from "./helpers";

test.beforeEach(async () => {
  test.skip(!(await backendUp()), "backend not running");
});

for (const [user, path] of [["donor", "/donor"], ["recipient", "/recipient"], ["admin", "/admin"]] as const) {
  test(`${path} uses the shared ink rail and stat tiles`, async ({ page, isMobile }) => {
    await loginAs(page, user);
    await page.goto(path);
    if (!isMobile) {
      await expect(page.locator("[data-dashboard-rail]")).toHaveCSS("background-color", "rgb(15, 38, 33)");
    } else {
      await expect(page.locator("[data-dashboard-tabs]")).toBeVisible();
    }
    await expect(page.locator("[data-stat-tile]").first()).toBeVisible();
    await assertNoHorizontalScroll(page);
  });
}

test("signed-out /donor shows a gate card", async ({ page }) => {
  await page.goto("/donor");
  await expect(page.locator("[data-gate]")).toBeVisible();
});
```
Add `data-stat-tile` to `StatTile`'s root and `data-gate` to `EmptyState variant="gate"` root (small edit to Task 2 files, part of this task).

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement `DashboardShell`** (spec §6.5)

Layout CSS:
```css
.shell { display: grid; grid-template-columns: 280px minmax(0, 1fr); gap: 24px; max-width: 1440px; margin: 0 auto; padding: 8px clamp(16px, 3vw, 32px) 96px; }
.collapsed { grid-template-columns: 88px minmax(0, 1fr); }
.rail { position: sticky; top: calc(var(--ll-nav-offset) + 8px); align-self: start; max-height: calc(100dvh - var(--ll-nav-offset) - 24px); overflow: auto; border-radius: 24px; background: var(--ll-ink-deep); color: #ffffff; padding: 20px 14px; }
.railHeader { display: flex; justify-content: space-between; align-items: center; padding: 4px 8px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
.workspace { font-size: 11px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--ll-mint); }
.toggle { width: 36px; height: 36px; border-radius: 50%; border: 1px solid rgba(255, 255, 255, 0.15); background: transparent; color: #ffffff; cursor: pointer; }
.navList { display: grid; gap: 4px; margin-top: 12px; }
.navItem { position: relative; display: grid; grid-template-columns: 36px 1fr auto; align-items: center; gap: 12px; padding: 10px; border: 0; border-radius: 16px; background: transparent; color: rgba(255, 255, 255, 0.78); font: 600 14px var(--ll-body); text-align: left; cursor: pointer; }
.navItem:hover, .navItem:focus-visible { background: rgba(255, 255, 255, 0.06); color: #ffffff; outline: none; }
.navItemActive { color: var(--ll-mint); background: rgba(16, 199, 154, 0.1); }
.navItemActive::before { content: ""; position: absolute; left: -14px; top: 12px; bottom: 12px; width: 3px; border-radius: 3px; background: var(--ll-mint); }
.navIcon { width: 36px; height: 36px; border-radius: 12px; display: grid; place-items: center; background: rgba(255, 255, 255, 0.06); }
.navCount { min-width: 28px; padding: 2px 8px; border-radius: 999px; background: rgba(255, 255, 255, 0.1); font-size: 12px; text-align: center; }
.navItemActive .navCount { background: var(--ll-mint); color: var(--ll-ink); }
.collapsed .navItem { grid-template-columns: 36px; justify-content: center; }
.collapsed .navLabel, .collapsed .navCount, .collapsed .workspace { display: none; }
.content { min-width: 0; display: grid; gap: clamp(32px, 4vw, 56px); }
.section { scroll-margin-top: calc(var(--ll-nav-offset) + 16px); display: grid; gap: 20px; }
.sectionHead { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; gap: 16px; }
.sectionTitle { margin: 0; font-family: var(--ll-display); font-size: clamp(24px, 2.4vw, 34px); font-weight: 600; color: var(--ll-ink); }
.sectionLead { margin: 6px 0 0; font-size: 15px; color: var(--ll-muted); }
.tabs { display: none; }
@media (max-width: 1100px) {
  .shell, .collapsed { grid-template-columns: minmax(0, 1fr); }
  .rail { display: none; }
  .tabs { display: flex; gap: 8px; overflow-x: auto; position: sticky; top: var(--ll-nav-offset); z-index: 4; padding: 8px; border-radius: 999px; background: rgba(15, 38, 33, 0.92); backdrop-filter: blur(12px); }
  .tab { flex: none; min-height: 40px; padding: 8px 16px; border: 0; border-radius: 999px; background: transparent; color: rgba(255, 255, 255, 0.8); font: 600 14px var(--ll-body); white-space: nowrap; }
  .tabActive { background: var(--ll-mint); color: var(--ll-ink); }
}
```
Rail root gets `data-dashboard-rail`; tabs root gets `data-dashboard-tabs`. Move the icon SVGs from `dashboard-sidebar-shell.tsx` and the admin component into `dashboard-icons.tsx` as `export function DashboardIcon({ name }: { name: DashboardIconName })`.

`OperationsMetricGrid` new implementation:
```tsx
const TONES = ["white", "ink", "mint"] as const;
export function OperationsMetricGrid({ metrics }: { metrics: { label: string; value: ReactNode; note?: string }[] }) {
  return (
    <StatRow>
      {metrics.map((metric, index) => (
        <StatTile key={metric.label} tone={TONES[index % 3]} value={metric.value} label={metric.label} sublabel={metric.note} />
      ))}
    </StatRow>
  );
}
```
(Keep the existing prop name if it differs from `metrics`; map existing fields to `value/label/sublabel`; drop the 2-letter text icons.)

Gate screens: replace every `.empty-state` + `.auth-state-card` + `.page-actions` combo in the listed pages with `<EmptyState variant="gate" eyebrow=… title=… lead=… icon={<Avatar initials="LL" size="lg" />} actions={…ButtonLinks…}>{optional status detail}</EmptyState>`, keeping all existing copy and hrefs.

- [ ] **Step 4: Delete legacy CSS** listed above; `grep -n "admin-ops\|ops-metric\|ops-header\|empty-state\|auth-state-card" frontend/app/globals.css` → no matches.
- [ ] **Step 5: Run** `npx playwright test -c redesign.config.ts dashboard-shell home-regression` (backend up) → PASS. Run the original suite `cd e2e && npx playwright test` → PASS (dashboards still navigable; `.ops-table-row-clickable` still present).
- [ ] **Step 6: Commit** `git commit -m "feat: shared ink-rail dashboard shell and gate screens"`.

---

### Task 9: Donor dashboard content + modals

**Files:**
- Modify: `frontend/components/donor-dashboard-workspace.tsx`, `frontend/components/donor-listing-actions.tsx`, `frontend/app/globals.css` (delete `.ops-table*`, `.ops-equipment-*`, `.ops-condition-badge`, `.ops-section-link-panel*`, `.review-modal-*` **only after Task 13** — leave modal CSS until then; delete `.donor-dashboard-cta`, `.list-row-actions`, `.list-row-action-error`)
- Create: `e2e/redesign/donor-dashboard.spec.ts`

- [ ] **Step 1: Failing spec**
```ts
import { expect, test } from "@playwright/test";

import { loginAs } from "../helpers/auth";
import { backendUp } from "./helpers";

test.beforeEach(async () => {
  test.skip(!(await backendUp()), "backend not running");
});

test("donor dashboard uses kit tables and pill CTA", async ({ page }) => {
  await loginAs(page, "donor");
  await page.goto("/donor");
  await expect(page.locator(".donor-dashboard-cta")).toHaveCSS("border-radius", "999px");
  await expect(page.locator("[data-request-board-panel]")).toHaveCSS("background-color", "rgb(16, 199, 154)");
  const rows = page.locator(".ops-table-row-clickable");
  if ((await rows.count()) > 0) {
    await rows.first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
  } else {
    await expect(page.getByText(/no incoming requests/i)).toBeVisible();
  }
});
```

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** (spec §6.6)
  - Header action: `<ButtonLink href="/donor/list-equipment" className="donor-dashboard-cta" arrow>Donate equipment</ButtonLink>` (keeps "+ Donate Equipment" copy → use existing string).
  - Submissions: `DataTable head={["Equipment","Status","Condition","Actions"]}` rows `<tr className={tableStyles.row}>`; equipment cell `tableStyles.titleCell` with `<img className={tableStyles.thumb}>` or `<span className={cx(tableStyles.thumb, tableStyles.thumbEmpty)}>—</span>`; condition chip (reuse catalog `.condition` style: copy rule into a `components/ui/chip.module.css` + `<Chip>` if used in ≥2 places — it is (catalog, donor, recipient, admin) → add `Chip` to the kit in this task with `export function Chip({ children }: { children: ReactNode })`).
  - Request Board panel: `<Card tone="mint" data-request-board-panel>` with Playfair line + `ButtonLink variant="ink" href="/donor/request-board" arrow>Browse request board</ButtonLink>`.
  - Incoming requests: `DataTable` rows `className={cx(tableStyles.row, tableStyles.rowClickable, "ops-table-row-clickable")}` with `tabIndex={0}` and `onKeyDown` Enter → open; `isEmpty` → `<EmptyState variant="empty" title="No incoming requests yet" />` **[new copy if current empty copy differs — reuse existing empty text if present]**.
  - `DonorIncomingRequestsModal` → `<Modal wide open … eyebrow=… title=…>` with request cards (`Card` 16px-radius inner variant: add `radius="inner"` prop? — no: use a local module class `.requestCard { border-radius: 16px; padding: 20px; background: var(--ll-canvas); }`).
  - `DonorListingActions`: Edit → `ButtonLink variant="secondary" size="sm"`; Remove → `Button variant="danger" size="sm"`; confirm → `<Modal open title=… footer={<><Button variant="secondary">Cancel</Button><Button variant="danger">Yes, remove listing</Button></>}>`; error → `Notice tone="error"`.
- [ ] **Step 4: Run spec + original E2E `donor-listing-lifecycle` (backend up)** → PASS.
- [ ] **Step 5: Commit** `git commit -m "feat: redesign donor dashboard content and modals"`.

---

### Task 10: Recipient dashboard + RequestBoardForm

**Files:**
- Modify: `frontend/components/recipient-dashboard-workspace.tsx`, `frontend/components/request-board-form.tsx` (fields → kit `Field`; keep all `#board-*` IDs, validation, submit logic), `frontend/app/globals.css` (no `form-*`/`board-post-form` rules exist — nothing to delete)
- Create: `e2e/redesign/recipient-dashboard.spec.ts`

- [ ] **Step 1: Failing spec**
```ts
import { expect, test } from "@playwright/test";

import { loginAs } from "../helpers/auth";
import { backendUp } from "./helpers";

test.beforeEach(async () => {
  test.skip(!(await backendUp()), "backend not running");
});

test("new request form is styled and keeps board ids", async ({ page }) => {
  await loginAs(page, "recipient");
  await page.goto("/recipient");
  await page.getByRole("button", { name: /new request/i }).click();
  for (const id of ["title", "category", "description", "intended-use", "quantity", "needed-by", "location"]) {
    await expect(page.locator(`#board-${id}`)).toBeVisible();
  }
  await expect(page.locator("#board-title")).toHaveCSS("border-radius", "12px");
  await expect(page.getByRole("button", { name: /submit request/i })).toHaveCSS("border-radius", "999px");
});
```
(Check the real IDs in `request-board-form.tsx` and the E2E list: `#board-title`, `#board-category`, `#board-description`, `#board-intended-use`, `#board-quantity`, `#board-needed-by`, `#board-location`.)

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** (spec §6.7): three `DataTable`s (Requested Items, Saved Listings, Request Board) with `Chip` for category/condition, `StatusPill`, `ButtonLink variant="secondary" size="sm"` "View listing" (disabled → `Button disabled`), Close → `Button variant="secondary" size="sm"`; "New request"/"Cancel" section action toggles an inline `Card` above the board table containing `RequestBoardForm`; form uses `FieldGrid` + `Field` + `Input/Select/Textarea`, submit `Button type="submit" size="lg"` labelled with existing "Submit Request" text, errors via `Field error` and `Notice tone="error"`.
- [ ] **Step 4: Run spec + original `recipient-request-board.spec.ts`** → PASS.
- [ ] **Step 5: Commit** `git commit -m "feat: redesign recipient dashboard and request board form"`.

---

### Task 11: Donor listing wizard (create + edit)

**Files:**
- Modify: `frontend/components/donor-listing-form.tsx` (render tree only; autosave, step validation, upload, PDF modal logic unchanged), `frontend/app/donor/listings/[listingId]/edit/page.tsx` (warning → `Notice tone="warning"`), `frontend/app/globals.css` (delete `.donor-form-*`, `.donor-compliance-*`, `.donor-document-*`, `.donor-draft-status*`, `.donor-header-link`, `.auth-field*`, `.auth-field-grid`, `.auth-field-span-full`)
- Create: `frontend/components/donor-form/donor-form.module.css`, `e2e/redesign/donor-wizard.spec.ts`

- [ ] **Step 1: Failing spec**
```ts
import { expect, test } from "@playwright/test";

import { loginAs } from "../helpers/auth";
import { assertNoHorizontalScroll, backendUp } from "./helpers";

test.beforeEach(async () => {
  test.skip(!(await backendUp()), "backend not running");
});

test("wizard keeps contract selectors and new step styling", async ({ page }) => {
  await loginAs(page, "donor");
  await page.goto("/donor/list-equipment");
  for (const id of ["title", "category", "condition", "quantity", "window", "working-status", "description"]) {
    await expect(page.locator(`#listing-${id}`)).toBeVisible();
  }
  await expect(page.locator("button.donor-form-primary-action")).toHaveCSS("border-radius", "999px");
  await expect(page.locator("[data-step-card]").first()).toHaveCSS("border-radius", "24px");
  await expect(page.locator("[data-step-pill][aria-current='step']")).toHaveCount(1);
  await assertNoHorizontalScroll(page);
});
```

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** (spec §6.8)
  - Header: draft status as a pill (`idle` neutral, `saving` pending tone with pulsing dot, `saved` positive with ✓, `error` negative with !) — reuse `status-pill.module.css` tone classes; title Playfair `clamp(32px,3.6vw,52px)`; "Back to donor dashboard" `ButtonLink variant="ghost"`.
  - Progress: `<ol>` of step pills `data-step-pill` (`aria-current="step"` on active) — index circle (active mint, complete ink with ✓, upcoming outline) + label; between pills the homepage dashed connector SVG (`stroke-dasharray="8 8"`, `animation: dash 1.2s linear infinite`, off under reduced motion). On < 760px labels hide except the active one.
  - Each step: `<section data-step-card className={styles.stepCard}>` (white 24px card, padding `clamp(24px,4vw,40px)`), header with `Eyebrow` "Step 0N", Playfair h2, lead; fields in `FieldGrid` with `Field` (full-width for description/special flags). Keep every `#listing-*` id, `name`, and `onChange`.
  - Upload: `label.upload` dashed 2px `rgba(20,48,42,.3)` 24px radius drop zone with ink avatar "+" icon, existing copy, hidden-but-accessible file input (`#listing-image` stays an `<input type="file">`, visually hidden via `.sr-only` pattern, label clickable); preview as 16px-radius image card.
  - Compliance: two `article.donor-compliance-card` `Card`s with `StatusPill`-style badge and pill buttons (button text unchanged: "Open PDF form"/"Replace PDF"); PDF modal → `Modal wide` (iframe 16px radius, upload panel `Card` canvas tone, success → `Notice tone="success"`); keep `input[type="file"][accept*="pdf"]`.
  - Action bar: sticky bottom `div.actionBar` (`position: sticky; bottom: 16px; border-radius: 999px; background: rgba(255,255,255,.9); backdrop-filter: blur(12px); border: 1px solid var(--ll-line); padding: 10px 10px 10px 24px`) — note left, buttons right: Back `Button variant="secondary" className="donor-form-secondary-action"`, Continue/Submit `Button arrow className="donor-form-primary-action"`. On mobile `border-radius: 24px` and buttons full-width stacked.
- [ ] **Step 4: Run spec + original `donor-listing-lifecycle.spec.ts`** (backend up) → PASS.
- [ ] **Step 5: Commit** `git commit -m "feat: redesign donor listing wizard"`.

---

### Task 12: Donor request board `/donor/request-board`

**Files:**
- Modify: `frontend/app/donor/request-board/page.tsx` (header → `PageHeader operate`), `frontend/components/request-board-browser.tsx` (render tree; fetch/respond logic unchanged)
- Create: `frontend/components/request-board-browser.module.css`, `e2e/redesign/request-board.spec.ts`

- [ ] **Step 1: Failing spec**
```ts
import { expect, test } from "@playwright/test";

import { loginAs } from "../helpers/auth";
import { assertNoHorizontalScroll, backendUp } from "./helpers";

test.beforeEach(async () => {
  test.skip(!(await backendUp()), "backend not running");
});

test("board posts render as cards", async ({ page }) => {
  await loginAs(page, "donor");
  await page.goto("/donor/request-board");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Request Board");
  const cards = page.locator("[data-board-card]");
  if ((await cards.count()) > 0) {
    await expect(cards.first()).toHaveCSS("border-radius", "24px");
    await expect(cards.first().getByRole("button", { name: /respond with listing/i })).toHaveCSS("border-radius", "999px");
  } else {
    await expect(page.locator("[data-board-empty]")).toBeVisible();
  }
  await assertNoHorizontalScroll(page);
});
```

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** (spec §6.9): `PageHeader variant="operate" eyebrow="Donor workspace" title={<>Recipient <Highlight>Request Board</Highlight></>} lead={existing page-intro copy}`; grid `repeat(auto-fill,minmax(320px,1fr))` gap 20px; each post `Card as="article" interactive data-board-card` with Eyebrow category + `StatusPill`, Playfair 24px title, truncated description, `dl` meta row (3 columns auto-fit, label eyebrow 11px, value 15px), footer `Button arrow` "Respond with Listing" (disabled + "Creating…" while pending, existing behavior). Loading → three skeleton cards (`background: linear-gradient(90deg, #fff, var(--ll-surface-hover), #fff); background-size: 200% 100%; animation: shimmer 1.6s infinite` — off under reduced motion); empty → `EmptyState variant="empty"` wrapped in `div[data-board-empty]` with existing empty copy.
- [ ] **Step 4: Run** → PASS. **Step 5: Commit** `git commit -m "feat: redesign donor request board"`.

---

### Task 13: Admin dashboard sections + modals

**Files:**
- Create: `frontend/components/admin/filter-bar.tsx` + `.module.css`, `institution-section.tsx`, `listing-section.tsx`, `competition-section.tsx`, `board-section.tsx`, `duplicates-section.tsx`, `institution-review-modal.tsx`, `listing-review-modal.tsx`, `competition-modal.tsx`, `merge-modal.tsx`, `admin.module.css`, `e2e/redesign/admin.spec.ts`
- Modify: `frontend/components/admin-review-dashboard.tsx` (becomes a ~200-line orchestrator: state, data loading, filters, handlers; passes props to section/modal components). **Move code, don't rewrite logic** — every fetch, status update, merge, close-post handler keeps its body.
- Modify: `frontend/app/globals.css` (delete `.admin-filter-*`, `.admin-duplicate-*`, `.admin-merge-*`, `.admin-document-*`, `.review-modal-*`, `.review-detail-*`, `.review-spec-*`, `.ops-table*`, `.ops-equipment-*`, `.ops-condition-badge`, `.ops-table-linkish`, `.ops-table-fallback`, `.admin-ops-competition-cell`, `.list`, `.list-row*`)

**Interfaces:**
- Produces: `<FilterBar search={{ value, onChange, placeholder }} selects={{ name: string; label: string; value: string; options: { value: string; label: string }[]; onChange(v: string): void }[]} />` — search pill + select pills; `select` elements carry the given `name`.
- Each section: `({ rows, onOpen, … }: <explicit props derived from the current inline JSX>) => JSX` returning a `DataTable`; clickable rows include `"ops-table-row-clickable"` class, `tabIndex={0}`, Enter/Space → `onOpen`.

- [ ] **Step 1: Failing spec**
```ts
import { expect, test } from "@playwright/test";

import { loginAs } from "../helpers/auth";
import { assertNoHorizontalScroll, backendUp } from "./helpers";

test.beforeEach(async () => {
  test.skip(!(await backendUp()), "backend not running");
});

test("admin sections use filter bars and kit tables", async ({ page }) => {
  await loginAs(page, "admin");
  await page.goto("/admin");
  await expect(page.locator("[data-filter-bar]")).toHaveCount(4);
  await expect(page.locator("[data-filter-bar] input[type='search']").first()).toHaveCSS("border-radius", "999px");
  await assertNoHorizontalScroll(page);
});

test("institution review modal keeps contract", async ({ page }) => {
  await loginAs(page, "admin");
  await page.goto("/admin");
  const row = page.locator("#institution-verification .ops-table-row-clickable").first();
  test.skip((await row.count()) === 0, "no institutions");
  await row.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator("select[name='verificationStatus'], select[name='status']")).toHaveCount(1);
  await expect(dialog.getByRole("button", { name: /update status/i })).toHaveCSS("border-radius", "999px");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});
```
(Verify which select name the institution modal uses today and assert that exact one.)

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Split + restyle** (spec §6.10)
  - Extract each section's JSX into its component file, moving the filter/row JSX verbatim, then swap markup to kit: `FilterBar` (`data-filter-bar`) above each `DataTable`; institution/listing/competition/board tables as in §6.10; duplicates as grouped `Card`s (each group: Playfair name, `Chip` similarity, list of institutions with `Avatar` initials, "Merge" `Button variant="ink" size="sm"`).
  - Modals → `Modal` (`wide` for listing/competition): listing modal layout `grid-template-columns: minmax(0, 5fr) minmax(0, 7fr)` (single column < 900px), image 24px radius, six detail tiles (`.fact` style from Task 7 — copy rules into `admin.module.css`), spec grid as `dl`, compliance documents as two `Card`s with status pill + 16px-radius iframe + pill actions, status form `Field` + `Select name="status"` + `Textarea` + `Button` "Update status"; removal confirm as nested confirm section with danger pill; merge modal options as selectable `label` cards (`border: 2px solid var(--ll-line)`, selected `border-color: var(--ll-mint); background: rgba(16,199,154,.06)`) wrapping visually-hidden radios.
- [ ] **Step 4: Run spec + original `admin-institution-verification.spec.ts` and `donor-listing-lifecycle.spec.ts`** (backend up) → PASS.
- [ ] **Step 5: Commit** `git commit -m "feat: split and redesign admin dashboard sections and review modals"`.

---

### Task 14: Cleanup, audits, docs

**Files:**
- Delete: `frontend/app/dev/kit/` (and update `kit.spec.ts` → move its assertions that still matter onto real pages, or delete the spec; keep the reduced-motion/no-JS Reveal checks by pointing them at `/listings` with a below-fold card when listings exist, else `/auth/sign-up`)
- Modify: `frontend/app/globals.css` (remove every now-unused rule: `landing-*`, `hero-*`, legacy `feature`, `timeline`, `metric`, `callout`, `mini`, `two-column`, `dashboard-grid`, `catalog-summary`, `panel*`, `listing-card*`, `listing-row*`, `review-trigger`, `ops-feed-*`, `ops-layout`, `ops-spacer`, the 1100/760/1101 media blocks' dead selectors, and the whole "Homepage theme applied across the app" override layer), `PROGRESS.md`, `WORK.md`
- Create: `DESIGN.md`

- [ ] **Step 1: Find dead CSS** — for every class selector in `globals.css`, check usage:
```bash
cd frontend && grep -oE "\.[a-z][a-z0-9_-]+" app/globals.css | sort -u | tr -d . | while read c; do grep -rqE "[\"' \`]$c[\"' \`]|$c\b" components app --include=*.tsx --include=*.ts || echo "$c"; done > /tmp/unused-classes.txt; wc -l /tmp/unused-classes.txt
```
Delete rules whose selectors only reference unused classes. Keep resets, `.sr-only`, `.site-main`, `.home-redesign-page`, `.status-pill` base hooks if still referenced, and the reduced-motion block.

- [ ] **Step 2: Audits**
  - Run the `web-design-guidelines` skill on: `frontend/components/ui/*.tsx frontend/components/chrome/*.tsx frontend/components/auth/*.tsx frontend/components/auth-shell.tsx frontend/components/public-catalog-browser.tsx frontend/app/listings/[listingId]/page.tsx frontend/components/dashboard/*.tsx frontend/components/donor-*.tsx frontend/components/recipient-*.tsx frontend/components/request-board-*.tsx frontend/components/admin/*.tsx`. Fix every accessibility/interaction finding; list any intentionally deferred ones in the commit message body.
  - Optional (requires user OK — downloads a binary): `impeccable audit` per page group; fix P0/P1 findings only.

- [ ] **Step 3: Write `DESIGN.md`** at repo root: copy spec §2 (tokens, type, shape, components, motion tiers) and add a "Where things live" table (`app/tokens.css`, `components/ui/*`, `components/chrome/*`, `components/dashboard/*`). Add one line to `CLAUDE.md` Key Files: `| DESIGN.md | Design system (tokens, type, components, motion) — use components/ui for all new UI |`.

- [ ] **Step 4: Full verification**
```bash
cd frontend && npx tsc --noEmit && npx next build 2>&1 | tail -5
cd ../e2e && npx playwright test -c redesign.config.ts
npx playwright test   # original suite, backend + seeded accounts required
wc -l ../frontend/app/globals.css
```
Expected: tsc silent; build OK; redesign suite PASS (authed tests PASS, not SKIPPED — if skipped, state that in the handoff); original suite PASS; `globals.css` well under its starting 5,646 lines (report the number).

- [ ] **Step 5: Screenshot sweep** — capture every route at 1440×900 and 390×844 (signed out; and each role signed in) into the scratchpad and review against spec §6. Fix discrepancies in one batch; at most one re-check round.

- [ ] **Step 6: Update docs** — `PROGRESS.md`: Mobile responsiveness → ✅ "All routes responsive to 360px (app-wide redesign)"; add row under Infrastructure "Design system (tokens + UI kit) ✅". `WORK.md`: new session entry with commits table and backend/frontend change summary.

- [ ] **Step 7: Commit**
```bash
git add -A frontend e2e DESIGN.md CLAUDE.md PROGRESS.md WORK.md
git commit -m "chore: remove legacy styles, add DESIGN.md, finalize app-wide redesign"
```
