You are ending the current LabLink work session. Follow these steps in order:

**Step 1 — Identify session work**

Run these commands to see what changed this session:

```bash
git log --oneline --since="8 hours ago"
```

Also review this conversation to identify: what features were built, what bugs were fixed, what files were changed, and which commits were made during this session.

**Step 2 — Append session entry to WORK.md**

Read `WORK.md`. Prepend a new session block directly after the `## Completed Work` heading (before the existing entries). Use this exact format:

```
### Session — YYYY-MM-DD (<topic in 2-4 words>)
Spec: `docs/superpowers/specs/<filename>`   ← omit this line if no spec was written
Plan: `docs/superpowers/plans/<filename>`   ← omit this line if no plan was written

| Commit | Summary |
|---|---|
| `<hash>` | <one-line summary> |

**<Layer> changes:** <prose summary of what changed and why>
```

Only include layers that actually changed (Backend, Frontend, Tests, Docs, etc.). Use the actual short git hashes from Step 1.

**Step 3 — Update PROGRESS.md**

Read `PROGRESS.md`. For any feature that was completed this session:
- Change its status from ⬜ or 🔄 to ✅
- Update the Notes column to describe what was implemented

If no features changed status this session, skip this step entirely.

**Step 4 — Commit**

```bash
git add WORK.md PROGRESS.md
git commit -m "docs: update WORK.md and PROGRESS.md after session"
```

After the commit succeeds, confirm to the user: "Session saved. WORK.md and PROGRESS.md updated and committed."
