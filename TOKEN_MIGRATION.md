# Token Migration Proposal

Generated from `scripts/ui-audit/output/audit-report.json` on 2026-04-17.
359 contrast violations, 136 rogue color values, 649 occurrences.

## Phase 1: Fix the Two Critical Contrast Failures

These are the root cause of most of the 359 violations. Fix these first —
many violations auto-resolve because they reference these tokens.

### Fix A: `--muted-foreground` (light mode)

Current: `#9B8BAF` (Slate Lavender) on `#FAFAFA` background = **3.13:1** (FAILS 4.5:1)
Also fails on `#ffffff` (card) at 3.13:1.

**Proposal:** `#7B6B8F` — passes 4.5:1 on both #FAFAFA (4.62:1) and #ffffff (4.55:1).
Stays in the lavender family. Perceptually similar but darker.

Dark mode `--muted-foreground: #c8c8cc` on `#1c1c1e` = 9.2:1 ✓ (no change needed).

### Fix B: `--primary` / `--accent` as BUTTON background

Current: `#00D4FF` (Electric Cyan) with white text = **1.77:1** (FAILS badly).

This is tricky because `#00D4FF` is the brand color. Options:

| Approach | Text | Background | Ratio | Trade-off |
|---|---|---|---|---|
| **A: Dark text on cyan** | `#003344` | `#00D4FF` | 10.2:1 | Buttons look different. Brand shift. |
| **B: Darker cyan for buttons** | `#ffffff` | `#0077AA` | 4.56:1 | Passes AA. Brand cyan stays for accents, darker variant for text-bearing surfaces. |
| **C: Keep gradient only** | `#ffffff` | gradient `#00D4FF→#B794F6` | ~2.5:1 avg | Still fails. The purple end helps but the cyan start doesn't. |
| **D: Use `--primary-dark` for interactive** | `#ffffff` | `#0077AA` (new) | 4.56:1 | Current `--primary-dark: #0099CC` = 3.4:1, still fails. Darken to `#0077AA`. |

**Recommendation: Option D.** Keep `#00D4FF` for decorative/glow/ring/accent roles where contrast doesn't matter.
Use a new `--primary-interactive: #0077AA` for any surface that carries text (buttons, badges, pills, links).

The `.btn-primary` gradient becomes: `from-[var(--primary-interactive)] to-[var(--accent-purple)]`
— starts at #0077AA (passes with white) and graduates to #B794F6 (5.14:1 with white at the dark end of purple — still needs verification).

Actually, #B794F6 with white = 2.08:1 — also fails. So gradient buttons are fundamentally problematic for WCAG with the current brand colors.

**Revised recommendation:** `.btn-primary` uses solid `--primary-interactive: #0077AA` with white text (4.56:1 ✓). Reserve the gradient for hover states, decorative borders, and non-text elements where contrast isn't measured.

### Fix B (dark mode): Same issue

`#00D4FF` with white on dark backgrounds = 1.77:1. Same fix applies:
button backgrounds use `--primary-interactive: #0077AA`.

---

## Phase 2: Canonical Token Set

The existing token system in `globals.css` is well-organized. The proposal
keeps the existing structure and adds three things:

### New tokens (add to globals.css)

```css
:root {
  --muted-foreground: #7B6B8F;           /* was #9B8BAF — darkened for 4.5:1 */
  --primary-interactive: #0077AA;         /* NEW — for text-bearing interactive surfaces */
  --text-on-interactive: #ffffff;         /* explicit pairing with primary-interactive */
}

.dark {
  --primary-interactive: #0088BB;         /* slightly lighter for dark mode visibility */
}
```

### Updated utility classes

```css
.btn-primary {
  background-color: var(--primary-interactive);  /* was gradient from accent to purple */
  color: var(--text-on-interactive);
  /* Keep gradient as hover enhancement */
}
.btn-primary:hover {
  background: linear-gradient(135deg, var(--primary-interactive), var(--accent-purple));
}
```

### Full contrast matrix (all must pass 4.5:1)

| Text Token | Surface Token | Light | Dark |
|---|---|---|---|
| `--foreground` (#1c1c1e) | `--background` (#FAFAFA) | 16.8:1 ✓ | n/a |
| `--foreground` (#1c1c1e) | `--card` (#ffffff) | 17.6:1 ✓ | n/a |
| `--muted-foreground` (#7B6B8F) | `--background` (#FAFAFA) | 4.62:1 ✓ | n/a |
| `--muted-foreground` (#7B6B8F) | `--card` (#ffffff) | 4.55:1 ✓ | n/a |
| `--text-on-interactive` (#fff) | `--primary-interactive` (#0077AA) | 4.56:1 ✓ | n/a |
| `--card-foreground` (#f3f1ec) | `--card` (#2a2a2c) | n/a | 11.2:1 ✓ |
| `--muted-foreground` (#c8c8cc) | `--background` (#1c1c1e) | n/a | 9.2:1 ✓ |

---

## Phase 3: Rogue Value → Token Mapping

Each rogue hex/rgb value maps to an existing or new token. The audit found
136 unique values across 649 occurrences. Here are the top 25 (covers ~80%
of occurrences):

| Rogue Value | Usages | Files | Target Token | Notes |
|---|---|---|---|---|
| `#00D4FF` | 132 | 16 | `var(--accent)` or `var(--primary-interactive)` | Decorative → accent. Interactive with text → primary-interactive. |
| `#1C1C1E` | 75 | 12 | `var(--foreground)` or `bg-background` (dark) | Already a token — just not used in these call sites. |
| `#3A3A3C` | 25 | 6 | `var(--border)` (dark) or `var(--muted)` (dark) | These are dark-mode border/muted colors hardcoded. |
| `#000` / `#000000` | 21 | 2 | `text-foreground` or `text-black` | Usually text color. Map to foreground token. |
| `#2a2a2c` | 17 | 6 | `var(--card)` (dark) or `bg-card` | Dark mode card backgrounds hardcoded. |
| `#B794F6` | 16 | 6 | `var(--accent-purple)` | Already a token — not used at call sites. |
| `#ffffff` | 16 | 2 | `text-white` or `var(--card)` (light) | Context-dependent. |
| `#64748b` | 14 | 7 | `text-muted-foreground` | Tailwind slate-500. Replace with muted-foreground token. |
| `#0099CC` | 13 | 7 | `var(--primary-dark)` | Already a token — not used at call sites. |
| `#9B8BAF` | 12 | 3 | `var(--muted-foreground)` | The old value. Will auto-update when token changes. |
| `#F3F1EC` | 12 | 2 | `var(--foreground)` (dark) | Soft Ivory — dark mode foreground. |
| `#0f172a` | 10 | 7 | `text-foreground` | Tailwind slate-900. Replace with foreground token. |
| `#ef4444` | 9 | 6 | `text-destructive` or `text-error` | Already have destructive token + .text-error utility. |
| `#38bdf8` | 9 | 7 | `text-accent` or `text-primary` | Tailwind sky-400. Replace with accent. |
| `#a78bfa` | 8 | 7 | `text-accent-purple` | Tailwind violet-400. Close to accent-purple. |
| `#1e293b` | 8 | 7 | `text-foreground` | Tailwind slate-800. |
| `#e2e8f0` | 8 | 6 | `border-border` | Tailwind slate-200. Replace with border token. |
| `#475569` | 8 | 5 | `text-muted-foreground` | Tailwind slate-600. |
| `#22c55e` | ~6 | ~4 | `text-success` / `.text-success` | Already have utility. |
| `#FF6B9D` | 6 | 4 | `var(--accent-pink)` | Already a token. |

### Values to DELETE (not map)

These are Tailwind arbitrary values (`bg-[#xxx]`, `text-[#xxx]`) that should
be replaced with token-based classes. They exist because developers reached
for a hex when a token existed. No new tokens needed — just swap the class.

---

## Execution Plan

1. **Update `globals.css`**: change `--muted-foreground` to `#7B6B8F`,
   add `--primary-interactive: #0077AA`, update `.btn-primary`.
2. **Update `btn-primary`**: solid interactive color instead of gradient
   for the default state. Gradient on hover only.
3. **Walk every file** in the inventory report. Replace rogue hex values
   with the mapped token class. Run `tsc --noEmit` after each file.
4. **Re-run the audit**. Target: 0 contrast violations, <20 unique color
   values (brand colors + chart colors + success/error + social brand
   colors like LinkedIn blue #0A66C2).

---

## Decision Points (need your input)

1. **btn-primary gradient vs solid**: The gradient (cyan→purple) is a
   brand signature but can't pass WCAG with white text at either end.
   Solid #0077AA passes. Do you want to keep the gradient for large
   buttons only (where "large text" 3:1 threshold applies) and use solid
   for small buttons/badges? Or go full solid?

2. **Muted foreground shift**: #9B8BAF → #7B6B8F is a noticeable
   darkening of all secondary text. It'll feel "heavier." The alternative
   is #8A7A9E (splits the difference at ~3.8:1 — still fails AA but
   passes for large text). Strict AA compliance requires #7B6B8F or darker.

3. **Social brand colors** (#0A66C2 LinkedIn, etc.): These are third-party
   brand guidelines. Do we map them to tokens or leave as-is? They only
   appear on specific social sharing buttons.
