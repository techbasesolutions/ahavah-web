# 09 — Inbox + Chat (`/inbox` + `/chat/[id]`)

The mobile app has two screens: a list and a thread. Desktop merges them
into Slack-style: list rail + active thread pane.

When the user clicks an inbox row, the right pane updates in-place.
When no thread is selected, the right pane shows an empty state.

## Layout (1440×900)

```
┌────────┬──────────────┬──────────────────────────────────────┐
│ SIDEBAR│ LIST · 380px │ THREAD · 1fr
│ 260px  │              │
│        │ "Chat" h1    │ THREAD HEADER (h=auto, p=18 32)
│        │              │   48px brand avatar  + Yael, 27
│        │ Search field │   (online dot, lime bordered)
│        │   44h cream  │                       Online now · Jerusalem, IL
│        │              │                                  Phone · More
│        │ Inbox rows   │
│        │   Active row:│ MESSAGE LIST (overflow-y, p=24 32)
│        │     lavender │   "You matched on Sunday" centered hint
│        │     14% tint │
│        │   48px avatar│   Bubble them (max 560):
│        │     +lime    │     32px avatar + 14px gap
│        │     ring     │     bg --lavender, radius 20
│        │     if unread│     pad 14 18, fontSize 16
│        │   Name, age  │
│        │   Last msg   │   Bubble me:
│        │     truncate │     bg --lime, radius 20
│        │   Time + ●   │     (no avatar)
│        │   Pill if    │
│        │   unread     │ … (interleaved them/me)
│        │              │
│        │ (7 rows fit) │ COMPOSER (h=auto, p=16 32)
│        │              │   Input 56h radius 24 + CircleBtn lime 56
│        │              │
│        │ 1px right    │
│        │  hairline    │
└────────┴──────────────┴──────────────────────────────────────┘
```

## Inbox row spec

```css
display: flex;
align-items: center;
gap: 14;
padding: 12 14;
border-radius: 14;
background: <active ? "color-mix(in oklch, var(--lavender) 14%, transparent)" : "transparent">;
```

- Avatar: 48px brand fallback. **2.5px lime border when unread > 0.**
- Name: `.t-meta`, weight 600.
- Last message: 13px, `--ink` if unread else `--ink-2`, single line ellipsis at maxWidth 240.
- Right column: time (`.t-caption`, `--ink-3`) + lime `Pill` if unread.

## Chat header

- 48px brand avatar with lime online dot (12px, 2.5px ring `--app`).
- Two-line right text: `.t-h3` name + `.t-caption` "Online now · City, CC".
- Right side: phone icon button (40px, `--card`) + more icon button.

## Bubble shapes

| Side | Background     | Color | Bottom corners        |
|------|----------------|-------|-----------------------|
| them | `--lavender`   | #000  | left 6, right 20      |
| me   | `--lime`       | #000  | left 20, right 6      |

Padding 14 18, fontSize 16, lineHeight 1.45, max-width 560.

Typing indicator: lavender bubble with 3 dots in `rgba(0,0,0,0.55)`,
6×6 each, `animate-bounce` with stagger 0/120/240ms.

## Composer

Filled input field on left (`--card`, 56h, radius 24, padding 0 22),
CircleBtn `tone="cta"` size 56 on the right.

## Behaviour

- Reuse existing chat client: `chatClient.connect(myUuid, sessionToken)`.
- Each row in the list lazy-loads name + age via `apiClient.get('/prospect-profile/<uuid>')`;
  cache in `sessionStorage["ahavah:inbox-names"]`.
- Mark thread displayed on focus to clear unread count.
- New live messages append below; auto-scroll to bottom.
- Composer: 3s typing-stop debounce per existing `useChatThread`.
