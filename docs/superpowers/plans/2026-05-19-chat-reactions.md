# Chat Reactions (heart on double-tap / long-press) — Plan Stub

> **Status: STUB — awaiting brainstorming + spec.** Spawned from the 2026-05-19 Changes Document (item under /Chat). This plan needs to be filled in with detailed task breakdowns before execution. Do NOT execute as-is.

**Source request (PDF 2026-05-19, /Chat section):**
> Add a like (heart) action that a user can send by double-tapping or holding down on a message from another user.

---

## What this stub covers

A new product feature: lightweight reactions to chat messages. Today, ChatThreadView renders `TextBubble` components with no per-message interaction (other than appearing/scrolling). This adds:

1. Gesture detection (double-tap on touch, long-press on touch + desktop)
2. Visual reaction (heart) attached to the message
3. Persistence across sessions
4. Real-time delivery so the other user sees the reaction immediately

## Open questions that gate the plan

These need answers before any task can be written end-to-end. Use brainstorming skill before drafting tasks.

1. **Reaction set:** Heart only, or multiple emoji (Instagram-style)? PDF says "a like (heart) action" — singular. Assume HEART ONLY for v1.
2. **Send to self?** Can a user react to their OWN messages? PDF says "from another user" — so NO, self-reactions disabled.
3. **One-tap toggle vs accumulator?** Once you react, does another double-tap REMOVE the reaction, or stack a second one? Default: TOGGLE (idempotent, simpler model).
4. **Visual placement of the heart:** Inside the bubble? Below it? Floating? Per common patterns (iMessage, WhatsApp): floating to the side of the bubble, slightly overlapping.
5. **Animation:** Pop-in when reacted, fade-out when removed?
6. **Real-time delivery:** Push via existing chat WebSocket transport, or REST POST + server-push?
7. **Server endpoint:** REST `POST /messages/{id}/reactions` returning the message's reaction count? Or chat-protocol stanza?
8. **Long-press timing:** Standard 500ms? Should it open a context menu later (multiple reaction types) or fire heart immediately?
9. **Desktop equivalent of double-tap:** Double-click? Or only long-click?

## Sketch of phases (post-brainstorming)

Each is rough; fill in concrete tasks once decisions are made.

### Phase 1 — Backend
- DB migration: `message_reactions` table (`message_id`, `reactor_uuid`, `reaction_kind`, `created_at`)
- POST `/messages/{id}/reactions` — toggle reaction
- GET `/chats/{thread}/messages` — include reactions array in response
- Chat-WebSocket stanza: `<reaction message-id=... kind="heart" toggle="add|remove">`
- Tests: unit + integration

### Phase 2 — Frontend gesture detection
- New hook `useReactGesture(onReact)` — handles double-tap (touch) and long-press (touch + desktop pointer)
- Mounted on each `TextBubble` from the OTHER user (not self bubbles)
- Standardise 500ms long-press

### Phase 3 — Frontend display
- Update `TextBubble` to render attached reactions in a small chip
- Position: bottom-right of the bubble, partially overlapping
- Toggle animation via `motion/react` (pop-in 200ms, fade-out 150ms)

### Phase 4 — Real-time wiring
- chatClient: subscribe to reaction stanzas
- update React state on incoming reaction
- optimistic update on local send

### Phase 5 — UI + a11y polish
- Announce via `aria-live` when a reaction lands
- Keyboard: reactions reachable via Tab + Enter? (Not strictly required for v1)

---

## Next step before this plan can be executed

Run `superpowers:brainstorming` skill with this stub as the starting context. Answer the 9 open questions. Then come back and replace this stub with a full task-by-task plan.

## Estimated work after brainstorming

- Backend: 1 day (table + endpoint + websocket stanza + tests)
- Frontend: 1-2 days (gesture hook + bubble update + animation + real-time sync)
- QA + polish: 0.5 day

**Total: ~3 days.** This is appropriate for its own focused planning cycle.
