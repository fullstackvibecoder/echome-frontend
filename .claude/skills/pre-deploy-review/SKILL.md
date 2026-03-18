---
name: pre-deploy-review
description: Run a pre-deploy review of the EchoMe backend — compile check, LLM JSON audit, error handling audit, pipeline wiring, and diff review
---

Run a pre-deploy review of the EchoMe backend before pushing changes.

IMPORTANT: This skill checks whether existing code is **mechanically correct** (wired up, not silently failing). It does NOT question design decisions. If something was intentionally removed, disabled, or simplified in a past commit, that is correct — do not flag it. When in doubt, check `git log` for the relevant file to understand whether the current state is intentional before flagging.

## 1. Compile Check
Run `npx tsc --noEmit` in the backend root. Report any errors.

## 2. LLM JSON Parsing Audit
Search all `JSON.parse()` calls in `src/services/` that parse raw LLM output (Claude, GPT, Haiku responses). For each one, verify that markdown code fence stripping (```` ```json...``` ````) is applied before parsing. Flag any that are missing it. Exclude calls that parse non-LLM output (FFmpeg, Stripe webhooks, yt-dlp, regex-extracted JSON via `jsonMatch`).

## 3. Error Handling Audit
Search for `catch` blocks in `src/services/` that silently swallow errors — specifically patterns like:
- `catch { }` or `catch { // silently handle }` with no logging
- `catch` blocks that return default values without any `logger.warn` or `logger.error`
- "passing through" patterns where a failure silently skips validation that is supposed to run

Only flag cases where errors are **silently lost**. Intentional pass-throughs that log a warning are fine. Catch blocks that return sensible defaults for non-critical paths (e.g., optional thumbnail generation, music download) are fine — use judgment about whether the caller needs to know.

## 4. Pipeline Wiring Check
Read the current generation pipeline in `src/services/generation/generator.ts` and verify that the systems it calls are actually reachable:
- If it calls `checkGuardrails()` — verify the function exists and its result is used
- If it calls `validateVoiceMatch()` — verify failures trigger retries or are logged with scores
- If it calls any other validation — verify the result isn't discarded

Do NOT flag systems that were intentionally removed or simplified. Check `git log --oneline -- <file>` if you're unsure whether a pattern is intentional. Hardcoded pass-through scores (e.g., `score: 100`) that were committed intentionally are correct.

## 5. Diff Review
Run `git diff --stat` (unstaged) and `git diff --cached --stat` (staged) to see pending changes. For each changed file:
- Check for accidental debug code (`console.log`, hardcoded test values, `TODO` hacks)
- Check for any new `JSON.parse()` calls on LLM output that need fence stripping
- Check for any new catch blocks that silently swallow errors

If there are no pending changes, run `git diff --stat HEAD~1` to review the most recent commit instead.

## Output Format
Report findings as:
- **PASS** — no issues found in that section
- **WARN** — potential issue worth reviewing, explain what and where
- **FAIL** — will break or silently fail in production, must fix before deploy

Be concise. Don't pad the report — if everything passes, say so in one line per section.
