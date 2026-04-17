#!/usr/bin/env node
/**
 * Crawls every configured route, runs axe-core, writes per-route violations
 * and full-page screenshots to output/axe-report.json + output/screenshots/.
 */
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = resolve(__dirname, 'routes.json');
const AUTH_PATH = resolve(__dirname, 'auth.json');
const OUT_DIR = resolve(__dirname, 'output');
const SHOT_DIR = resolve(OUT_DIR, 'screenshots');

if (!existsSync(CONFIG_PATH)) {
  console.error('Missing routes.json. Copy routes.example.json to routes.json and fill it in.');
  process.exit(1);
}

const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
mkdirSync(SHOT_DIR, { recursive: true });

const needsAuth = config.routes.some(r => r.authenticated);
if (needsAuth && !existsSync(AUTH_PATH)) {
  console.error('Missing auth.json. Run `npm run auth` first.');
  process.exit(1);
}

function extractContrastData(node) {
  const check = node.any?.find(a => a.id === 'color-contrast') || node.any?.[0];
  if (!check?.data) return {};
  return {
    foreground: check.data.fgColor,
    background: check.data.bgColor,
    contrastRatio: check.data.contrastRatio,
    requiredRatio: check.data.expectedContrastRatio,
    fontSize: check.data.fontSize,
    fontWeight: check.data.fontWeight,
  };
}

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  storageState: existsSync(AUTH_PATH) ? AUTH_PATH : undefined,
});

const results = {
  generatedAt: new Date().toISOString(),
  baseUrl: config.baseUrl,
  viewport: { width: 1440, height: 900 },
  byRoute: {},
};

for (const route of config.routes) {
  const url = new URL(route.path, config.baseUrl).toString();
  process.stdout.write(`-> ${route.path} ... `);
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    if (route.authenticated && /\/(login|signin|sign-in)(\/|$|\?)/i.test(page.url())) {
      throw new Error('Redirected to login. auth.json likely expired. Re-run `npm run auth`.');
    }

    if (route.waitFor) {
      await page.waitForSelector(route.waitFor, { timeout: 10000 });
    }
    await page.waitForTimeout(500);

    const axeResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
      .analyze();

    const shotName = (route.path.replace(/[^a-z0-9]/gi, '_') || 'root').replace(/^_+|_+$/g, '') || 'root';
    const shotPath = resolve(SHOT_DIR, `${shotName}.png`);
    await page.screenshot({ path: shotPath, fullPage: true });

    const violations = axeResults.violations.map(v => ({
      rule: v.id,
      impact: v.impact,
      description: v.description,
      help: v.help,
      helpUrl: v.helpUrl,
      nodeCount: v.nodes.length,
      nodes: v.nodes.slice(0, 25).map(n => ({
        target: n.target,
        html: n.html.slice(0, 400),
        failureSummary: n.failureSummary,
        ...(v.id === 'color-contrast' ? extractContrastData(n) : {}),
      })),
    }));

    const contrastViolationCount = violations
      .filter(v => v.rule === 'color-contrast')
      .reduce((s, v) => s + v.nodeCount, 0);

    results.byRoute[route.path] = {
      url,
      title: await page.title(),
      screenshot: `./screenshots/${shotName}.png`,
      violationRuleCount: violations.length,
      violationNodeCount: violations.reduce((s, v) => s + v.nodeCount, 0),
      contrastViolationCount,
      violations,
    };
    console.log(`${violations.length} rules violated (${contrastViolationCount} contrast nodes)`);
  } catch (err) {
    console.log(`FAILED: ${err.message}`);
    results.byRoute[route.path] = { url, error: err.message };
  } finally {
    await page.close();
  }
}

await browser.close();
writeFileSync(resolve(OUT_DIR, 'axe-report.json'), JSON.stringify(results, null, 2));
console.log(`\nWrote ${resolve(OUT_DIR, 'axe-report.json')}`);
