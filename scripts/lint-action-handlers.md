# lint-action-handlers — what is this and why does it exist

## The story in plain English

A user clicked **Download 1080p** on a video clip. The progress bar appeared. It crept up to 90%. Then it sat there.

Underneath, something embarrassing was happening: **nothing**. No video was being downloaded. No file was being made. The progress bar was a costume — pretty fabric draped over an empty room.

When we traced what was actually wired up, here's what the button was hooked to:

```jsx
onExport={(clipId) => {
  setClipEditorOpen(false);          // close the editor
  setActiveClipForEditor(null);      // forget which clip was open
  setExportingClipId(clipId);        // open the "exporting…" progress modal
}}
```

Read that carefully. The button is named **Export**. The handler is named **onExport**. But the body never *exports* anything. It only rearranges windows. The progress modal opens and listens politely for status updates from the server — but the server was never told to start. So the modal just shows whatever its default starting state is, forever.

The fix was a single line: also call the function that actually starts the export.

## Why didn't anything catch this?

This is the interesting part. A bunch of safety nets all said "looks fine":

- **TypeScript was happy.** The function signature said `(clipId: string) => void`, and our broken handler returned nothing — perfectly valid `void`. The compiler doesn't know that "Export" implies anything has to happen.
- **The build passed.** No syntax errors. No unused variables. Nothing red.
- **No exception was thrown.** There was no error to log to Sentry. The modal opened, the user waited, the server was idle. All quiet.
- **Manual testing didn't catch it** because the modal looked plausible at a glance — there's a spinning icon, a percentage, helpful messages cycling through. You'd have to either wait long enough to suspect something or open the browser's network tab and notice no request was ever made.

So the only thing that *could* have caught this was reading the code and asking: "does the handler named `onExport` actually export?" That's the question this script asks, mechanically, across the whole codebase.

## How did it happen in the first place?

The file containing this bug was created during a route rename — the team was moving pages from `/content-kit/[id]` to `/library/[id]`. Instead of renaming the existing file with `git mv` (which would have preserved every line), the file was rewritten from scratch. When you rewrite ~900 lines from memory, it's easy for a single line — the line that does the actual work — to get dropped. The mental model survives ("button click closes editor and shows progress"), but a critical detail evaporates.

This isn't a fault of any one developer. It's an architectural smell: a button's handler shouldn't be able to forget *the entire reason the button exists* and still pass every check.

## What the script does

It walks the codebase looking for JSX handlers named after actions: `onExport`, `onSchedule`, `onPost`, `onDelete`, `onPublish`, `onSave`, `onSubmit`, `onConfirm`, etc. For each one, it inspects the body and asks one question:

> Does this handler *do anything that looks like a real action*, or does it only push UI state buttons around?

A "real action" is anything that reaches the network or the world: an `api.*` call, an `await` that suggests async work, a delegation to a `handle<Something>` function, opening a URL, copying to the clipboard. A "UI state push" is calling `setX(...)` to flip a flag or open a modal.

If a handler has at least one `setX(...)` call and *zero* indicators of real work, it gets flagged. The reviewer (a human) then asks the same question we should have asked the first time:

- **Does the handler open a modal that itself calls the API?** That's fine. Move on.
- **Does it just open a passive viewer and hope someone else noticed?** That's the bug. Fix it.

## What this script *does not* do

This is **a review aid, not a hard block**. False positives are guaranteed:

- Handlers that open a modal which later calls the API will be flagged. (Indistinguishable by static analysis from the bug pattern.)
- Handlers that delegate via a state machine rather than a direct function call.
- Handlers that intentionally do nothing (rare but legitimate placeholder).

So don't bolt this to CI as a hard failure. Run it before opening a PR, look at the list, and decide. Two minutes of human attention catches the bug class with high confidence.

## How to run it

```bash
# from the project root
node scripts/lint-action-handlers.mjs

# scope to a folder
node scripts/lint-action-handlers.mjs src/components/content-kit
```

Exit code is `0` when clean, `1` when there's at least one flag. You can wire that into a pre-push git hook if you want a soft nudge.

## How to actually prevent this class of bug

The script catches the symptom. The deeper fixes are organizational:

1. **Use `git mv` for renames.** When a file gets recreated wholesale, every detail is one moment of inattention away from being lost. Renames should preserve the file's identity in git.
2. **Smoke-test the highest-stakes user actions after each deploy.** Three clicks — Download, Post Now on one platform, Schedule one item. Two minutes of work. Catches anything where the network request never fires.
3. **Move action ownership into the leaf component.** A button that says "Download" should be in a component that owns the download logic. Asking the parent to remember to wire the action is asking for a bug — exactly the bug we just had.

The script is the cheapest of those three. The others are slower changes, but they're the ones that make this whole class of bug structurally impossible.

---

*Born from the 2026-05-01 caption-edit deploy, when a perfectly happy progress bar was hiding the fact that no video was actually being made.*
