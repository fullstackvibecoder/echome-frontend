import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const css = fs.readFileSync(path.join(__dirname, "just-echo.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const globals = fs.readFileSync(path.join(__dirname, "globals.css"), "utf8");

const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

function ruleBody(selectorTest: (sel: string) => boolean): string {
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) {
    const sel = m[1].trim();
    if (selectorTest(sel)) return norm(m[2]);
  }
  throw new Error("rule not found");
}

const dark = ruleBody((s) => s === ".je");
const light = ruleBody((s) => s.startsWith('html[data-theme="light"] .je'));

const ROWS: [string, string, string][] = [
  ["canvas", "#08090D", "#F4F5F8"],
  [
    "bg",
    "radial-gradient(700px 420px at 52% 45%, rgba(167,139,250,.13), transparent 65%), radial-gradient(600px 340px at 15% 0%, rgba(34,211,238,.06), transparent 60%), #08090D",
    "radial-gradient(700px 420px at 52% 45%, rgba(139,92,246,.10), transparent 65%), radial-gradient(600px 340px at 15% 0%, rgba(6,182,212,.06), transparent 60%), #F4F5F8",
  ],
  ["g1", "#22D3EE", "#06B6D4"],
  ["g2", "#A78BFA", "#8B5CF6"],
  ["ink", "#F2F3F7", "#0F1117"],
  ["ink-2", "#C3C6D1", "#363A48"],
  ["muted", "#7D8294", "#676C7C"],
  ["item", "rgba(255,255,255,.04)", "rgba(15,17,23,.03)"],
  ["field", "rgba(20,22,30,.95)", "#FFFFFF"],
  ["panel", "rgba(255,255,255,.025)", "rgba(255,255,255,.6)"],
  ["hair", "rgba(255,255,255,.07)", "rgba(15,17,23,.08)"],
  ["faint", "rgba(255,255,255,.14)", "rgba(15,17,23,.14)"],
  ["accent", "#C4B5FD", "#6D28D9"],
  ["tint", "rgba(167,139,250,.14)", "rgba(124,58,237,.08)"],
  ["glow", "rgba(167,139,250,.28)", "rgba(124,58,237,.20)"],
  ["glow-2", "rgba(34,211,238,.16)", "rgba(6,182,212,.14)"],
  ["on-grad", "#08090D", "#FFFFFF"],
  ["ok", "#4ADE80", "#15803D"],
  ["thumb", "linear-gradient(160deg,#2a2f42,#151823)", "linear-gradient(160deg,#e1e4ec,#cdd1db)"],
  ["badge-ring", "#08090D", "#FFFFFF"],
];

describe("Just Echo tokens", () => {
  it.each(ROWS)("--je-%s dark/light", (name, d, l) => {
    expect(dark).toContain(norm(`--je-${name}: ${d};`));
    expect(light).toContain(norm(`--je-${name}: ${l};`));
  });

  it("defines radii", () => {
    expect(dark).toContain("--je-r-control: 8px;");
    expect(dark).toContain("--je-r-item: 12px;");
    expect(dark).toContain("--je-r-box: 22px;");
  });

  it("puts color and font-family in the single .je rule", () => {
    expect(dark).toContain("color: var(--je-ink);");
    expect(dark).toContain("font-family: var(--font-satoshi);");
    const count = (css.match(/(^|[}\s])\.je\s*\{/g) || []).length;
    expect(count).toBe(1);
  });

  function lum(hex: string) {
    const n = parseInt(hex.slice(1), 16);
    const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function contrast(a: string, b: string) {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  }
  const hexRows = Object.fromEntries(ROWS.map(([n, d, l]) => [n, { d, l }]));
  it.each(["ink", "ink-2", "muted", "accent", "ok"])("%s >= 4.5:1 on canvas", (n) => {
    expect(contrast(hexRows[n].d, hexRows.canvas.d)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(hexRows[n].l, hexRows.canvas.l)).toBeGreaterThanOrEqual(4.5);
  });

  it("wiring", () => {
    expect(globals).toContain('@import "./just-echo.css";');
    expect(css).toContain("prefers-reduced-motion: reduce");
  });
});
