---
name: signoff
description: Save a session summary before closing — captures what was done, what's pending, and what to pick up next for /catchup to read
---

The user is wrapping up this session. Save a summary so the next session can pick up seamlessly via `/catchup`.

## Step 1: Gather What Happened

Review the current conversation and collect:
- **What was worked on** — features built, bugs fixed, investigations done
- **What was decided** — any design decisions, trade-offs, or user preferences expressed
- **What's unfinished** — tasks discussed but not completed, things that were deferred
- **What's next** — what the user said they wanted to do next, or the logical next step

Also check:
```
git status
git stash list
```
Note any uncommitted or stashed work.

## Step 2: Write the Session Summary

Write (or overwrite) the file:
`/Users/aramammo/.claude/projects/-Volumes-Side-Quests-echome-platform-v2/memory/session_last.md`

Use this format:

```markdown
---
name: Last session summary
description: Summary of the most recent working session — read by /catchup to restore context
type: project
---

## Session Date: YYYY-MM-DD

### What Was Done
- bullet points of completed work

### Key Decisions
- bullet points of decisions made (or "None")

### Unfinished / Deferred
- bullet points of incomplete work (or "Nothing pending")

### Uncommitted Changes
- list of uncommitted/stashed files and what they are (or "Working tree clean")

### Next Up
- what to pick up next session
```

## Step 3: Check for New Decision Memories

If any non-obvious design decisions were made this session that aren't already captured in a `decision_*` memory file, save them now. Check the memory index first to avoid duplicates.

## Step 4: Update Memory Index

If you created or updated any memory files, make sure `/Users/aramammo/.claude/projects/-Volumes-Side-Quests-echome-platform-v2/memory/MEMORY.md` links to them.

## Step 5: Confirm

Tell the user what was saved and that they're good to close the terminal.

## Rules
- Overwrite `session_last.md` each time — only the most recent session matters (older context lives in git history and decision memories)
- Convert any relative dates to absolute dates (e.g., "tomorrow" → "2026-03-18")
- Keep it concise — this is a handoff note, not a transcript
- If nothing meaningful happened this session, say so and skip the write
