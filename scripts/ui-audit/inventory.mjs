#!/usr/bin/env node
/**
 * Walks the UI source tree and reports:
 *   1. Component variant drift (how many distinct prop signatures exist for <Button>, <Card>, ...)
 *   2. Rogue color values (every hex / rgb / hsl literal outside the token system)
 * Writes output/inventory-report.json.
 */
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, join, dirname, extname, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = resolve(__dirname, 'inventory.config.json');
const OUT_DIR = resolve(__dirname, 'output');

if (!existsSync(CONFIG_PATH)) {
  console.error('Missing inventory.config.json. Copy inventory.config.example.json to inventory.config.json and edit sourceRoot.');
  process.exit(1);
}

const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
const ROOT = resolve(__dirname, config.sourceRoot);
mkdirSync(OUT_DIR, { recursive: true });

const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'build', 'coverage', '.turbo', 'public']);
const CODE_EXT = new Set(['.tsx', '.jsx', '.ts', '.js']);
const STYLE_EXT = new Set(['.css', '.scss', '.sass', '.less']);
const ALL_EXT = new Set([...CODE_EXT, ...STYLE_EXT]);
const TARGETS = new Set(config.components);

function hashString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h.toString(16);
}

function* walk(dir) {
  let entries;
  try { entries = readdirSync(dir); } catch { return; }
  for (const name of entries) {
    if (SKIP_DIRS.has(name) || name.startsWith('.')) continue;
    const p = join(dir, name);
    let s;
    try { s = statSync(p); } catch { continue; }
    if (s.isDirectory()) yield* walk(p);
    else if (ALL_EXT.has(extname(p))) yield p;
  }
}

const inventory = {};
const colorHits = [];
const COMPONENT_OPEN = /<([A-Z][A-Za-z0-9]*)\b([^>]*?)\/?>/g;
const TOKEN_HEX = /#[0-9a-fA-F]{3,8}\b/g;
const TOKEN_RGB = /rgba?\([^)]+\)/g;
const TOKEN_HSL = /hsla?\([^)]+\)/g;

let scannedFiles = 0;
for (const file of walk(ROOT)) {
  const rel = relative(ROOT, file);
  const ext = extname(file);
  let content;
  try { content = readFileSync(file, 'utf8'); } catch { continue; }
  scannedFiles++;

  if (CODE_EXT.has(ext)) {
    let m;
    while ((m = COMPONENT_OPEN.exec(content)) !== null) {
      const [full, name, attrs] = m;
      if (!TARGETS.has(name)) continue;
      const line = content.slice(0, m.index).split('\n').length;
      const variantMatch = attrs.match(/\bvariant\s*=\s*["'{]([^"'}]+)/);
      const sizeMatch = attrs.match(/\bsize\s*=\s*["'{]([^"'}]+)/);
      const colorMatch = attrs.match(/\b(color|intent|tone)\s*=\s*["'{]([^"'}]+)/);
      const classMatch = attrs.match(/\bclassName\s*=\s*["']([^"']+)/);
      const signature = JSON.stringify({
        variant: variantMatch?.[1] ?? null,
        size: sizeMatch?.[1] ?? null,
        color: colorMatch?.[2] ?? null,
        classHash: classMatch ? hashString(classMatch[1]) : null,
      });
      if (!inventory[name]) {
        inventory[name] = { totalUsages: 0, signatures: {}, files: new Set(), samples: [] };
      }
      const slot = inventory[name];
      slot.totalUsages++;
      slot.signatures[signature] = (slot.signatures[signature] || 0) + 1;
      slot.files.add(rel);
      if (slot.samples.length < 20) {
        slot.samples.push({ file: rel, line, snippet: full.replace(/\s+/g, ' ').slice(0, 200) });
      }
    }
  }

  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const text = lines[i];
    for (const re of [TOKEN_HEX, TOKEN_RGB, TOKEN_HSL]) {
      re.lastIndex = 0;
      let mm;
      while ((mm = re.exec(text)) !== null) {
        if (mm[0] === '#' || mm[0].length < 4) continue;
        colorHits.push({ file: rel, line: i + 1, value: mm[0], context: text.trim().slice(0, 140) });
      }
    }
  }
}

const inventoryOut = {};
for (const [name, data] of Object.entries(inventory)) {
  const variants = Object.entries(data.signatures)
    .map(([sig, count]) => ({ ...JSON.parse(sig), count }))
    .sort((a, b) => b.count - a.count);
  inventoryOut[name] = {
    totalUsages: data.totalUsages,
    uniqueVariantSignatures: variants.length,
    variants,
    fileCount: data.files.size,
    files: [...data.files].slice(0, 50),
    samples: data.samples,
  };
}

const colorMap = new Map();
for (const hit of colorHits) {
  const key = hit.value.toLowerCase().replace(/\s+/g, '');
  if (!colorMap.has(key)) colorMap.set(key, { value: hit.value, occurrences: [] });
  colorMap.get(key).occurrences.push({ file: hit.file, line: hit.line, context: hit.context });
}
const colorReport = [...colorMap.values()]
  .map(e => ({
    value: e.value,
    occurrenceCount: e.occurrences.length,
    fileCount: new Set(e.occurrences.map(o => o.file)).size,
    occurrences: e.occurrences.slice(0, 10),
  }))
  .sort((a, b) => b.occurrenceCount - a.occurrenceCount);

const result = {
  generatedAt: new Date().toISOString(),
  sourceRoot: config.sourceRoot,
  scannedFiles,
  componentInventory: inventoryOut,
  tokenAudit: {
    uniqueColorValues: colorMap.size,
    totalColorOccurrences: colorHits.length,
    values: colorReport,
  },
};

writeFileSync(resolve(OUT_DIR, 'inventory-report.json'), JSON.stringify(result, null, 2));
console.log(`Scanned ${scannedFiles} files.`);
console.log(`Tracked components: ${Object.keys(inventoryOut).length}. Unique color values: ${colorMap.size}. Color occurrences: ${colorHits.length}.`);
console.log(`Wrote ${resolve(OUT_DIR, 'inventory-report.json')}`);
