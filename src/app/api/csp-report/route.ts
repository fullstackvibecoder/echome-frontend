/**
 * CSP violation collector.
 *
 * `report-uri` in next.config.ts points here instead of straight at Sentry so
 * known noise (browser extensions, bundled polyfill probes) is dropped before
 * it reaches the project. Rules live in src/lib/csp-report.ts.
 *
 * Always answers 204, never throws, no auth (browsers send reports without
 * credentials). Not covered by any auth redirect: the repo has no
 * middleware/proxy file.
 */
import * as Sentry from '@sentry/nextjs';
import { classifyCspReport, parseCspReports } from '@/lib/csp-report';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 16 * 1024;

const noContent = () => new Response(null, { status: 204 });

export async function POST(request: Request) {
  try {
    const declared = Number(request.headers.get('content-length'));
    if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return noContent();

    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return noContent();

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return noContent();
    }

    let forwarded = 0;
    for (const report of parseCspReports(json)) {
      const verdict = classifyCspReport(report);
      if (verdict.action !== 'forward') continue;
      forwarded += 1;
      Sentry.captureMessage(`CSP: ${verdict.directive} blocked ${report.blocked}`, {
        level: 'warning',
        tags: {
          directive: verdict.directive,
          'blocked-host': verdict.blockedHost,
          'document-path': verdict.documentPath,
        },
        // Group by what was blocked, not by the full URL or page.
        fingerprint: ['csp-violation', verdict.directive, verdict.blockedHost],
        extra: { blockedUri: report.blocked, sourceFile: report.sourceFile },
      });
    }

    // Serverless: captureMessage only buffers; flush before the lambda freezes.
    if (forwarded > 0) await Sentry.flush(2000);
  } catch (err) {
    console.error('CSP report handler error:', err);
  }
  return noContent();
}
