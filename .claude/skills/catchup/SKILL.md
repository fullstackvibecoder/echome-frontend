---
name: catchup
description: Rebuild context from a previous session — reads memory, recent commits, pending changes, plan files, and open tasks to get up to speed fast
---

You're starting a fresh session on the EchoMe platform. The user wants to pick up where they left off. Gather context from every available source and present a concise briefing.

## Step 1: Read Memory

Read the memory index at `/Users/aramammo/.claude/projects/-Volumes-Side-Quests-echome-platform-v2/memory/MEMORY.md`. Read any memory files that were recently updated (check file modification times). Pay special attention to `project` and `decision` type memories — these capture active work and non-obvious choices.

## Step 2: Read Last Session Summary

Check if `/Users/aramammo/.claude/projects/-Volumes-Side-Quests-echome-platform-v2/memory/session_last.md` exists. If it does, read it — this is the handoff note from the previous session and is your most important context source. It tells you what was done, what's unfinished, and what to pick up next.

## Step 3: Check for Active Plans

Look for plan files in `/Users/aramammo/.claude/plans/`. If any exist, read them. These represent in-progress implementation work that may not be finished.

## Step 4: Recent Git Activity

Run:
```
git log --oneline -15
```
Then for the most recent 3-5 commits, read the full messages:
```
git log -5 --format="%h %s%n%b%n---"
```

Check for uncommitted work:
```
git status
git diff --stat
git diff --cached --stat
```

## Step 5: Check for Unfinished Work

Look for signs of in-progress work:
- Untracked files that look like scripts or new features
- Modified files that haven't been committed
- TODO comments in recently changed files
- Any stashed changes: `git stash list`

## Step 6: Check Recent Errors (if applicable)

Scan the last few lines of any local log files or recent test output if available.

## Step 7: Present the Briefing

Format your output as:

### Where We Left Off
One paragraph summarizing the most recent work based on commits + memory + plans.

### Active Plan
If a plan file exists: what it covers, what steps are done, what's next. If no plan: say "No active plan."

### Pending Changes
List any uncommitted/untracked files and what they appear to be.

### Key Decisions in Memory
Bullet list of decision memories that are relevant to active work (title + one-line summary each).

### Suggested Next Step
Based on everything above, what's the most logical thing to work on next. Keep it to 1-2 sentences.

## Rules
- Be concise — this is a briefing, not a novel
- Don't read every file in the repo — focus on signals of recent activity
- If there's nothing notable (clean git status, no plans, no recent commits), say so — don't fabricate context
- Present facts, not guesses — if something is ambiguous, flag it as "unclear" rather than assuming
