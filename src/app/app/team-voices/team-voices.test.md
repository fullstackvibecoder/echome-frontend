# TeamVoicesContent Component - Hooks Compliance Fix

## Issue Fixed
Sentry Error: "Rendered more hooks than during the previous render"
Location: /app/team-voices
Sentry URL: https://sentry.io/organizations/bottleneck-labs/issues/105792113

## Root Cause
The component had **conditional early returns after hooks were already called**, violating the Rules of Hooks:

```tsx
// ❌ WRONG - Hooks violation
export default function TeamVoicesContent() {
  const { voices, isTeamsUser, loading: voiceLoading } = useVoiceContext();
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  // ... more hooks ...
  
  if (voiceLoading) {  // ❌ Early return after hooks!
    return <LoadingView />;
  }
  
  if (!isTeamsUser) {  // ❌ Another early return!
    return <UpgradeView />;
  }
  
  const [moreState, setMoreState] = useState(false);  // ❌ This hook might not run!
}
```

## Fix Applied
Moved all conditional returns to the **end** of the component, after all hooks have been called:

```tsx
// ✅ CORRECT - Hooks compliance
export default function TeamVoicesContent() {
  // All hooks called consistently on every render
  const { voices, isTeamsUser, loading: voiceLoading } = useVoiceContext();
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  // ... all other hooks ...
  useEffect(() => { /* ... */ }, []);
  const callback = useCallback(() => { /* ... */ }, []);
  
  // Conditional renders moved to end
  if (voiceLoading) {
    return <LoadingView />;
  }
  
  if (!isTeamsUser) {
    return <UpgradeView />;
  }
  
  return <MainContent />;
}
```

## React Rules of Hooks
1. **Only call hooks at the top level** - never inside loops, conditions, or nested functions
2. **Call hooks in the same order every time** - ensures React can correctly preserve hook state between re-renders
3. **All hooks must be called before any conditional returns**

## Testing
This fix ensures that:
- The same hooks are called in the same order on every render
- React's internal hook indexing remains consistent
- No "Rendered more hooks than during the previous render" errors occur
- Component state is properly preserved across re-renders

## Files Modified
- `src/app/app/team-voices/TeamVoicesContent.tsx` - Fixed hooks violation by moving conditional returns after all hooks