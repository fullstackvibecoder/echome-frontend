import { NextResponse } from 'next/server';

/**
 * Deployed-version heartbeat.
 *
 * Returns the git SHA of the running deployment so long-lived tabs can tell
 * a newer frontend has shipped and offer a refresh (see
 * src/lib/use-deploy-version.ts). Unauthenticated by design: it exposes only
 * the deployed commit SHA, which is not sensitive.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    { sha: process.env.VERCEL_GIT_COMMIT_SHA ?? 'dev' },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
