# Session Commands Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create two Claude Code project slash commands — `/start` (session briefing from project files) and `/end` (save session work to WORK.md + PROGRESS.md and commit).

**Architecture:** Both commands are markdown prompt files in `.claude/commands/`. When invoked, Claude Code injects the file content as an instruction. No code, no tests — these are prompt engineering artifacts.

**Tech Stack:** Claude Code project commands (markdown files in `.claude/commands/`)

---

## File Map

| Action | File | Purpose |
|---|---|---|
| Create | `.claude/commands/start.md` | `/start` command prompt |
| Create | `.claude/commands/end.md` | `/end` command prompt |

---

### Task 1: Create the `/start` command

**Files:**
- Create: `.claude/commands/start.md`

- [ ] **Step 1: Create the `.claude/commands/` directory and `start.md`**

Create `.claude/commands/start.md` with this exact content:

```markdown
You are starting a new LabLink work session. Load project context by reading these files in order:

1. Read `AGENTS.md` — engineering rules, stack, constraints, coding patterns
2. Read `PROGRESS.md` — feature-by-feature implementation status
3. Read `WORK.md` — session history, active work, and prioritized backlog

After reading all three files, produce a session briefing with exactly these three sections:

## What's Done
List all features currently marked ✅ Complete in PROGRESS.md, grouped by their section heading (Authentication, Listings, Requests, etc.).

## Active / In Progress
List anything marked 🔄 In Progress in PROGRESS.md, plus anything under "Active Work" in WORK.md. If nothing is active, say so explicitly.

## Top Backlog Items
List the High Priority items from WORK.md backlog that are not yet done, then the top 3 Medium Priority items. Show their checkbox state as-is.

---

After the briefing, ask: "What do you want to work on today?"
```

- [ ] **Step 2: Commit**

```bash
git add .claude/commands/start.md
git commit -m "feat: add /start session command"
```

---

### Task 2: Create the `/end` command

**Files:**
- Create: `.claude/commands/end.md`

- [ ] **Step 1: Create `end.md`**

Create `.claude/commands/end.md` with this exact content:

```markdown
You are ending the current LabLink work session. Follow these steps in order:

**Step 1 — Identify session work**

Run these commands to see what changed:
```bash
git log --oneline --since="8 hours ago"
git diff HEAD~$(git log --oneline --since="8 hours ago" | wc -l | tr -d ' ')..HEAD --stat
```

Also review this conversation to identify: what features were built, what bugs were fixed, what files were changed, and which commits were made.

**Step 2 — Append session entry to WORK.md**

Read `WORK.md`. Prepend a new session block directly after the `## Completed Work` heading (before the existing entries). Use this format:

```
### Session — YYYY-MM-DD (<topic in 2-4 words>)
Spec: `docs/superpowers/specs/<filename>` *(omit line if no spec was written)*
Plan: `docs/superpowers/plans/<filename>` *(omit line if no plan was written)*

| Commit | Summary |
|---|---|
| `<hash>` | <one-line summary> |
...

**<Layer> changes:** <prose summary of what changed and why>
...
```

Only include layers that actually changed (Backend, Frontend, Tests, Docs, etc.).

**Step 3 — Update PROGRESS.md**

Read `PROGRESS.md`. For any feature that was completed this session:
- Change its status from ⬜ or 🔄 to ✅
- Update the Notes column to describe what was implemented

If no features changed status, skip this step.

**Step 4 — Commit**

```bash
git add WORK.md PROGRESS.md
git commit -m "docs: update WORK.md and PROGRESS.md after session"
```

After committing, confirm: "Session saved. WORK.md and PROGRESS.md updated and committed."
```

- [ ] **Step 2: Commit**

```bash
git add .claude/commands/end.md
git commit -m "feat: add /end session command"
```

---

### Task 3: Smoke-test both commands

- [ ] **Step 1: Verify the commands appear in Claude Code**

In Claude Code, type `/` — both `start` and `end` should appear in the autocomplete list.

- [ ] **Step 2: Run `/start` and verify output**

Invoke `/start`. Confirm the briefing contains all three sections (What's Done, Active / In Progress, Top Backlog Items) and ends with the prompt question.

- [ ] **Step 3: Run `/end` and verify output**

Invoke `/end`. Confirm it runs the git commands, appends a session entry to `WORK.md`, checks `PROGRESS.md`, and commits both files.
