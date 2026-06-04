---
name: api-integration-checklist
description: Use this skill when integrating any third-party API or service (Outstand, Stripe, Resend, etc.). Prevents the "write code first, debug later" pattern that causes cascading failures. Fire this BEFORE writing any integration code.
triggers:
  - integrating a new API
  - connecting to a third-party service
  - adding OAuth flow
  - writing API wrapper/service code
---

# Third-Party API Integration Checklist

**When to use:** Before writing ANY code that talks to an external API. This includes new services, new endpoints on existing services, and OAuth flows.

**Why this exists:** We repeatedly shipped integration code based on assumed API behavior instead of verified facts. Every error was avoidable with 10 minutes of upfront verification. This checklist prevents that.

## Phase 1: Documentation (before writing any code)

- [ ] **Read the full API docs** using context7 (`resolve-library-id` → `query-docs`) or fetch the raw docs. Don't rely on memory or training data.
- [ ] **List every endpoint you'll call** with exact method, path, required params, and response shape. Write them down in the spec.
- [ ] **Identify the response envelope pattern.** Does the API wrap responses? (e.g., `{ success: true, data: { ... } }` vs raw data). Document it — your service wrapper must unwrap correctly.
- [ ] **Identify authentication method.** Bearer token? API key header? OAuth? Document the exact header format.
- [ ] **Identify field naming convention.** snake_case? camelCase? Mixed? This matters for parsing responses and callback params.

## Phase 2: Verification (curl-test before coding)

- [ ] **Curl-test every endpoint** you plan to use with real credentials. Copy the exact response.
- [ ] **For OAuth flows:** Walk through the entire flow manually once.
  - What URL does the auth redirect go to?
  - What params come back in the callback? (Log ALL query params on first attempt.)
  - Is there a finalize/confirm step after the callback?
- [ ] **Document the actual response shape** from your curl tests, not what docs say. If they differ, trust the curl test.
- [ ] **Test error cases.** What does a 401 look like? A 404? A validation error? Know the error shape.

## Phase 3: Environment (before deploying)

- [ ] **List all required env vars.** API keys, webhook secrets, callback URLs, base URLs.
- [ ] **Set env vars in ALL environments.** Local `.env`, Railway/production, Vercel if frontend needs any.
- [ ] **Verify env vars are loaded.** Add a startup log: `logger.info('Outstand key loaded', { hasKey: !!process.env.OUTSTAND_API_KEY })`.

## Phase 4: Database (before writing queries)

- [ ] **If using upsert with `onConflict`**, verify the unique constraint EXISTS on the table. Upsert without a matching constraint = runtime error.
- [ ] **If creating new tables**, apply the migration AND verify it succeeded before writing code that queries it.
- [ ] **Check column types match.** If the API returns a string ID, don't store it in a UUID column.

## Phase 5: Code (now you can write it)

- [ ] **Write the service wrapper** with response unwrapping that matches your verified response shape.
- [ ] **Add logging** on every API call: method, path, and on errors: status code + response body.
- [ ] **Handle the envelope consistently.** If the API wraps in `{ success, data }`, unwrap in the service layer so routes get clean data.
- [ ] **For OAuth callbacks:** Accept ALL possible param names (both camelCase and snake_case) and log what you receive.

## Phase 6: Subagent Instructions (when delegating)

When dispatching subagents to build integrations:
- **Include curl examples** of verified responses in the prompt — don't make them guess the response shape.
- **Include the field naming convention** (snake_case vs camelCase).
- **Include the envelope pattern** ("Outstand wraps all responses in `{ success: true, data: {...} }`").
- **Tell them to test with curl** before committing.

## Anti-Patterns This Prevents

| Anti-Pattern | What Happens | This Checklist Says |
|-------------|-------------|-------------------|
| "Write code, deploy, debug" | 4+ deploy cycles fixing API call format | Curl-test first, write code that matches |
| "Assume the response shape" | `result.url` is undefined because it's `result.data.auth_url` | Document and test the envelope |
| "Assume param names" | `accountId` vs `account_id` breaks the callback | Log ALL params, accept both conventions |
| "Assume the DB is ready" | Upsert fails because constraint doesn't exist | Verify constraints before writing upsert code |
| "Set env vars later" | Deployed code crashes because key is missing | Set in ALL environments before deploying |
