# EchoMe UI Audit

Drops into `echome-platform-ui/scripts/ui-audit/`. Crawls every configured route of TryEchoMe, runs axe-core against the rendered DOM, scans the source tree for component variant drift and rogue color values, and writes a single `output/audit-report.json` that Claude Code can walk top to bottom.

## What it catches

1. **Contrast failures on rendered pages.** axe-core reports every text/background pair below WCAG 4.5:1 (normal) or 3:1 (large), with the actual computed foreground, background, contrast ratio, font size and weight, plus a DOM target.
2. **Component variant drift.** Scans JSX for every `<Button>`, `<Card>`, `<Modal>`, etc. and groups call sites by prop signature (`variant`, `size`, `color`, hashed `className`). Components with more than 3 distinct signatures are flagged for unification.
3. **Rogue color values.** Every hex, rgb, rgba, hsl, hsla literal across `.tsx .jsx .ts .js .css .scss` files. Deduped and ranked by usage count. This is usually the root cause: 30 to 50 ad hoc values competing with the handful of declared tokens.

Output includes full-page screenshots per route so you can diff what the audit saw against intent.

## One-time setup

```bash
# from echome-platform-ui repo root
mkdir -p scripts/ui-audit
# copy this toolkit's files into scripts/ui-audit/
cd scripts/ui-audit

cp routes.example.json routes.json
cp inventory.config.example.json inventory.config.json

npm install
npx playwright install chromium
```

Edit `routes.json` to list every route to audit. Edit `inventory.config.json` `sourceRoot` so the path resolves to your UI source root (default `../../` assumes the script lives at `echome-platform-ui/scripts/ui-audit/`).

Add to `echome-platform-ui/.gitignore`:

```
scripts/ui-audit/node_modules/
scripts/ui-audit/output/
scripts/ui-audit/auth.json
scripts/ui-audit/routes.json
scripts/ui-audit/inventory.config.json
```

## Run

```bash
npm run auth      # opens Chromium. Log in manually, then press Enter in terminal.
npm run audit     # crawl + inventory + merge
```

Outputs in `output/`:

- `axe-report.json` — per-route axe violations with DOM targets and computed colors
- `inventory-report.json` — component variant signatures and color value inventory
- `audit-report.json` — merged report with prioritized action stack
- `screenshots/*.png` — full-page screenshots per route

## Hand off to Claude Code

From `echome-platform-ui` root:

```bash
claude --dangerously-skip-permissions "Read scripts/ui-audit/output/audit-report.json end to end. Walk priorityActions in order. For priority 1 (token-consolidation), propose a canonical token set (surface, surface-muted, surface-elevated, border, border-strong, text-primary, text-secondary, text-muted, text-on-accent, plus brand roles). Every combination must hit 4.5:1. Output the proposed tailwind.config.ts diff and the full list of rogue values mapped to target tokens. Do not edit yet. Wait for approval."
```

After approval, a second pass migrates call sites:

```bash
claude --dangerously-skip-permissions "Using the approved token mapping in TOKEN_MIGRATION.md, walk every file in inventory-report.json tokenAudit occurrences. Replace rogue values with tokens. For component-unification actions, pick the variant with the highest count as the canonical and migrate all other call sites to match. Run tsc --noEmit after each component and report."
```

## Notes

- Viewport is 1440x900. Edit `crawl.mjs` to add mobile or tablet passes.
- `auth.json` contains a live Supabase session. Do not commit it.
- Axe runs WCAG 2.0/2.1 A and AA plus best-practice. AAA is off by default since most brand color systems cannot meet it.
- Component regex catches static JSX opens like `<Button variant="primary">`. Dynamic usages (`const C = map[type]; <C />`) slip through. If an inventory count looks suspiciously low for a known component, check for dynamic rendering.
- Tailwind arbitrary values like `bg-[#ff0000]` are correctly caught by the hex regex.
- Re-run the crawl after the sweep. Deltas in `audit-report.json` summary numbers are the proof of work.
