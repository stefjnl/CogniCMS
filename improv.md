# CogniCMS AI Chat - Intent Resolution & Context-Awareness

## Problem Statement

The AI chatbot fails to reliably execute content changes even when:
1. User provides clear intent ("change the title")
2. AI asks clarifying questions (correct behavior)
3. User provides clear answer ("page title")

**Root Cause Hypothesis:** The conversation flow breaks down between clarification and execution. The AI either:
- Loses context of what the user wanted after clarification
- Doesn't map user's response back to the correct field
- Fails to execute the tool call with correct parameters

---

## TDD Approach: Define Success First

### Test Scenarios

Before changing any code, these scenarios must pass:

```
SCENARIO 1: Direct unambiguous request
────────────────────────────────────────
User: "Change the page title to 'Zincafé Drenthe'"
Expected: 
  - AI executes updateContent tool
  - sectionId: "metadata" (or wherever page title lives)
  - field: "title"
  - newValue: "Zincafé Drenthe"
  - Change object created with correct values
  - Preview updates showing new title
Result: PASS / FAIL

SCENARIO 2: Ambiguous request → Clarification → Execution
────────────────────────────────────────
User: "Change the title to 'Zincafé Drenthe'"
AI: Lists options (page title, section headings, etc.)
User: "page title"
Expected:
  - AI maps "page title" to correct field (metadata.title)
  - Executes updateContent tool immediately
  - Does NOT ask another question
  - Change object created
  - Preview updates
Result: PASS / FAIL

SCENARIO 3: Context-aware request (section selected)
────────────────────────────────────────
State: User has selected "Introductie" section in ContentTree
User: "Change the heading"
Expected:
  - AI uses selected section as context
  - Either executes directly OR confirms: "Change 'Waarom een Zincafé?' to what?"
  - Does NOT list all 8 headings
Result: PASS / FAIL

SCENARIO 4: Follow-up in same conversation
────────────────────────────────────────
User: "Change the title to 'Test'"
AI: Executes, creates change
User: "Actually make it 'Test 2'"
Expected:
  - AI understands "it" refers to the title just changed
  - Updates the same field
  - Previous change replaced OR new change created
Result: PASS / FAIL

SCENARIO 5: User provides partial answer
────────────────────────────────────────
User: "Update the contact info"
AI: "Which contact info? Email, phone, or address?"
User: "email"
AI: "What should the new email be?"
User: "info@zincafe.nl"
Expected:
  - AI executes with email field and new value
  - Complete flow without loops or confusion
Result: PASS / FAIL
```

---

## Implementation Tasks

### Task 1: Add Selected Section Context to AI

**Goal:** AI knows which section (if any) the user has selected in the ContentTree.

**Current State:** AI only receives message history, not UI state.

**Required Change:**

```typescript
// In ChatInterface.tsx or parent component

// 1. Track selected section
const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

// 2. Pass to chat as system context
const systemContext = useMemo(() => {
  let context = `You are editing the website: ${siteName}`;
  
  if (selectedSectionId) {
    const section = content.sections.find(s => s.id === selectedSectionId);
    if (section) {
      context += `\n\nUSER CONTEXT: The user is currently viewing the "${section.label}" section.`;
      context += `\nIf they refer to "the heading", "the title", "the text", etc. without specification, assume they mean this section.`;
      context += `\nSection contents: ${JSON.stringify(section.content, null, 2)}`;
    }
  }
  
  return context;
}, [selectedSectionId, content, siteName]);

// 3. Include in chat request
const { messages, append } = useChat({
  api: `/api/chat/${siteId}`,
  body: {
    systemContext, // Pass this to the API
  },
});
```

**API Side (route.ts):**

```typescript
// In app/api/chat/[siteId]/route.ts

export async function POST(req: Request) {
  const { messages, systemContext } = await req.json();
  
  const systemPrompt = buildSystemPrompt(siteId, systemContext);
  
  // ... rest of handler
}
```

---

### Task 2: Improve Intent Extraction in System Prompt

**Goal:** AI reliably extracts and remembers: WHAT to change, WHERE to change it, WHAT the new value should be.

**Add to System Prompt (`lib/ai/prompts.ts`):**

```typescript
export const CHAT_SYSTEM_PROMPT = `
You are an AI assistant helping edit a website. You can view and modify website content.

## INTENT EXTRACTION RULES

For every user request, extract THREE things:
1. TARGET: What element to change (page title, section heading, paragraph, email, etc.)
2. LOCATION: Which section/area (metadata, header, specific section ID)
3. NEW VALUE: What to change it to (may need to ask if not provided)

## HANDLING AMBIGUITY

When the user's request is ambiguous:
1. List the options clearly with numbers
2. Show the CURRENT VALUE for each option
3. Ask which one they mean
4. REMEMBER their choice for the next message

Example:
User: "Change the title"
You: "I found multiple titles:
1. Page title (browser tab) - currently: 'Old Title'
2. Hero heading - currently: 'Welcome'
Which one?"
User: "1" OR "page title" OR "the first one"
You: [IMMEDIATELY execute the change, do not ask again]

## CRITICAL: AFTER CLARIFICATION

When the user answers a clarifying question:
- Map their response to the correct option
- Execute the tool call IMMEDIATELY
- Do NOT ask another clarifying question unless new information is needed
- Valid responses include: numbers ("1"), names ("page title"), or descriptions ("the first one")

## RESPONSE MAPPING

User says → Maps to:
- "1", "first", "first one" → Option 1 from your list
- "2", "second" → Option 2 from your list
- "page title", "browser title", "SEO title" → metadata.title
- "heading", "main heading" → section.content.heading
- "the one I'm looking at" → Use selectedSection from context

## CONVERSATION MEMORY

Within a conversation, remember:
- What field was just discussed/changed
- If user says "it", "that", "the same thing" → refers to last mentioned field
- If user says "actually", "no wait", "change that to" → modifying previous request

## EXECUTION CHECKLIST

Before calling updateContent tool, verify you have:
- [ ] sectionId (required)
- [ ] field name (required)  
- [ ] newValue (required)

If any is missing, ask for ONLY the missing piece.

## EXAMPLES OF CORRECT BEHAVIOR

User: "change heading to Test"
Context: User viewing "Introductie" section
Action: updateContent(sectionId: "introductie", field: "heading", newValue: "Test")

User: "change the title to Zincafé Drenthe"
You: "I found 8 titles. Which one? [list]"
User: "page title"
Action: updateContent(sectionId: "metadata", field: "title", newValue: "Zincafé Drenthe")
[Execute immediately, no more questions]

User: "update email"
You: "What should the new email be?"
User: "test@test.com"
Action: updateContent(sectionId: "contact", field: "email", newValue: "test@test.com")
`;
```

---

### Task 3: Fix Tool Execution After Clarification

**Problem:** AI asks clarification, user answers, but tool doesn't execute.

**Hypothesis:** The AI generates a text response instead of a tool call after clarification.

**Debug Steps:**

```typescript
// In route.ts, add logging to see what AI returns after clarification

const result = await streamText({
  model: anthropic('claude-3-5-sonnet-20241022'),
  messages: convertedMessages,
  tools: contentTools,
  system: systemPrompt,
  onFinish: (result) => {
    console.log('=== AI RESPONSE DEBUG ===');
    console.log('Tool calls:', result.toolCalls);
    console.log('Text:', result.text?.substring(0, 200));
    console.log('Last user message:', messages[messages.length - 1]?.content);
    console.log('========================');
  },
});
```

**If tool calls are empty after user clarifies:**

The problem is prompt engineering. The AI needs stronger instruction to execute after clarification.

**Add to system prompt:**

```
## MANDATORY EXECUTION RULE

If you asked a clarifying question AND the user's response answers that question:
→ You MUST call the appropriate tool in your next response
→ You MUST NOT respond with only text
→ If you find yourself typing an explanation instead of calling a tool, STOP and call the tool

Example of WRONG behavior:
User: "page title"
You: "Great, I'll update the page title to 'Zincafé Drenthe'." [NO TOOL CALL - WRONG]

Example of CORRECT behavior:
User: "page title"
You: [calls updateContent tool with correct parameters] "Done! I've updated the page title."
```

---

### Task 4: Add Conversation State Tracking

**Goal:** Track the "pending intent" when AI asks for clarification.

```typescript
// New type for tracking conversation state
interface ConversationState {
  pendingIntent?: {
    action: 'update' | 'delete' | 'add';
    possibleTargets: Array<{
      sectionId: string;
      field: string;
      currentValue: string;
      label: string; // "Page title", "Hero heading", etc.
    }>;
    newValue?: string; // If user already provided this
  };
  lastModified?: {
    sectionId: string;
    field: string;
  };
}

// In ChatInterface.tsx
const [conversationState, setConversationState] = useState<ConversationState>({});

// When AI asks clarifying question, parse and store the options
// When user responds, match their response to stored options
```

**Alternative: Let AI Handle State (Simpler)**

Instead of client-side state tracking, instruct AI to include state in its responses:

```typescript
// System prompt addition
`
## STATE MANAGEMENT

When you ask a clarifying question, end your message with a hidden state block:

<!--STATE:{"pendingAction":"update","targets":[{"id":"metadata","field":"title","label":"Page title"},{"id":"hero","field":"heading","label":"Hero heading"}],"newValue":"Zincafé Drenthe"}-->

When user responds, parse this state from your previous message to remember context.
`
```

---

### Task 5: Create Clickable Clarification Options (UX Enhancement)

**Goal:** Instead of user typing "page title", they click a button.

```typescript
// In ChatInterface.tsx

// Detect when AI message contains numbered options
const parseOptions = (message: string): ClarificationOption[] | null => {
  const optionRegex = /(\d+)\.\s+(.+?)\s+-\s+currently:\s+'([^']+)'/g;
  const matches = [...message.matchAll(optionRegex)];
  
  if (matches.length === 0) return null;
  
  return matches.map(match => ({
    number: match[1],
    label: match[2].trim(),
    currentValue: match[3],
  }));
};

// Render options as buttons
const MessageContent = ({ message }: { message: Message }) => {
  const options = parseOptions(message.content);
  
  if (options && message.role === 'assistant') {
    return (
      <div>
        <p>{message.content.split(/\d+\./)[0]}</p> {/* Intro text */}
        <div className="flex flex-wrap gap-2 mt-3">
          {options.map((opt) => (
            <button
              key={opt.number}
              onClick={() => handleOptionClick(opt.number)}
              className="text-sm px-3 py-2 rounded-lg bg-white border border-gray-200
                         hover:border-blue-500 hover:bg-blue-50 text-left"
            >
              <span className="font-medium">{opt.label}</span>
              <span className="block text-xs text-gray-500 truncate max-w-[200px]">
                {opt.currentValue}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }
  
  return <p>{message.content}</p>;
};

// When option clicked, send as message
const handleOptionClick = (optionNumber: string) => {
  append({ role: 'user', content: optionNumber });
};
```

---

## Testing Protocol

### Manual Test Sequence

Run these tests after implementation:

```
TEST 1: Basic clarification flow
──────────────────────────────
1. Open chat
2. Type: "Change the title to Test123"
3. AI should list options
4. Click or type "page title"
5. ✓ VERIFY: Change object created for metadata.title = "Test123"
6. ✓ VERIFY: Preview shows "Test123" in browser tab

TEST 2: Context-aware request
──────────────────────────────
1. In ContentTree, click on "Introductie" section
2. Type: "Change the heading to NewHeading"
3. ✓ VERIFY: AI either executes directly OR asks only for confirmation
4. ✓ VERIFY: Does NOT list all 8 headings

TEST 3: Follow-up reference
──────────────────────────────
1. Type: "Change page title to Test"
2. Wait for change
3. Type: "Actually make it Test2"
4. ✓ VERIFY: Same field (page title) updated to Test2

TEST 4: Multi-step clarification
──────────────────────────────
1. Type: "Update contact info"
2. AI asks which contact field
3. Type: "email"
4. AI asks for new value
5. Type: "new@email.com"
6. ✓ VERIFY: Contact email updated, no loops

TEST 5: Number response
──────────────────────────────
1. Type: "Change the heading"
2. AI lists numbered options
3. Type: "3"
4. ✓ VERIFY: Option 3 is executed, not another question
```

### Automated Test Suggestions

```typescript
// __tests__/ai-intent.test.ts

describe('AI Intent Resolution', () => {
  it('should execute tool after clarification response', async () => {
    const messages = [
      { role: 'user', content: 'Change title to Test' },
      { role: 'assistant', content: 'I found multiple titles:\n1. Page title - currently: "Old"\n2. Hero heading - currently: "Welcome"\nWhich one?' },
      { role: 'user', content: '1' },
    ];
    
    const response = await callChatAPI(messages);
    
    expect(response.toolCalls).toHaveLength(1);
    expect(response.toolCalls[0].name).toBe('updateContent');
    expect(response.toolCalls[0].args.field).toBe('title');
  });

  it('should use selected section context', async () => {
    const messages = [
      { role: 'user', content: 'Change the heading to Test' },
    ];
    
    const response = await callChatAPI(messages, {
      systemContext: 'User is viewing "Introductie" section with heading "Waarom een Zincafé?"',
    });
    
    expect(response.toolCalls[0].args.sectionId).toBe('introductie');
  });
});
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `lib/ai/prompts.ts` | Add intent extraction rules, clarification handling, mandatory execution rule |
| `app/api/chat/[siteId]/route.ts` | Accept systemContext, add debug logging |
| `components/editor/ChatInterface.tsx` | Pass selectedSectionId, parse clarification options |
| `components/editor/ContentTree.tsx` | Emit selection events |
| `app/editor/[siteId]/page.tsx` | Wire up selection state between components |

---

## Success Criteria

Implementation is complete when:

- [ ] All 5 manual test scenarios pass
- [ ] AI executes tool call immediately after user clarifies (no extra questions)
- [ ] Selected section context reduces unnecessary clarification
- [ ] "it"/"that" references work within conversation
- [ ] Console logs show tool calls happening after clarification
- [ ] No regression: existing manual editing still works

---

## Debugging Checklist

If tests fail, check in this order:

1. **Console logs:** Is AI returning tool calls or just text?
2. **System prompt:** Is the mandatory execution rule present?
3. **Context passing:** Is selectedSectionId reaching the API?
4. **Message history:** Are all messages (including clarification) being sent?
5. **Tool definition:** Does updateContent tool accept the parameters AI is sending?

---

## Summary

The core fix is **prompt engineering** + **context passing**:

1. **Tell AI to execute after clarification** (not ask more questions)
2. **Pass selected section** so AI has context
3. **Add response mapping** so AI understands "1", "page title", "first one"
4. **Optional:** Parse options into clickable buttons for better UX

The AI already asks good clarifying questions. The problem is it doesn't reliably execute after getting an answer. The mandatory execution rule in the system prompt should fix this.