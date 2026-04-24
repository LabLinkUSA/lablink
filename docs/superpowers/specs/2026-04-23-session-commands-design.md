# Session Commands Design — `/start` and `/end`

**Date:** 2026-04-23  
**Status:** Approved

---

## Overview

Two project-level Claude Code slash commands to bookend every work session. `/start` loads project context and produces a session briefing. `/end` captures what was done, updates tracking files, and commits them.

Implemented as markdown prompt files in `.claude/commands/` — the native Claude Code primitive for project-level slash commands.

---

## `/start` Command

**File:** `.claude/commands/start.md`

### Behavior

When invoked, Claude:

1. Reads the following files in order:
   - `AGENTS.md` — engineering rules, stack, constraints
   - `PROGRESS.md` — feature-by-feature implementation status
   - `WORK.md` — session log, active work, prioritized backlog
2. Produces a structured **session briefing** with three sections:
   - **What's done** — features marked ✅ Complete in PROGRESS.md
   - **Active / in-progress** — anything marked 🔄 or listed under "Active Work" in WORK.md
   - **Top backlog items** — prioritized next tasks from WORK.md backlog
3. Closes with: *"What do you want to work on today?"*

### Goal

Give Claude enough context to start contributing immediately without the user having to re-explain the project state.

---

## `/end` Command

**File:** `.claude/commands/end.md`

### Behavior

When invoked, Claude:

1. Runs `git log --oneline` and `git diff` to identify commits and file changes from this session
2. Reviews the conversation to understand what was built, fixed, or discussed
3. Appends a new session entry to `WORK.md` under "Completed Work":
   - Session date and topic heading
   - Links to spec/plan docs if any were created
   - Commit table: hash + one-line summary for each commit this session
   - Prose summary of backend/frontend/test changes
4. Updates `PROGRESS.md`:
   - Flips any newly completed features from ⬜/🔄 to ✅
   - Adds notes column entries for what was implemented
5. Commits both files: `docs: update WORK.md and PROGRESS.md after session`

### Goal

Ensure every session leaves a complete, committed paper trail so the next `/start` has accurate state to brief from.

---

## Implementation

- **Mechanism:** Claude Code project commands — markdown files in `.claude/commands/`
- **No external dependencies** — no plugins, no Supermemory, no hooks required
- **Editable:** Both command files are plain markdown; easy to update as the project evolves

---

## Out of Scope

- Supermemory integration (auth is currently unreliable)
- Auto-push to remote after `/end` commit
- Scheduled/cron-based session saves
