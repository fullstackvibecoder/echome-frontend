# CLAUDE CODE PROMPT: REBUILD HOMEPAGE (Real Content + Premium Design)

```
You are rebuilding the EchoMe homepage using real content from tryechome.com with a premium design system.

CONTEXT:
- Current homepage exists at tryechome.com with proven marketing content
- Need complete redesign with premium aesthetic
- Keep all original messaging (it's proven)
- Enhance copy only where genuinely better
- Design: Fraunces (display) + Karla (body) + Deep Purple #6366F1
- Vibe: Premium, intentional, sophisticated dark luxury
- Goal: Improve design/UX while preserving proven messaging

REFERENCE DOCUMENT: HOMEPAGE_DESIGN_SPEC_REAL_CONTENT.md

TASK: Rebuild homepage with exact specifications.

=== CRITICAL REQUIREMENTS ===

1. CONTENT (From Real Site - Keep as-is unless clearly improvable)
   ✅ Hero: "Unmute Yourself."
   ✅ Subheading: "Your voice has been trapped..."
   ✅ All feature descriptions exact
   ✅ All pricing exact ($19, $49, $99)
   ✅ All stats exact (12,847, 2.3M+, 47min)
   ✅ Echosystem™ (trademark)
   ✅ All 6 output formats with descriptions
   ✅ Voice Temperature levels (❄️ to 🚀)
   ✅ "The Secret ✨" section

2. TYPOGRAPHY (Exact Implementation)
   ✅ Fraunces Bold 72px for "Unmute Yourself"
   ✅ Karla Regular 20px for subheading
   ✅ Fraunces Bold 48px for section titles
   ✅ All font weights correct
   ✅ All line heights per spec
   ✅ All letter spacing per spec

3. COLORS (Exact Hex Codes)
   ✅ Background: #0A0E17
   ✅ Dark Surface: #0F1419
   ✅ Text Primary: #FFFFFF
   ✅ Text Secondary: #E2E8F0
   ✅ Text Tertiary: #94A3B8
   ✅ Text Muted: #64748B
   ✅ Accent: #6366F1
   ✅ All colors correct in all places

4. LAYOUT & SPACING (8px Grid)
   ✅ Hero: 120px padding top/bottom
   ✅ Sections: 120px padding top/bottom
   ✅ Container max-width: 1200px
   ✅ Gutter: 24px desktop / 16px mobile
   ✅ All spacing per spec

5. COMPONENTS
   ✅ Navbar (sticky, logo + nav links + Sign In)
   ✅ Hero section (headline + subheading + 2 CTAs + video)
   ✅ Social proof (3 stats displayed)
   ✅ Echosystem explanation
   ✅ Three input methods (Video, Voice, Import)
   ✅ Output formats (6 cards with icons)
   ✅ What makes Echo different (3 differentiators)
   ✅ Voice Temperature gamification (visual scale)
   ✅ The Secret section
   ✅ Pricing section (3 tiers, toggle monthly/annual)
   ✅ Comparison (Old way vs New way)
   ✅ Bottom CTA
   ✅ Footer

6. BUTTONS
   ✅ Primary: #6366F1, white text, 48px height
   ✅ Primary Hover: #818CF8, scale 1.02x, 0.2s
   ✅ Primary Active: #4F46E5, scale 0.98x
   ✅ Secondary: Outline style, #6366F1 border
   ✅ Full width on mobile

7. PRICING CARDS
   ✅ 3-column on desktop (2 on tablet, 1 on mobile)
   ✅ Feature lists with checkmarks
   ✅ "MOST POPULAR" badge on Creator tier
   ✅ Pricing toggle: Monthly / Annual (17% savings)
   ✅ Cards have hover effects (lift + shadow)

8. FEATURE CARDS (Input Methods, Output Formats)
   ✅ Consistent card styling
   ✅ Icons visible and aligned
   ✅ Titles, descriptions, stats clear
   ✅ Proper spacing and hierarchy

9. ANIMATIONS
   ✅ Page load: staggered fade-in
   ✅ Scroll reveals: cards fade + slide up
   ✅ Button hover: smooth color + scale
   ✅ Card hover: lift effect + shadow
   ✅ No jank (transform/opacity only)

10. RESPONSIVE
    ✅ Mobile: 48px headline, smaller padding
    ✅ Tablet: 2-column grids, balanced
    ✅ Desktop: 3-column grids, full features
    ✅ Touch targets: 48px minimum
    ✅ Text readable on all devices

=== SECTION-BY-SECTION REQUIREMENTS ===

NAVBAR
- Sticky positioning (#0F1419 background)
- Logo: "EchoMe" (Fraunces Bold 24px white)
- Nav links: [Features] [How It Works] [Pricing] [About]
- Right side: [Sign In] button (secondary style)
- Height: 64px, padding: 16px 48px
- Mobile: Collapse to hamburger menu
- Border bottom: 1px #1E293B

HERO SECTION
- Min height: 700px
- Padding: 120px 48px top/bottom
- Content centered
- Background: #0A0E17 with subtle gradient to #0F1419
- Components:
  * Headline: Fraunces Bold 72px white "Unmute Yourself."
  * Subheading: Karla Regular 20px #94A3B8, max-width 700px
  * Two CTAs: Primary "Enter Your Echosystem" + Secondary "See Echo in Action (45s)"
  * Optional: Video embed (45s) with play button below CTAs
  * Gap from headline to subheading: 24px
  * Gap from subheading to buttons: 40px
  * Gap from buttons to video: 40px

SOCIAL PROOF STATS
- Positioned in/after hero
- 3 stats in row: "12,847 Voices Amplified | 2.3M+ Echoes Created | 47min Saved Per Echo"
- Font: Karla Bold 16px white with description below (Karla Regular 12px #64748B)
- Gap between stats: 40px
- Centered

ECHOSYSTEM SECTION
- Background: #0F1419
- Padding: 120px 48px
- Title: Fraunces Bold 48px white "Welcome to Your Echosystem™"
- Copy: Karla Regular 18px #E2E8F0 (quoted text in spec)
- CTA Button: "Enter Your Echosystem" (primary, centered)
- Max-width text: 800px, centered
- Optional visual: diagram or animated flow diagram

THREE INPUT METHODS SECTION
- Background: #0A0E17
- Padding: 120px 48px
- Header: Fraunces Bold 48px white "Three ways in 🎯 One voice out 🚀"
- 3 cards in grid (1 on mobile, 2 on tablet, 3 on desktop)
- Each card:
  * Background: #0F1419 with 1px border #1E293B
  * Border radius: 12px
  * Padding: 32px
  * Icon: 48px (emoji or SVG)
  * Title: Fraunces Bold 28px white
  * Copy: Karla Regular 16px #E2E8F0
  * Benefit (bold): Karla Bold 14px #6366F1
  * Stat: Karla Regular 14px #94A3B8
  * Hover: lift (-4px) + shadow increase
- Gap between cards: 24px

OUTPUT FORMATS SECTION
- Background: #0F1419
- Padding: 120px 48px
- Header: Fraunces Bold 40px white "Then the magic happens ✨"
- Subheader: Karla Regular 18px #94A3B8
- "One Video Becomes All of This" section:
  * 6 cards in grid (1 mobile, 2 tablet, 3 desktop)
  * Each card:
    - Icon: 32px platform icon
    - Title: Fraunces Bold 24px white
    - Format: Karla Regular 15px #E2E8F0
    - Stat: Karla Bold 14px #6366F1
  * Cards have hover effect (lift + shadow)
  * Gap: 24px
- Summary stats row below:
  * "1 Video Input | 6 Content Formats | 15+ Platform Posts | 3min Processing"
  * Each stat: Fraunces Bold 32px accent color with label below

WHAT MAKES ECHO DIFFERENT SECTION
- Background: #0A0E17
- Padding: 120px 48px
- Header: Fraunces Bold 48px white "What Makes Echo Different 💎"
- 3 cards vertical stack (or horizontal on desktop)
- Each card:
  * Icon: 32px purple
  * Title: Fraunces Bold 24px white
  * Copy: Karla Regular 16px #E2E8F0
  * Benefit: Karla Bold 14px #6366F1
  * Card background: optional (#0F1419 with border or transparent)

VOICE TEMPERATURE SECTION
- Background: #0F1419
- Padding: 120px 48px
- Title: Fraunces Bold 48px white "Voice Temperature 🌡️"
- Subtitle: Karla Regular 18px #94A3B8
- Visual representation:
  * Horizontal scale or thermometer
  * 5 levels: ❄️ Cold → 🌤️ Warming → ☀️ Warm → 🔥 Hot → 🚀 On Fire
  * Each level: different opacity or color intensity
  * Interactive: hover shows description
- Supporting text: "Your knowledge base grows with every upload ✨"

THE SECRET SECTION
- Background: #0A0E17
- Padding: 120px 48px
- Centered, max-width 700px
- Title: Fraunces Bold 48px white "The Secret ✨"
- Subtitle: Fraunces Bold 32px accent #6366F1 "Echo learns you first. Creates later 🎯"
- Copy: Karla Regular 18px #E2E8F0 "Your Echo is why it sounds like you. Not generic AI."
- Key point: Fraunces Bold 24px white "Every Upload Strengthens Your Echo 💪"
- Explanation: Karla Regular 16px #E2E8F0 (full quoted text from spec)

PRICING SECTION
- Background: #0F1419
- Padding: 120px 48px
- Header: Fraunces Bold 48px white "Your voice, your way 🎨"
- Toggle: Monthly / Annual (shows "SAVE 17%")
- 3 cards in row (1 mobile, 2 tablet, 3 desktop)
- Each card:
  * Background: #0F1419 with 1px border #1E293B
  * Border radius: 12px
  * Padding: 40px
  * Title: Fraunces Bold 24px white
  * Price: Fraunces Bold 56px white
  * Period: Karla Regular 14px #64748B "/month"
  * CTA button: Primary, full width
  * Features list:
    - Each: Karla Regular 15px #E2E8F0
    - Checkmark: Purple #6366F1
    - Gap: 12px between items
  * "MOST POPULAR" badge (on Creator tier):
    - Karla Bold 12px #6366F1
    - Uppercase, positioned top-right
    - Optional: slightly different border color (accent)
  * Hover: scale 1.02x, shadow increase

COMPARISON SECTION
- Background: #0A0E17
- Padding: 120px 48px
- Title: Fraunces Bold 48px white "Stop Rewriting. Start Repurposing."
- 2 columns (desktop) / stack (mobile)
- Left column: "The Old Way"
  * Background: #0F1419 with subtle red-ish border (#EF4444 at 30% opacity)
  * 4 items with sad emojis
  * Each item: icon (emoji) + text (Karla Regular 16px #E2E8F0)
- Right column: "The EchoMe Way"
  * Background: #0F1419 with purple border (#6366F1 at 30% opacity)
  * 4 items with happy emojis
  * Each item: icon (emoji) + text (Karla Regular 16px #E2E8F0)
- Cards: 12px border radius, 32px padding, 48px gap between

BOTTOM CTA SECTION
- Background: Gradient (transparent #6366F1 at top to #0A0E17 at bottom)
- Padding: 80px 48px
- Centered, max-width 600px
- Title: Fraunces Bold 48px white "Ready to unmute yourself?"
- Subtext: Karla Regular 16px #94A3B8 (optional)
- Input + Button layout:
  * Input: email, #0F1419 bg, 1px #1E293B border, 48px height
  * Button: Primary "Enter Your Echosystem"
  * On desktop: flex row with gap 12px
  * On mobile: flex column, full width
  * Placeholder: "Your email"

FOOTER
- Background: #0F1419
- Padding: 48px
- Grid layout:
  * Logo/brand column
  * Links columns (Product, Company, etc.)
  * Social icons
- Copyright: Karla Regular 12px #475569 "© 2024 EchoMe Inc. All rights reserved. Made with ✨ for creators."

=== FILE STRUCTURE ===

```
app/
├── page.tsx (homepage main)
├── layout.tsx (root layout - update if needed)
└── components/
    ├── navbar.tsx
    ├── hero-section.tsx
    ├── social-proof.tsx
    ├── echosystem-section.tsx
    ├── input-methods.tsx
    ├── output-formats.tsx
    ├── what-makes-different.tsx
    ├── voice-temperature.tsx
    ├── the-secret.tsx
    ├── pricing-section.tsx
    ├── comparison-section.tsx
    ├── bottom-cta.tsx
    └── footer.tsx

styles/
├── globals.css (variables, reset)
└── animations.css (keyframes)

lib/
├── constants.ts (colors, spacing)
└── utils.ts (helpers)
```

=== CODE QUALITY STANDARDS ===

✅ TypeScript: Full type safety
✅ Components: Modular, reusable, functional
✅ Styling: Tailwind + custom CSS for animations
✅ Performance: Optimized images, lazy loading
✅ Accessibility: WCAG 2.1 AA, semantic HTML
✅ Responsiveness: Mobile-first approach
✅ Clean code: Comments, clear structure

=== VERIFICATION CHECKLIST ===

[ ] Hero headline "Unmute Yourself" exact
[ ] All copy from real site (no Lorem ipsum)
[ ] Pricing: $19, $49, $99 (exact)
[ ] Stats: 12,847, 2.3M+, 47min (exact)
[ ] All 6 output formats described
[ ] Voice Temperature scale visible
[ ] Pricing toggle works (Monthly/Annual)
[ ] "MOST POPULAR" badge on Creator tier
[ ] All buttons have hover states
[ ] All cards have hover lift effect
[ ] Mobile layout responsive
[ ] Touch targets 48px+
[ ] Animations smooth (no jank)
[ ] Colors exact (test in dev tools)
[ ] Typography hierarchy clear
[ ] Spacing consistent (8px grid)
[ ] No typos or errors
[ ] npm run build succeeds
[ ] No TypeScript errors
[ ] Responsive on all breakpoints
[ ] Contrast ratios 4.5:1+

=== SUCCESS CRITERIA ===

✅ Reads "Unmute Yourself" and understands value immediately
✅ Dark luxury aesthetic evident
✅ Typography hierarchy crystal clear
✅ All original content preserved (only minor improvements)
✅ Spacing generous and intentional
✅ Pricing clearly comparable
✅ Features understood at a glance
✅ Mobile experience perfect
✅ Animations smooth and purposeful
✅ Production-ready quality
✅ Visitor flows to signup or learns about product
✅ Feels premium and intentional (not generic)

=== DO NOT ===

❌ Change proven copy without good reason
❌ Use generic fonts or colors
❌ Forget responsive design
❌ Skip animations/micro-interactions
❌ Make buttons too small
❌ Use Lorem ipsum
❌ Vary from specification
❌ Rush quality
❌ Ignore accessibility

=== DO ===

✅ Read spec carefully
✅ Match every detail
✅ Preserve all real content
✅ Improve design/UX only
✅ Make it beautiful
✅ Make it work perfectly
✅ Make it accessible
✅ Make it production-ready
✅ Test thoroughly
✅ Ship with confidence

This is a complete homepage rebuild. Your proven marketing content deserves a beautiful design. Make it shine.
```

---

## 🚀 HOW TO EXECUTE

```bash
# Step 1: Create branch
git checkout main
git checkout -b homepage-rebuild

# Step 2: Backup current code
git add -A
git commit -m "Backup: Current homepage before redesign"

# Step 3: Run Claude Code
claude --dangerously-skip-permissions
# Paste this entire prompt

# Step 4: Verify locally
npm run dev
# Visit localhost:3000
# Check responsive design
# Test button interactions

# Step 5: Commit
git add -A
git commit -m "Rebuild: Homepage with premium design

- Use real content from tryechome.com
- Fraunces + Karla typography
- Dark luxury aesthetic
- Premium button styling
- Responsive design
- Smooth animations
- Production-ready"

# Step 6: Create PR
git push origin homepage-rebuild
gh pr create --title "Homepage Rebuild - Premium Design"

# Step 7: Merge and deploy
# After review and approval
```

---

**This homepage preserves your proven marketing content while giving it a premium, intentional design that reflects the quality of your product.**

Ready to execute? Copy this prompt and run it with Claude Code now. 🚀
