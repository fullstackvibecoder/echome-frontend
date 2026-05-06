# Specification: Zero-Step UI Components

## 1. Intent-Driven "Ghost" UI
Replace empty dashboards with **Outcome Chips** based on data-state health signals:
- **State: Pre-Data** -> "Bring my book over from [Prior Platform]".
- **State: Partial-Data** -> "Who do I need to follow up with today?".
- **State: Full-Data** -> "Draft a 'Mind-Reader' post based on my last closing".

## 2. The "Receipt" Card Pattern
Every AI side-effect (sending, scheduling, extracting) must return a structured card:
- **Summary**: Plain English action (e.g., "Sent a check-in to 20 past clients").
- **The "Why"**: The trigger logic (e.g., "These 20 people haven't heard from you in 6 months").
- **Psychological Scorecard**:
    - **Problem Sold?** ✅
    - **Process Highlighted?** ✅
    - **Vision Painted?** ✅
- **Undo/Edit**: Single click to "Hold" or "Change Criteria".

## 3. The Nurture Monitor (Morning Brief)
- [cite_start]**Trigger**: Drop in upload frequency (Informed Pessimism / "Valley of Despair")[cite: 562, 567].
- **Feature**: Proactive chat prompt: "I know you're busy. Send me a 30-second voice note about your day, and I'll build your Authority posts for the week".