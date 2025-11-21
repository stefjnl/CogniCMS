# AI Ambiguity Resolution Fix - Test Guide

## Changes Applied

### System Prompt Enhancement (`lib/ai/prompts.ts`)

Added a **CRITICAL: AMBIGUITY RESOLUTION PROTOCOL** section that:

1. **Detects ambiguous "title" keyword** - When user says "title", "the title", or "change title" WITHOUT specifying "page title" or "metadata"
2. **Forces AI to ask for clarification** - Lists both page title (metadata) AND all section headings
3. **Prevents accidental metadata changes** - Only allows metadata.title changes with explicit confirmation

### Key Rules Added:

- **TERMINOLOGY AMBIGUITY**: "title" could mean page title OR section heading
- **EXPLICIT METADATA CHANGES**: Only change metadata when user says "page title", "metadata title", or "browser tab title"
- **SECTION HEADINGS PREFERRED**: When in doubt, assume section heading (but still ask)
- **HIGH-IMPACT CONFIRMATIONS**: Always ask before metadata changes, deletions, or multi-section changes

---

## Test Cases

### Test 1: Ambiguous "title" (Should Ask)

**User Input:**

```
change the title to TEST 123
```

**Expected AI Response:**

```
I found multiple things called 'title':
1. Page title (browser tab/SEO) - currently: 'Zincafé Zweeloo - Gesprekken die ertoe doen'
2. [Lists all sections with 'heading' fields and their current values]

Which one do you want to change?
```

**What Should NOT Happen:**

- ❌ AI directly changes metadata.title
- ❌ AI directly changes a section heading without asking

---

### Test 2: Explicit Page Title (Should Execute)

**User Input:**

```
change the page title to TEST 123
```

**Expected AI Response:**

```
I'll update the page title to "TEST 123".
[Executes updateMetadata tool]
```

**Result:**

- ✅ metadata.title changes to "TEST 123"
- ✅ Change appears in "Proposed Changes" panel
- ✅ Preview shows "TEST 123" in browser tab title (if visible)

---

### Test 3: Explicit Section Heading (Should Execute)

**User Input:**

```
update the intro heading to 'Welcome'
```

OR

```
change the Introductie - Waarom een Zincafé heading to 'Welcome'
```

**Expected AI Response:**

```
I'll change the intro section heading to "Welcome".
[Executes updateSectionText tool]
```

**Result:**

- ✅ Intro section heading changes to "Welcome"
- ✅ Change appears in "Proposed Changes" panel under "🤖 AI Suggestions"
- ✅ Preview updates to show "Welcome"

---

### Test 4: Ambiguous "heading" (Should Ask if Multiple Exist)

**User Input:**

```
change the heading to 'New Heading'
```

**Expected AI Response:**

```
I found multiple sections with headings:
- Introductie - Waarom een Zincafé: "Waarom een Zincafé?"
- Begeleiders: "Jouw begeleiders"
- Bijeenkomsten: "Vijf bijeenkomsten"
[...etc]

Which heading do you want to change?
```

---

### Test 5: After Disambiguation (Should Execute)

**User Input:**

```
change the title to TEST
```

**AI Response:**

```
Which one:
1. Page title
2. Intro heading
```

**User Follow-up:**

```
the page title
```

OR

```
option 1
```

**Expected AI Response:**

```
I'll update the page title to "TEST".
[Executes updateMetadata tool]
```

---

## Testing Procedure

### 1. Open Editor

Navigate to: http://localhost:3000/editor/[siteId]

### 2. Open Browser Console

Press `F12` → Console tab

### 3. Run Test Cases

For each test case above:

1. **Clear chat** (refresh page if needed to reset context)
2. **Send the user input** exactly as written
3. **Observe AI response**:
   - Does it ask for clarification? (expected for ambiguous cases)
   - Does it execute immediately? (expected for explicit cases)
4. **Check console logs**:
   ```
   [DEBUG refreshDraft] ...
   [DEBUG usePreviewUpdate] ...
   ```
5. **Verify UI**:
   - Proposed Changes panel shows correct change
   - Preview updates correctly
   - Source is "ai"

---

## Expected Behavior Summary

| User Input                 | AI Should            | Tool Executed     |
| -------------------------- | -------------------- | ----------------- |
| "change the title"         | ❓ Ask which title   | None (yet)        |
| "change the page title"    | ✅ Execute           | updateMetadata    |
| "change the intro heading" | ✅ Execute           | updateSectionText |
| "change the heading"       | ❓ Ask which heading | None (yet)        |
| "update metadata title"    | ✅ Execute           | updateMetadata    |

---

## Success Criteria

- [ ] Test 1: AI asks for clarification when "title" is ambiguous
- [ ] Test 2: AI executes when "page title" is explicit
- [ ] Test 3: AI executes when section heading is explicit
- [ ] Test 4: AI asks for clarification when "heading" is ambiguous
- [ ] Test 5: AI executes after disambiguation
- [ ] No metadata changes without explicit confirmation
- [ ] Console logs show proper data flow
- [ ] Preview updates correctly

---

## Debugging

### AI Still Changes Metadata Without Asking

**Check:**

1. **System prompt is being used**: Add console.log in `lib/ai/prompts.ts`:

   ```typescript
   const prompt = buildSystemPrompt(site, content);
   console.log("[SYSTEM_PROMPT]", prompt.substring(0, 500));
   ```

2. **Model is receiving the prompt**: Check NanoGPT API request in Network tab

3. **Model is respecting the prompt**: The AI model may need fine-tuning or a different approach

### AI Asks But Then Doesn't Wait

**This is expected behavior** - the AI will ask in the chat response, but won't execute a tool until the user clarifies. The user needs to send another message.

### AI Lists Options But Doesn't Format Well

**Adjust the prompt template** in `lib/ai/prompts.ts` to improve formatting:

```typescript
- YOU MUST ASK FOR CLARIFICATION - respond with:
  "I found multiple things called 'title':
  1. Page title (browser tab/SEO) - currently: '${content.metadata.title}'
  2. [List all sections with 'heading' fields and their current values]

  Which one do you want to change?"
```

---

## Rollback Plan

If this breaks AI functionality:

```powershell
# View changes
git diff lib/ai/prompts.ts

# Rollback
git checkout HEAD -- lib/ai/prompts.ts

# Rebuild
npm run build
npm run dev
```

---

## Next Steps

After verifying this works:

1. **Add context tracking** - Remember last edited section to improve disambiguation
2. **Add tool-level validation** - Reject metadata changes without confirmation
3. **Add UI hints** - Show user what fields are ambiguous
4. **Expand to other keywords** - "description", "heading", "text", etc.

---

**Implementation Date:** 2025-11-02  
**Status:** Ready for Testing  
**Dev Server:** http://localhost:3000
