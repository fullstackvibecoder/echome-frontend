#!/usr/bin/env node
/**
 * lint-action-handlers — find action-named callbacks whose bodies only
 * touch UI state, never reaching an API call.
 *
 * Background: a download button in ClipEditorModal had `onExport={(clipId) =>
 * setExportingClipId(clipId)}`. The handler is named after an action ("Export")
 * but only opens a passive progress modal — the actual `POST .../export` call
 * was missing. The compiler is happy because the type signature is satisfied;
 * the user is unhappy because clicking does nothing real.
 *
 * This script greps the codebase for that shape and flags candidates for
 * human review. False positives are expected (e.g., a handler that opens a
 * modal which itself fires the API is fine but indistinguishable from one
 * that opens a passive modal). The output is a review aid, not a hard block.
 *
 * Usage (from project root):
 *   node scripts/lint-action-handlers.mjs
 *   node scripts/lint-action-handlers.mjs src/components/content-kit
 *
 * Exit codes: 0 = no findings, 1 = at least one suspicious handler.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.argv[2] || 'src';
const FILE_EXTS = ['.tsx', '.ts'];

// Verbs that imply a real action is expected (API call, navigation, etc.).
// Deliberately omitted: 'Cancel', 'Close', 'Dismiss' — these legitimately
// only flip UI state. 'Open' is also out — opening a modal IS the action
// for the caller; whether the modal then performs work is its own concern.
const ACTION_VERBS = [
  'Export', 'Schedule', 'Post', 'Publish', 'Send', 'Submit',
  'Save', 'Create', 'Update', 'Delete', 'Remove', 'Generate',
  'Download', 'Upload', 'Confirm', 'Approve', 'Reject',
  'Connect', 'Disconnect', 'Subscribe',
];

// Body patterns that indicate the handler does real work.
const ACTION_INDICATORS = [
  /\bapi\.\w/,                 // api.clips.exportClip(), api.scheduling.create()
  /\bapiClient\./,             // raw apiClient.post/get/...
  /\bawait\s+/,                // await ... — almost always async work
  /\bfetch\s*\(/,              // raw fetch
  /\bhandle[A-Z]\w*\s*\(/,     // delegation: handleDownloadClip(...), handleSchedule(...)
  /\bperform[A-Z]\w*\s*\(/,    // performExport(...)
  /\binvoke[A-Z]\w*\s*\(/,
  /\brun[A-Z]\w*\s*\(/,        // runMigration(...), runImport(...)
  /\bsubmit[A-Z]\w*\s*\(/,
  /\.mutate\s*\(/,             // tanstack-query
  /\.refetch\s*\(/,
  /\brefresh\s*\(/,
  /\breload\s*\(/,
  /\bdispatch\s*\(/,           // redux / state machines
  /\.send\s*\(/,
  /\.emit\s*\(/,
  /\.fire\s*\(/,
  /window\.open\s*\(/,         // navigation to a real URL counts as an action
  /\brouter\.(push|replace)\s*\(/,
  /\bnavigate\s*\(/,
  /\bnavigator\.clipboard/,    // copy-to-clipboard is a real user-visible effect
  /\.then\s*\(/,               // Promise chain implies async work
  /\.run\s*\(\s*\)/,           // Tiptap / commander-style: chain().focus().setImage().run()
  /\.chain\s*\(\s*\)/,         // Tiptap chain entrypoint
  /\bonSchedule\s*\(/,         // delegating to a sibling onSchedule callback
  /\bonPost\s*\(/,
  /\bonSubmit\s*\(/,
];

const SETSTATE_PATTERN = /\bset[A-Z]\w*\s*\(/g;

function* walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const path = join(dir, entry);
    let stat;
    try {
      stat = statSync(path);
    } catch {
      continue;
    }
    if (stat.isDirectory()) yield* walk(path);
    else if (FILE_EXTS.some(e => entry.endsWith(e))) yield path;
  }
}

/**
 * Extract the body of an `on<Verb>={...}` JSX prop with naive brace matching.
 * Returns null if the prop value is a bare reference (e.g., `onExport={handleExport}`)
 * since those delegate by definition.
 */
function extractHandlerBody(src, verb) {
  const findings = [];
  const propRegex = new RegExp(`\\bon${verb}\\s*=\\s*\\{`, 'g');
  let m;
  while ((m = propRegex.exec(src)) !== null) {
    let depth = 1;
    let i = m.index + m[0].length;
    const start = i;
    while (i < src.length && depth > 0) {
      const c = src[i];
      if (c === '{') depth++;
      else if (c === '}') depth--;
      i++;
    }
    if (depth !== 0) continue; // unbalanced — skip
    const body = src.slice(start, i - 1);
    findings.push({ body, index: m.index });
  }
  return findings;
}

const findings = [];

for (const file of walk(ROOT)) {
  let src;
  try {
    src = readFileSync(file, 'utf8');
  } catch {
    continue;
  }

  for (const verb of ACTION_VERBS) {
    for (const { body, index } of extractHandlerBody(src, verb)) {
      const trimmed = body.trim();

      // Skip bare references — `onExport={handleExport}` — those delegate by
      // definition; the linted body lives wherever handleExport is defined.
      if (/^[\w$.]+$/.test(trimmed)) continue;

      // Skip empty / no-op handlers — `onExport={() => {}}`.
      if (/^\(.*\)\s*=>\s*\{?\s*\}?$/.test(trimmed)) continue;

      // Skip async handlers — declared async almost certainly does API work.
      if (/\basync\b/.test(trimmed)) continue;

      const hasAction = ACTION_INDICATORS.some(re => re.test(trimmed));
      const setStateMatches = trimmed.match(SETSTATE_PATTERN) || [];

      // Suspicious shape: zero action indicators AND at least one setState
      // call. A handler that does nothing at all isn't necessarily a bug —
      // sometimes it's a placeholder. A handler that fires multiple state
      // setters but no action is the exact bug pattern we're hunting.
      if (!hasAction && setStateMatches.length >= 1) {
        const lineNum = src.slice(0, index).split('\n').length;
        findings.push({
          file: relative(process.cwd(), file),
          line: lineNum,
          handler: `on${verb}`,
          preview: trimmed.replace(/\s+/g, ' ').slice(0, 140),
        });
      }
    }
  }
}

if (findings.length === 0) {
  console.log('OK — no suspicious action handlers found.');
  process.exit(0);
}

console.log(`Found ${findings.length} action handler${findings.length === 1 ? '' : 's'} that only touch UI state:\n`);
for (const f of findings) {
  console.log(`  ${f.file}:${f.line}  ${f.handler}`);
  console.log(`    ${f.preview}${f.preview.length === 140 ? '...' : ''}`);
  console.log();
}
console.log('Each one needs a human eyeball:');
console.log('  - Does the handler open a modal/component that fires the API itself? Probably fine.');
console.log('  - Does it just toggle UI state and rely on something else "noticing"? Probably broken.');
console.log('  - The fix is usually to call a `handle<Action>` function that POSTs.');
console.log();
console.log('See scripts/lint-action-handlers.md for the story behind this script.');
process.exit(1);
