#!/usr/bin/env node
/**
 * Merges axe-report.json + inventory-report.json into a single audit-report.json
 * with a prioritized action stack Claude Code can walk top to bottom.
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, 'output');

const axe = JSON.parse(readFileSync(resolve(OUT, 'axe-report.json'), 'utf8'));
const inv = JSON.parse(readFileSync(resolve(OUT, 'inventory-report.json'), 'utf8'));

const byRoute = axe.byRoute;
let totalViolationNodes = 0;
let totalContrastNodes = 0;
const ruleCounts = {};

for (const r of Object.values(byRoute)) {
  if (!r.violations) continue;
  totalViolationNodes += r.violationNodeCount || 0;
  totalContrastNodes += r.contrastViolationCount || 0;
  for (const v of r.violations) {
    ruleCounts[v.rule] = (ruleCounts[v.rule] || 0) + v.nodeCount;
  }
}

const componentDrift = Object.entries(inv.componentInventory)
  .map(([name, data]) => ({
    component: name,
    totalUsages: data.totalUsages,
    variantCount: data.uniqueVariantSignatures,
    fileCount: data.fileCount,
  }))
  .filter(c => c.variantCount > 3)
  .sort((a, b) => b.variantCount - a.variantCount);

const priorityActions = [];

if (inv.tokenAudit.uniqueColorValues > 12) {
  priorityActions.push({
    priority: 1,
    type: 'token-consolidation',
    title: `Consolidate ${inv.tokenAudit.uniqueColorValues} distinct color values into canonical tokens`,
    rationale: 'Rogue hex / rgb / hsl literals are the root cause of contrast drift. Fix the token system before patching individual screens.',
    topOffenders: inv.tokenAudit.values.slice(0, 25).map(v => ({
      value: v.value,
      usages: v.occurrenceCount,
      files: v.fileCount,
    })),
  });
}

for (const d of componentDrift) {
  priorityActions.push({
    priority: 2,
    type: 'component-unification',
    title: `${d.component} has ${d.variantCount} variant signatures across ${d.totalUsages} call sites in ${d.fileCount} files`,
    component: d.component,
    rationale: 'Pick one canonical implementation and migrate every call site. Variant drift is the root cause of "areas look inconsistent."',
    samples: inv.componentInventory[d.component].samples.slice(0, 8),
    variantDistribution: inv.componentInventory[d.component].variants.slice(0, 10),
  });
}

const routesByContrast = Object.entries(byRoute)
  .filter(([, r]) => (r.contrastViolationCount || 0) > 0)
  .sort(([, a], [, b]) => (b.contrastViolationCount || 0) - (a.contrastViolationCount || 0));

if (routesByContrast.length) {
  priorityActions.push({
    priority: 3,
    type: 'contrast-fixes',
    title: `${totalContrastNodes} contrast violations across ${routesByContrast.length} routes`,
    rationale: 'Run this after tokens are consolidated. Most of these will resolve automatically once text/surface tokens pass 4.5:1 by construction.',
    routes: routesByContrast.slice(0, 20).map(([path, r]) => ({
      path,
      contrastViolations: r.contrastViolationCount,
      screenshot: r.screenshot,
    })),
  });
}

const otherRules = Object.entries(ruleCounts)
  .filter(([rule]) => rule !== 'color-contrast')
  .sort(([, a], [, b]) => b - a);

if (otherRules.length) {
  priorityActions.push({
    priority: 4,
    type: 'other-a11y-rules',
    title: `${otherRules.length} additional WCAG rules violated across the site`,
    rationale: 'Address after contrast. Common findings here: missing labels, low-target hit areas, duplicate landmarks. Usually tied to the same components flagged above.',
    breakdown: otherRules.map(([rule, count]) => ({ rule, nodeCount: count })),
  });
}

const report = {
  generatedAt: new Date().toISOString(),
  site: axe.baseUrl,
  viewport: axe.viewport,
  summary: {
    routesAudited: Object.keys(byRoute).length,
    routesWithErrors: Object.values(byRoute).filter(r => r.error).length,
    totalViolationNodes,
    totalContrastNodes,
    componentsWithDrift: componentDrift.length,
    uniqueColorValues: inv.tokenAudit.uniqueColorValues,
    totalColorOccurrences: inv.tokenAudit.totalColorOccurrences,
  },
  priorityActions,
  byRoute,
  componentInventory: inv.componentInventory,
  tokenAudit: inv.tokenAudit,
};

writeFileSync(resolve(OUT, 'audit-report.json'), JSON.stringify(report, null, 2));

console.log('');
console.log('=== AUDIT SUMMARY ===');
console.log(`Routes audited:          ${report.summary.routesAudited}`);
console.log(`Total violation nodes:   ${report.summary.totalViolationNodes}`);
console.log(`Contrast violations:     ${report.summary.totalContrastNodes}`);
console.log(`Components with drift:   ${report.summary.componentsWithDrift}`);
console.log(`Unique color values:     ${report.summary.uniqueColorValues}`);
console.log(`Priority actions queued: ${priorityActions.length}`);
console.log('');
console.log(`Wrote ${resolve(OUT, 'audit-report.json')}`);
