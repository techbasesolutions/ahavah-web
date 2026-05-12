# Sub-plan 11 — Audit TODO Close-out (Inbox Search + Chat Send)

> **For agentic workers:** REQUIRED SUB-SKILL — superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the two dead-button `TODO` markers left in `/inbox` and `/chat/[id]` during the 2026-05-11 audit pass. Both fix is fully client-side — no backend needed. Both surfaces appear functional today but tapping the controls is a silent no-op, which is worse UX than a clearly-not-implemented affordance.

**Architecture:** Inbox Search is a kit-composed `Sheet` overlay with a single `Input` that filters the local `CHATS` array by case-insensitive substring on name + last message. Chat Send maintains a local `useState<Message[]>` of optimistically-sent messages that render below the seeded thread; on Send tap, the typed text appends + the input clears. No persistence (refresh wipes new messages — acceptable for the stub phase, identical pattern to `/discover` decisions before Sub-plan 10's persistence layer).

**Tech Stack:** Existing kit only. No new dependencies. No new tokens. Tests via vitest.

---

## Context

The 2026-05-11 audit Tasks 17 + 18 left two explicit TODO comments:

1. **`src/app/inbox/page.tsx`** Search button (commit `789b8b7`):
   ```tsx
   {/* TODO(inbox-search): Search button needs an onClick that opens a
       search Sheet (filter by name / message content). Renders today
       for visual completeness but tap is a no-op. */}
   <Button size="circle" tone="elevated" aria-label="Search messages">
   ```

2. **`src/app/chat/[id]/page.tsx`** ChatInput onSend (commit `789b8b7`):
   ```tsx
   {/* TODO(chat-send): ChatInput defaults onSend to undefined here, so
       tap-send is a no-op. Real backend will wire a send handler that
       pushes the typed message into the thread + persists. */}
   <ChatInput />
   ```

PROJECT-STATUS.md §17 (the Sub-plan 10 closure) lists "Inbox + Chat send wiring" as an outstanding sub-plan. This is that sub-plan.

**What this sub-plan is NOT:**
- Not a real backend integration (no WebSocket, no fetch).
- Not a typing-indicator system (no presence).
- Not a message-receive simulation (the other party is silent).
- Not search across message-body content of *seeded* messages — only the last-message-preview text in `CHATS`. Searching seeded message bodies inside threads is out of scope.

Both surfaces preserve their seeded UX exactly; this sub-plan adds the interactive layer that was deferred during the audit.

---

## File Structure

| File | Role |
|---|---|
| `src/app/inbox/page.tsx` | MODIFY. Wire Search button → opens an inline Sheet with an Input. Filter `CHATS` by `query` (case-insensitive substring on `name` + `msg`). Drop the TODO comment. |
| `src/app/chat/[id]/page.tsx` | MODIFY. Maintain `useState<SentMessage[]>` of session-local sent messages. Render them after the seeded bubbles. Wire `ChatInput.onSend`. Drop the TODO comment. |
| `src/components/app/chat-input.tsx` | MODIFY (minor). Hoist the input's internal `value` state OR expose a controlled `value` + `onChange` shape so the parent can clear after send. Current: input is uncontrolled. |
| `tests/lib/inbox-filter.test.ts` | NEW (small). 4 cases on the pure filter function extracted from /inbox. |

**No new atoms.** Both wirings use existing kit primitives (Sheet, Input, Button, TextBubble).

---

## Hard rules (lifted from PROJECT-STATUS §9 + Sub-plan 10's discipline)

1. **TDD on pure logic.** The inbox filter is a pure function; test it before the component consumes it.
2. **Kit-only via cva.** No new className overrides on Button/Input/Sheet. If the search Sheet needs a different size, extend the Sheet primitive via cva — don't inline className.
3. **Symmetric with Sub-plan 10.** `useState` for ephemeral state, callback handlers, kit-composed UI.
4. **No accidental scope.** Don't refactor `CHATS` shape, don't touch the chat-bubble seed, don't change message-rendering semantics. Add the interactive layer; preserve everything else.
5. **TODOs removed.** Both `TODO(inbox-search)` and `TODO(chat-send)` comment blocks must be gone after the respective task lands.
6. **Verify in browser.** Per failure pattern §9 #7, both wirings need a browser smoke walk before commit, not just typecheck.

---

## Tasks

### Task 1 — Inbox filter (pure logic + tests)

**Files:**
- Create: `src/lib/inbox-filter.ts`
- Test: `tests/lib/inbox-filter.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// tests/lib/inbox-filter.test.ts
import { describe, expect, it } from "vitest";
import { filterChats, type ChatSummary } from "@/lib/inbox-filter";

const CHATS: ChatSummary[] = [
  { id: "adina",   name: "Adina",   age: 24, msg: "Say hi!" },
  { id: "rivka",   name: "Rivka",   age: 31, msg: "Photo" },
  { id: "esther",  name: "Esther",  age: 28, msg: "Hey, how are you?" },
  { id: "tirzah",  name: "Tirzah",  age: 22, msg: "is typing…" },
  { id: "daniel",  name: "Daniel",  age: 32, msg: "Shalom — looking forward." },
];

describe("inbox-filter", () => {
  it("filterChats with empty query returns the full list", () => {
    expect(filterChats(CHATS, "")).toEqual(CHATS);
    expect(filterChats(CHATS, "   ")).toEqual(CHATS);
  });

  it("filterChats matches on name (case-insensitive)", () => {
    const result = filterChats(CHATS, "Adi");
    expect(result.map((c) => c.id)).toEqual(["adina"]);

    const lowered = filterChats(CHATS, "ESTHER");
    expect(lowered.map((c) => c.id)).toEqual(["esther"]);
  });

  it("filterChats matches on last-message preview (case-insensitive)", () => {
    const result = filterChats(CHATS, "shalom");
    expect(result.map((c) => c.id)).toEqual(["daniel"]);
  });

  it("filterChats returns multiple matches across name + msg fields", () => {
    const result = filterChats(CHATS, "h");
    // h matches: Hey (esther), Shalom (daniel) — and 'h' in tirzah's
    // msg 'is typing' — wait no, 'typing' has no h. Esther name has H.
    // Adina msg "Say hi" — has h. Rivka "Photo" — has h.
    // So multiple: adina, rivka, esther, daniel.
    expect(result.map((c) => c.id).sort()).toEqual(
      ["adina", "daniel", "esther", "rivka"],
    );
  });

  it("filterChats returns [] when no match", () => {
    expect(filterChats(CHATS, "xyz")).toEqual([]);
  });
});
```

Run `npx vitest run tests/lib/inbox-filter.test.ts` → FAIL (module missing).

- [ ] **Step 2: Implement `src/lib/inbox-filter.ts`**

```ts
/**
 * Pure case-insensitive substring filter for the /inbox chat list.
 * Matches against `name` OR `msg`. Empty / whitespace-only query
 * returns the full list (no filtering). Used by the Inbox Search
 * Sheet — symmetric with the decision-engine pattern (pure logic
 * in lib, consumed by a React state in the page).
 */

export type ChatSummary = {
  id: string;
  name: string;
  age: number;
  msg: string;
};

export function filterChats<T extends ChatSummary>(
  chats: ReadonlyArray<T>,
  query: string,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...chats];
  return chats.filter(
    (c) =>
      c.name.toLowerCase().includes(q) || c.msg.toLowerCase().includes(q),
  );
}
```

- [ ] **Step 3: Run tests, expect 5/5 pass.**

`npx vitest run tests/lib/inbox-filter.test.ts`

- [ ] **Step 4: Full suite stays green**

`npx vitest run` → 213/213 (208 + 5 new).

- [ ] **Step 5: Lint**

`pnpm exec eslint --max-warnings=0 src/lib/inbox-filter.ts tests/lib/inbox-filter.test.ts`

- [ ] **Step 6: Commit**

```bash
git add src/lib/inbox-filter.ts tests/lib/inbox-filter.test.ts
git commit -m "feat(inbox): pure case-insensitive chat-list filter + tests"
```

---

### Task 2 — Wire Inbox Search Sheet

**Files:**
- Modify: `src/app/inbox/page.tsx`

- [ ] **Step 1: Add state + imports**

In `src/app/inbox/page.tsx`, add:

```tsx
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { filterChats } from "@/lib/inbox-filter";
```

Inside `InboxContent()`, add:

```tsx
const [searchOpen, setSearchOpen] = useState(false);
const [query, setQuery] = useState("");
```

- [ ] **Step 2: Filter the chats array before rendering**

Where `chats` is currently `state === "empty" ? [] : CHATS`, wrap with the filter:

```tsx
const baseChats = state === "empty" ? [] : CHATS;
const chats = filterChats(baseChats, query);
```

- [ ] **Step 3: Replace the Search Button with a Sheet trigger**

Find the existing block:

```tsx
{/* TODO(inbox-search): ... */}
<Button size="circle" tone="elevated" aria-label="Search messages">
  <Search className="text-white" />
</Button>
```

Replace with:

```tsx
<Sheet open={searchOpen} onOpenChange={setSearchOpen}>
  <SheetTrigger asChild>
    <Button size="circle" tone="elevated" aria-label="Search messages">
      <Search className="text-white" />
    </Button>
  </SheetTrigger>
  <SheetContent side="top">
    <SheetHeader>
      <SheetTitle>Search messages</SheetTitle>
    </SheetHeader>
    <div className="mt-4 px-1">
      <Input
        autoFocus
        size="lg"
        tone="elevated"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or last message"
        aria-label="Search query"
      />
    </div>
  </SheetContent>
</Sheet>
```

Drop the `TODO(inbox-search)` comment block entirely.

- [ ] **Step 4: Make the empty-filter state distinguishable**

If `chats.length === 0 && query.length > 0`, the existing `state === "empty"` branch renders the "No conversations yet" state — wrong message. Adjust the body selector:

```tsx
const body =
  state === "loading" ? (
    <InboxLoadingSkeleton />
  ) : state === "error" ? (
    <InboxErrorState />
  ) : chats.length === 0 ? (
    query.length > 0 ? (
      <InboxNoSearchResults query={query} />
    ) : (
      <InboxEmptyState />
    )
  ) : (
    <ChatList chats={chats} />
  );
```

Add a new state branch component:

```tsx
function InboxNoSearchResults({ query }: { query: string }) {
  return (
    <motion.div
      {...fadeUp}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="contents"
    >
      <EmptyState
        variant="no-search-results"
        description={`No conversations match "${query}".`}
      />
    </motion.div>
  );
}
```

(`no-search-results` is already a variant on the `EmptyState` atom — confirmed in commit `789b8b7` consumer table.)

- [ ] **Step 5: TypeCheck + lint + browser smoke**

```bash
npx tsc --noEmit
pnpm exec eslint --max-warnings=0 src/app/inbox/page.tsx
npx vitest run
```

Browser smoke walk:
1. `browser_resize 414 896`
2. `browser_navigate http://localhost:3000/inbox`
3. Verify chat list renders all 7 seeded chats.
4. Tap Search circle → Sheet slides in from top with focused Input.
5. Type "esth" → list narrows to Esther.
6. Clear the input → full list returns.
7. Type "zzz" → "no-search-results" empty state with the typed query in the description.
8. Close the Sheet (X or Esc) → search query persists in state (deliberate; reopen shows the previous query). If product wants reset-on-close, that's a follow-up.

- [ ] **Step 6: Commit**

```bash
git add src/app/inbox/page.tsx
git commit -m "feat(inbox): wire Search button to filter Sheet; drop TODO"
```

---

### Task 3 — Wire ChatInput Send + local message state

**Files:**
- Modify: `src/components/app/chat-input.tsx`
- Modify: `src/app/chat/[id]/page.tsx`

- [ ] **Step 1: Make ChatInput controlled**

Current `ChatInput` keeps the input uncontrolled — no way for the parent to clear after send. Change to a controlled shape:

In `src/components/app/chat-input.tsx`, change the props type:

```ts
type ChatInputProps = {
  placeholder?: string;
  value: string;
  onChange: (next: string) => void;
  onAttach?: () => void;
  onSend?: () => void;
};
```

Update the JSX to use the controlled value + onChange:

```tsx
<Input
  size="lg"
  tone="elevated"
  placeholder={placeholder}
  aria-label="Type a message"
  className="flex-1"
  value={value}
  onChange={(e) => onChange(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === "Enter" && !e.shiftKey && value.trim().length > 0) {
      e.preventDefault();
      onSend?.();
    }
  }}
/>
```

(Keyboard Enter sends — standard messenger UX. Shift+Enter would insert a newline if the Input grows to a Textarea later.)

- [ ] **Step 2: Wire /chat/[id] state**

In `src/app/chat/[id]/page.tsx`, add a local sent-messages state below the existing `reportOpen` state:

```tsx
type SentMessage = { id: string; text: string };
const [draft, setDraft] = useState("");
const [sent, setSent] = useState<SentMessage[]>([]);

const handleSend = () => {
  const text = draft.trim();
  if (!text) return;
  setSent((prev) => [
    ...prev,
    { id: `${Date.now()}-${prev.length}`, text },
  ]);
  setDraft("");
};
```

Pass `draft / setDraft / handleSend` into `ChatInput`:

```tsx
<ChatInput
  value={draft}
  onChange={setDraft}
  onSend={handleSend}
/>
```

Render the sent messages below the seeded thread bubbles (after the last `TextBubble` in the messages region):

```tsx
{sent.map((m, i) => (
  <TextBubble
    key={m.id}
    side="me"
    delay={0.05 + i * 0.05}
  >
    {m.text}
  </TextBubble>
))}
```

Drop the `TODO(chat-send)` comment block above `<ChatInput />`.

- [ ] **Step 3: TypeCheck + lint + browser smoke**

```bash
npx tsc --noEmit
pnpm exec eslint --max-warnings=0 src/components/app/chat-input.tsx src/app/chat/\[id\]/page.tsx
npx vitest run
```

Browser smoke walk:
1. `browser_resize 414 896`
2. `browser_navigate http://localhost:3000/chat/esther`
3. Verify seeded thread renders (5 bubbles: greeting / reply / photo / voice / question).
4. Type "Hi Esther" in the composer → text appears in the Input.
5. Tap Send (or press Enter) → new "Hi Esther" bubble appears at the bottom on the `me` side.
6. Input clears.
7. Type another message → repeats; second bubble appended.
8. Reload page → typed messages gone (no persistence, intentional).

- [ ] **Step 4: Commit**

```bash
git add src/components/app/chat-input.tsx src/app/chat/\[id\]/page.tsx
git commit -m "feat(chat): controlled ChatInput + local sent-messages state; drop TODO"
```

---

### Task 4 — Verify & document

- [ ] **Step 1: Full test suite**

`npx vitest run` → 213/213 pass (208 + 5 new from Task 1; Tasks 2-3 don't add tests because they're integration into existing screens).

- [ ] **Step 2: Production build**

`pnpm build` → clean.

- [ ] **Step 3: Final TODO check**

```bash
cd d:/Antigravity/ahavah-web
grep -rn 'TODO(inbox-search)' src/  # should return zero
grep -rn 'TODO(chat-send)' src/      # should return zero
```

- [ ] **Step 4: Append PROJECT-STATUS §18**

Brief section documenting Sub-plan 11 closure. Strike the "Inbox + Chat send wiring" bullet from §17's "Remaining sub-plans" list.

- [ ] **Step 5: Commit + merge to master**

```bash
git add PROJECT-STATUS.md
git commit -m "docs(status): record Sub-plan 11 closure (§18)"
# Then merge sub-plan-11-audit-todo-closeout to master via no-ff merge.
```

---

## Verification

### Per-task verification

1. `npx tsc --noEmit` clean.
2. `pnpm exec eslint --max-warnings=0` clean on touched files.
3. `npx vitest run` clean — at least 208 + 5 = 213 pass after Task 1.
4. Browser smoke walk demonstrates the behavior the commit message claims.

### Whole-sub-plan verification

1. Tests 213/213.
2. TypeCheck + lint clean.
3. `pnpm build` clean.
4. Both `TODO(inbox-search)` and `TODO(chat-send)` removed from `src/`.
5. PROJECT-STATUS.md §18 documents the closure.
6. Branch merged with `--no-ff`.

---

## Resources reused (verify before adding new)

- **`Sheet` + `SheetContent` + `SheetHeader` + `SheetTitle` + `SheetTrigger`** — `src/components/ui/sheet.tsx`. Already used in `/discover` filters, `/profile/[uuid]` compat-breakdown, `/chat/[id]` BlockReportSheet.
- **`Input`** — `src/components/ui/input.tsx`. `size="lg"` + `tone="elevated"` matches /onboarding inputs.
- **`Button`** — kit; no new variants.
- **`TextBubble`** — `src/components/app/chat-bubble.tsx`. Already supports `side="me"` + `delay` + `children` (motion entrance handled internally).
- **`EmptyState` variant `no-search-results`** — already supported per the EmptyState atom.

No new dependencies. No new atoms. Spec is additive to existing files.

---

## Self-review notes

- **Spec coverage:** Tasks 1+2 wire Inbox Search; Task 3 wires Chat Send; Task 4 closes out documentation. Both audit TODOs explicitly removed.
- **Placeholder scan:** No "TBD" / "appropriate" / "similar to". Every code block executable verbatim.
- **Type consistency:** `ChatSummary` defined in Task 1 reused by Task 2 (the `CHATS` array conforms to it). `SentMessage` is local to /chat/[id]; no cross-file leakage.
- **DRY trigger:** `filterChats` is generic over `T extends ChatSummary` so any future caller with extended fields works without changes. The 4-test coverage pins purity, case-insensitivity, multi-field match, no-match.
- **Scope fence:**
  - No backend.
  - No persistence on sent messages (refresh wipes).
  - No "your message was delivered" indicators (that's a backend-driven feature).
  - No search across seeded message-body text inside a thread (only the chat-list preview).
  - No animation on Sheet open beyond what kit ships.
- **Failure pattern guard:** Each task ends with explicit verification — typecheck + lint + tests + browser smoke. The smoke walk catches surface drift that the unit tests can't (e.g. AnimatePresence transition behavior, Sheet focus management).
