# 13 — Settings (`/settings`)

Left sub-nav rail (320px) + content panel. The mobile app's deep-list
flattens into Mac-Preferences style two-column layout.

## Layout (1440×900)

```
┌────────┬─────────────────────────────────────────────────────┐
│ SIDEBAR│ TOP BAR "Settings" (h=72)                             │
│ 260px  ├─────────────────────────────────────────────────────┤
│        │ padding 32, grid 320 / 1fr, gap 32                    │
│        │                                                       │
│        │ ┌─────────────┐  ┌──────────────────────────────┐   │
│        │ │ SUB-NAV     │  │ CONTENT PANEL                 │   │
│        │ │ 320px       │  │ bg --card, radius 24, p 32   │   │
│        │ │             │  │ border --hairline             │   │
│        │ │ ACCOUNT     │  │                                │   │
│        │ │  Account    │  │ "Notifications" t-h1          │   │
│        │ │             │  │ Helper (t-meta, --ink-2)      │   │
│        │ │ APP         │  │                                │   │
│        │ │  Notif. ●   │  │ Toggle list:                  │   │
│        │ │  Privacy    │  │   "New matches"       [ON]    │   │
│        │ │  Blocked    │  │   "New messages"      [ON]    │   │
│        │ │             │  │   "Profile views"     [OFF]   │   │
│        │ │ SAFETY &    │  │   "Verification …"    [ON]    │   │
│        │ │ LEGAL       │  │   "Weekly digest"     [OFF]   │   │
│        │ │  Safety tips│  │   "Marketing & tips"  [OFF]   │   │
│        │ │  Community  │  │                                │   │
│        │ │  Privacy    │  │ Each row:                     │   │
│        │ │  Terms      │  │  bg --app, border --hairline, │   │
│        │ │             │  │  radius 14, padding 16 18,    │   │
│        │ │ SUPPORT     │  │  flex row                     │   │
│        │ │  Help center│  │                                │   │
│        │ └─────────────┘  └──────────────────────────────┘   │
└────────┴─────────────────────────────────────────────────────┘
```

## Sub-nav row

```css
display: flex;
align-items: center;
gap: 14;
padding: 12 14;
border-radius: 14;
background: <active ? "color-mix(in oklch, var(--lavender) 14%, transparent)" : "transparent">;
```

- IconBadge tone="muted" size 36 + 16px icon inside
- Title `.t-meta` weight (700 if active, else 500)
- Subtitle `.t-caption`, `--ink-3`
- Chevron 14px `--ink-3`

Group label above each group: `.t-overline`, `--ink-2`, padding 0 14, marginBottom 8.

## Toggle (iOS-style)

```
┌─────────────────────────────────┐
│  Label (t-body)        [●  ]    │  ← off: bg --hairline, knob left
└─────────────────────────────────┘
┌─────────────────────────────────┐
│  Label (t-body)        [    ●]  │  ← on:  bg --lime,     knob right
└─────────────────────────────────┘
```

Track 48×28, radius 14. Knob 22×22, top 3, left 3 (off) / 22 (on). White
knob with `box-shadow: 0 1px 3px rgba(0,0,0,0.3)`.

## Sub-page targets

| Slug | Title | Content |
|---|---|---|
| account | Account | Email field · Change email · Delete account |
| notifications | Notifications | 6 toggle rows (above) |
| privacy | Privacy | Show on map · Show online · Require verified matches |
| blocked | Blocked users | Empty state or list of blocked profiles |
| safety | Safety tips | Read-only article |
| legal/community-guidelines | Community guidelines | Read-only article |
| legal/privacy | Privacy policy | Read-only article |
| legal/terms | Terms of service | Read-only article |
| help | Help center | FAQ accordion + contact button |

Each follows the same content-panel shape; only the field types change.
