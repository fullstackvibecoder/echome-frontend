---
name: investigate
description: Investigate a suspected issue before fixing — checks decision memory and git history to classify as INTENTIONAL, ACTUAL BUG, REGRESSION, or UNCLEAR
---

Investigate a suspected issue in the EchoMe codebase. This skill is a sanity check that runs BEFORE proposing any fix. It determines whether a finding is an actual bug or an intentional design decision from a previous change.

The user will describe what they found (a log error, suspicious code pattern, unexpected behavior). Follow these steps IN ORDER. Do not skip any step.

## Step 1: Locate the Code
Find the exact file(s) and line(s) involved. Read them. State what you see.

## Step 2: Check Decision Memory
Read the memory index at `/Users/aramammo/.claude/projects/-Volumes-Side-Quests-echome-platform-v2/memory/MEMORY.md`. Check if any `decision_*` memory files are relevant to the code or system in question. If a decision memory exists, read it — it captures the reasoning behind non-obvious changes and the alternatives that were rejected.

## Step 3: Check Git History
Run:
```
git log --oneline -10 -- <file>
```
For each relevant commit, read the commit message. If any commit title suggests the current state was intentional (words like "remove", "simplify", "disable", "accept", "skip", "pass through"), read the full commit:
```
git show <hash> -- <file>
```

## Step 4: Classify the Finding

Based on decision memory AND git history, classify as ONE of:

**INTENTIONAL** — A past commit or decision memory deliberately created this behavior. State the source (commit hash or memory file), what it decided, and why. Recommend: do nothing.

**ACTUAL BUG** — The code is failing in a way no past decision intended. The behavior contradicts what the code is trying to do (e.g., a parser that's supposed to parse but crashes, a check that's supposed to validate but silently skips). State the evidence.

**REGRESSION** — A later change accidentally broke something that previously worked. State which commit introduced the regression and what it broke.

**UNCLEAR** — Neither memory nor git history tells the full story. Ask the user for context before proceeding.

## Step 5: Show Your Work
Present a short summary:
- **What was found:** one sentence
- **Git evidence:** the relevant commit(s) and what they say
- **Decision memory:** relevant memory file, or "none found"
- **Classification:** INTENTIONAL / ACTUAL BUG / REGRESSION / UNCLEAR
- **Recommendation:** do nothing / fix X / ask user about Y

## Rules
- NEVER propose a fix for something classified as INTENTIONAL
- NEVER skip Steps 2 and 3 — checking both memory and git history is the whole point
- If the commit message is ambiguous, read the actual diff to understand intent
- If multiple commits touch the same code, trace the full timeline — the most recent intentional change wins
- When in doubt, classify as UNCLEAR and ask rather than guessing
