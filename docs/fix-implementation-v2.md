# AI Chatbot Preview Fix - Implementation V2

## Changes Applied

### Problem Analysis

After the initial fix (adding `source: "ai"` attribution), the following issues remained:

1. **Preview not updating:** AI changes appeared in "Current Site Content" but not in Site Preview
2. **20 changes from 1 edit:** A single heading update generated 20 pending changes
3. **Root cause:** `baselineRef` was already being updated correctly, but `metadata.lastModified` changes were creating noise

### Solutions Implemented

#### 1. Added Debug Logging

**Files Modified:**

- `components/editor/ChatInterface.tsx`
- `lib/hooks/usePreviewUpdate.ts`

**Changes:**

- Added console.log statements throughout the data flow
- Logs baseline vs nextContent comparison
- Logs raw changes, filtered changes, and attributed changes
- Logs preview update triggers

**Purpose:** Identify exactly where the flow breaks during testing

#### 2. Filter metadata.lastModified Changes

**Location:** `components/editor/ChatInterface.tsx`

**Functions Modified:**

- `refreshDraft` (lines 172-210)
- `handleDiscardChange` (lines 472-510)

**Implementation:**

```typescript
// Filter out automatic metadata.lastModified changes (always updated by applyToolActions)
const meaningfulChanges = changes.filter(
  (change) =>
    !(change.sectionId === "metadata" && change.field === "lastModified")
);
```

**Rationale:**

- `applyToolActions` in `lib/ai/tools.ts:148-149` automatically updates `metadata.lastModified` on EVERY tool execution
- This creates a spurious change that's not meaningful to the user
- Filtering reduces noise and prevents "1 edit = 2 changes" (the real edit + timestamp)

#### 3. Enhanced Preview Update Logging

**Location:** `lib/hooks/usePreviewUpdate.ts`

**Changes:**

- Log when `updatePreview` is called
- Log the number of changes received
- Log API request/response status
- Log when requests are aborted

**Purpose:** Verify the preview update hook receives changes and generates HTML

---

## Testing Instructions

### Start Dev Server

```powershell
npm run dev
```

### Open Browser Console

Press `F12` to open DevTools, navigate to Console tab

### Test Flow

1. **Navigate to editor page** for any site
2. **Send AI message:** "Change the heading to 'TEST'"
3. **Watch console output** (should see):

```
[DEBUG refreshDraft] Baseline: { metadata: {...}, sections: [...] }
[DEBUG refreshDraft] NextContent: { metadata: {...}, sections: [...] }
[DEBUG refreshDraft] Raw changes: [Array(N)]
[DEBUG refreshDraft] Meaningful changes after filter: [Array(N-1)]  ← Should be smaller
[DEBUG refreshDraft] Attributed changes: [Array(N-1)]
[DEBUG Preview Effect] previewChanges updated: [Array(N-1)]
[DEBUG Preview Effect] Calling updatePreview...
[DEBUG usePreviewUpdate] Called with changes: [Array(N-1)]
[DEBUG usePreviewUpdate] Sections count: X
[DEBUG usePreviewUpdate] Fetching preview from API...
[DEBUG usePreviewUpdate] Preview generated successfully, length: XXXXX
```

4. **Check UI:**

   - ✅ "Proposed Changes" panel shows changes
   - ✅ Changes are under "🤖 AI Suggestions" section
   - ✅ Site Preview shows updated heading (should say "TEST")
   - ✅ Change count should be **1-2** (not 20)

5. **Approve and test again:**
   - Click "Approve & Publish"
   - Wait for publish to complete
   - Send another AI message: "Change heading to 'TEST2'"
   - **Verify:** Only 1 change appears (not cumulative)

### Expected Behavior

#### First AI Edit

- **Before:** 20 changes, no preview update
- **After:** 1 change (heading update), preview updates

#### Second AI Edit (After Approve)

- **Before:** 20+ changes (cumulative from all previous edits)
- **After:** 1 change (only the latest edit)

**Key Indicator:** Console should show:

```
[DEBUG onSuccess] Updating baseline to: { ... }
```

This confirms baseline is updated after publish.

---

## Diagnostic Guide

### Issue: Preview Still Doesn't Update

**Check Console For:**

1. **`updatePreview` called?**

   ```
   [DEBUG usePreviewUpdate] Called with changes: [...]
   ```

   - **If missing:** Effect dependency issue
   - **If present:** Continue to next check

2. **API call successful?**

   ```
   [DEBUG usePreviewUpdate] Preview generated successfully
   ```

   - **If missing:** Check Network tab for `/api/preview/[siteId]` errors
   - **If 500 error:** Check terminal for server-side errors

3. **Changes have source?**
   ```
   [DEBUG refreshDraft] Attributed changes: [{ source: 'ai', ... }]
   ```
   - **If source is undefined:** Attribution logic failed
   - **If source is 'ai':** Preview should work

### Issue: Still Seeing 20+ Changes

**Check Console For:**

1. **Baseline structure:**

   ```
   [DEBUG refreshDraft] Baseline: { ... }
   [DEBUG refreshDraft] NextContent: { ... }
   ```

   - **Compare structures:** Are they drastically different?
   - **Check sections format:** Array vs Object?

2. **Filter working?**

   ```
   [DEBUG refreshDraft] Raw changes: Array(20)
   [DEBUG refreshDraft] Meaningful changes after filter: Array(19)
   ```

   - **If same length:** Filter logic not working
   - **If reduced:** Metadata filter works, but other issues remain

3. **Baseline not updating?**
   - After publish, send another AI message
   - Check for: `[DEBUG onSuccess] Updating baseline to: { ... }`
   - **If missing:** Publish success callback not firing

**Possible Causes:**

1. **Structure mismatch:** HTML extraction creates different structure than content.json
2. **Baseline never updates:** Check `onSuccess` callback in `usePublishHandler`
3. **Deep object comparison issue:** Differ flags unchanged nested objects as changed

---

## Code Changes Summary

### components/editor/ChatInterface.tsx

**Lines 89-93:** Added baseline update logging

```typescript
console.log("[DEBUG onSuccess] Updating baseline to:", draftContent);
```

**Lines 156-162:** Added preview effect logging

```typescript
console.log("[DEBUG Preview Effect] previewChanges updated:", previewChanges);
console.log("[DEBUG Preview Effect] Calling updatePreview...");
```

**Lines 172-210:** Enhanced refreshDraft with logging and filtering

```typescript
// Debug logging
console.log("[DEBUG refreshDraft] Baseline:", baselineRef.current);
console.log("[DEBUG refreshDraft] NextContent:", nextContent);
console.log("[DEBUG refreshDraft] Raw changes:", changes);

// Filter metadata.lastModified
const meaningfulChanges = changes.filter(
  (change) =>
    !(change.sectionId === "metadata" && change.field === "lastModified")
);

console.log(
  "[DEBUG refreshDraft] Meaningful changes after filter:",
  meaningfulChanges
);
// ... attribution logic
console.log("[DEBUG refreshDraft] Attributed changes:", attributedChanges);
```

**Lines 472-510:** Added filtering to handleDiscardChange

```typescript
// Filter out metadata.lastModified changes
const meaningfulChanges = changes.filter(
  (change) =>
    !(change.sectionId === "metadata" && change.field === "lastModified")
);
```

### lib/hooks/usePreviewUpdate.ts

**Lines 39-88:** Added comprehensive logging

```typescript
console.log("[DEBUG usePreviewUpdate] Called with changes:", changes);
console.log("[DEBUG usePreviewUpdate] Sections count:", sections.length);
// ... various logging throughout
console.log(
  "[DEBUG usePreviewUpdate] Preview generated successfully, length:",
  html.length
);
```

---

## Next Steps

### If Issues Persist

1. **Capture console logs** from full flow (AI message → publish)
2. **Inspect baseline vs nextContent structures** in console
3. **Check Network tab** for API errors
4. **Check terminal** for server-side errors

### If Working Correctly

1. **Remove debug logging** (or gate behind `NODE_ENV === 'development'`)
2. **Add unit tests** for:
   - `refreshDraft` with metadata.lastModified filtering
   - `handleDiscardChange` with source preservation
3. **Document baseline update strategy** in architecture docs

### Potential Enhancements

1. **Smart filtering:** Filter out any "no-op" changes (old value === new value)
2. **Structure normalization:** Ensure consistent array/object format before diffing
3. **Granular baseline:** Track baseline per section, not just page-level
4. **Change merging:** Combine consecutive edits to same field into single change

---

## Success Criteria

- [x] TypeScript compilation succeeds
- [x] No build errors
- [x] Debug logging added
- [x] metadata.lastModified filtered out
- [ ] AI changes appear in preview (requires user testing)
- [ ] Change count is 1-2 per edit, not 20 (requires user testing)
- [ ] Console logs show correct data flow (requires user testing)
- [ ] No console errors during AI editing (requires user testing)

---

## Rollback Plan

If this introduces regressions:

```powershell
git diff HEAD components/editor/ChatInterface.tsx
git diff HEAD lib/hooks/usePreviewUpdate.ts
git checkout HEAD -- components/editor/ChatInterface.tsx lib/hooks/usePreviewUpdate.ts
```

Or create a feature flag:

```typescript
const DEBUG_AI_EDITING = process.env.NODE_ENV === "development";

if (DEBUG_AI_EDITING) {
  console.log("[DEBUG] ...");
}
```

---

**Implementation Date:** 2025-11-02  
**Status:** Ready for Testing  
**Build Status:** ✅ Passing
