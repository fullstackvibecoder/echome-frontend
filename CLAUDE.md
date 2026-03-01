# EchoMe Frontend

Next.js App Router frontend for the EchoMe AI content generation platform.

## Tech Stack
- Next.js (App Router), TypeScript, React
- Tailwind CSS
- Supabase Auth (client-side)
- Deployed on Vercel, auto-deploys on push to main

## Key Architecture
- `src/app/` — App Router pages and layouts
- `src/app/app/` — Authenticated app pages (dashboard, library, settings, admin, etc.)
- `src/app/auth/` — Login, signup, forgot password
- `src/hooks/` — Custom hooks (useAuth, useSubscription, etc.)
- `src/components/` — Shared UI components
- `src/lib/api-client.ts` — API client with JWT sync and interceptors

## Important Patterns
- `useSubscription` hook provides `isFreeUser`, `freeGenerationsRemaining`, `canGenerate`
- API interceptors handle 401/402/403 with toast notifications
- JWT tokens synced via `onAuthStateChange` listener in `api-client.ts`
- CSS tooltips use `peer`/`peer-hover` pattern (not `group`/`group-hover`)
- Sentry error tracking via `@sentry/nextjs`, client config in `instrumentation-client.ts`

## Sensitive Paths — DO NOT auto-modify
- `src/app/auth/` — Authentication flows
- `src/app/app/admin/` — Admin panel
- `src/lib/api-client.ts` — Core API client with auth logic
- Any billing/subscription components

## Running Locally
```bash
npm install && npm run dev  # runs on http://localhost:3000
```

## Building
```bash
npm run build
```
