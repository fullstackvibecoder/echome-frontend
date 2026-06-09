import { NextResponse } from 'next/server';
import {
  fetchLatestDeploymentState,
  readRailwayConfig,
  type DeployState,
} from '@/lib/railway-deploy-status';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CACHE_TTL_MS = 10_000;
let cache: { state: DeployState; at: number } | null = null;

export async function GET() {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) {
    return NextResponse.json({ state: cache.state });
  }
  const cfg = readRailwayConfig();
  if (!cfg) {
    // No credentials → we cannot know; caller treats unknown as outage. Do not cache.
    return NextResponse.json({ state: 'unknown' as DeployState });
  }
  const state = await fetchLatestDeploymentState(cfg);
  cache = { state, at: now };
  return NextResponse.json({ state });
}
