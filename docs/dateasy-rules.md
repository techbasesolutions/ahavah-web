# Dateasy Rules — Phase D Task D.0 catch-up

**Source:** 16 reference webp images at `d:/Antigravity/docs/specs/look-and-feel/`.
**Status:** Iteration 1 (2026-05-10). Images 3, 9, 12, 13 inspected this session. Others have seed rules from the master plan + plan-stated content; need direct visual inspection in follow-on sessions to confirm/expand.
**Purpose per master plan §D.0 Step 2:** "Each of the 16 images gets a short row in the table below, translating what's visible into a concrete design rule. The rules below are the seed; expand/correct as you actually read the images."

If a Phase 6 screen needs a reference and the relevant rule below is "TBD: read in next session" → read the image now, expand the rule, then build. **Never improvise from the seed rule alone.**

---

## Conflict-resolution decisions (master plan §D.0 Step 5)

Documented for reference:

- **Lime = primary action ("commit")** (e.g., "Find out your personality type", "Confirm", "Apply filters" — wait, see Image 12 below: lavender for filter apply).
- **Lavender = secondary action ("modify / apply settings") OR brand-tone fill** (e.g., "Edit profile info", filter "Apply filters" pill button).
- **Pink = semantic only** (likes / hearts / destructive). Never use as a CTA or accent for non-affection actions.

(Per master plan §D.0 Step 5; seed-rule conflict — lime "commit" vs lavender "apply settings" — accepted: lime when the action ENDS a flow / submits, lavender when the action MODIFIES state and may be re-edited.)

---

## Image-by-image rules

### #1 — `084e77…` — App-store screenshot trio
**Status:** Seed rules from plan; not visually inspected this session.
**Surface:** App-store screenshot (3-phone diagonal composite).
**Seed rules:**
- 3-phone diagonal composite layout
- Indigo background bleed
- Marketing line in white Cabinet Grotesk Bold, sized to ~5% of poster height
- Used as reference for Phase 6 Task 6.6 Step 1 (store assets)

### #2 — `0bfd35…` — Competitor matrix
**Status:** SKIP per master plan. Case-study artifact only, no design rule.

### #3 — `23a18a…` — Chat module ✅ INSPECTED (this session)
**Surface:** Chat list (left phone) + chat thread (right phone), both screenshots side-by-side on a dark canvas with explanatory copy on the left.

**Confirmed visually:**

**Chat list (left phone):**
- Header: "Chat" as a large display heading (white, bold), search icon top-right
- Stories row directly under header: 5–6 avatar circles in a horizontal row, each ~48–56px, with **lime or pink/red ring** for unread/online states (some have rings, some don't)
- Chat-list rows:
  - Avatar (~48px) on left
  - Two-line text: name+age in white body (e.g., "Lucy, 22"), preview text in muted color below (e.g., "Say hi!", "Hey, how are you?")
  - **Unread count badge** on the right: lime circle/pill with black text "1" (small, ~20–24px diameter)
  - **NO timestamp visible** in the chat-list rows in this image (correction to plan's seed rule: "timestamp on right" is plan-extrapolated, not shown in Dateasy reference)
  - Row separators: subtle dark divider OR no divider, just spacing
- Bottom-nav: dark elongated pill containing 4 circular icons: sparkle (likely Discover) / globe / chat (active, FILLED) / heart. Active state = filled icon (background + foreground both lime/white)

**Chat thread (right phone):**
- Header: back arrow + small avatar + "Mary, 23" name+age (white), "Online" status caption (small, lime/success color), "..." kebab on right
- **Both message bubbles in this image are LIME** (correction to plan's seed rule of "me=indigo / them=indigo-darker"). Outgoing and incoming both rendered in lime with black text, rounded-2xl + tail variant (rounded-bl-sm or rounded-br-sm depending on side). Plan's tone distinction may be wrong; treat both as lime in v1.
- Bubble metadata: timestamp shown OUTSIDE/BELOW bubble in white small text ("12:11 PM", "12:14 PM")
- **Photo grid** inside chat: 2 photos side-by-side, each ~150×120, rounded-xl (~16px), 12px gap. Plan seed said 2×2 max; image shows 1×2 horizontal — both arrangements valid
- **Voice message bubble**: lime bg, **circular play button with LAVENDER interior icon** (not black/white), waveform (vertical-bar style, lavender ticks), duration text "0:13" right-aligned in bubble. Timestamp "12:14 PM" outside/below.
- Input bar at bottom: paperclip icon (lavender) + "Type something..." input field (lime fill bg, transparent placeholder) + send icon (lavender)

**Rules to encode:**
- Bubble color: lime, both directions (rule may evolve when other chat references inspected)
- Voice play button: circular, lime bg with **lavender interior icon** (not black)
- Photo grid in chat: rounded-xl, 12px gap, 1×2 or 2×2
- Chat-list row: avatar + name+age + preview, NO timestamp (or timestamp placement TBD), unread = small lime pill
- Stories row: ~48–56px ringed avatars, ring color encodes state (lime / pink-red / none)
- Bottom-nav active icon: filled, not just colored

### #4 — `39f090…` — Process Venn
**Status:** SKIP per master plan. Case-study artifact only.

### #5 — `3ae963…` — Match screen on night-street
**Status:** Seed rules from plan; NOT inspected this session.
**Surface:** Match celebration on dark/night-street background.
**Seed rules:**
- Match-screen confetti placement: heart top-left at ~20% from edge, lime sparkle top-right at ~15%, lavender blob bottom-left at ~25%
- Two profile-card thumbnails overlap by ~15% horizontally, top card slightly offset right + rotated +3°
- Confetti uses 8–12 SVG sticker shapes (per plan: heart / sparkle / 5-point-star / flower / blob / squiggle / small-circle / triangle / quad-star / arrow / dot / cross)
**Action:** read this image when building MatchConfetti choreography (Phase D.3) and when adding the 4 missing sticker variants (Phase D.1).

### #6 — `41958b…` — Profile detail + match screen
**Status:** Seed rules from plan; NOT inspected this session.
**Seed rules:**
- Profile detail layout: full-width photo header (60% screen height)
- Name+age in Heading + Numeric (right-aligned to top of photo content area)
- Distance Caption with location pin
- 3 interest Pills in a row (lime / indigo-outline alternating per master plan; should verify lavender vs indigo per Image 9 inspection)
- Bio in Body Regular
- Action row at bottom over translucent blur (X / sparkle pause / heart)
- CompatibilityPill top-right of photo at 16/16 inset
**Action:** inspect when building B2 four-states + extracting CompatibilityPill primitive.

### #7 — `48837f…` — About + interest tag grid
**Status:** Seed rules from plan; NOT inspected this session.
**Seed rules:**
- Interest tag grid: 3-column wrap with 8px gap
- Lime fill for selected, indigo outline (no fill) for unselected (per plan; verify lavender per Image 9 inspection)
- Tag radius = pill, padding 8px vertical / 12px horizontal
**Action:** inspect when building A10 looking-for or filters drawer.

### #8 — `4c75b8…` — Onboarding personality + premium card + interests
**Status:** Seed rules from plan; NOT inspected this session.
**Seed rules:**
- RadioStepper visual: 5 hollow circles, current state filled with lime, others outlined (indigo at 1.5px per plan)
- Personality question card: full-screen indigo bg, Heading centered, RadioStepper centered below, Confirm PillButton lime full-width near bottom
- Premium card: indigo→lavender gradient bg, "50 stories" stat in Numeric large, lime "Change subscription" CTA
**Action:** inspect when building A16 personality stepper and PaywallCard atom.

### #9 — `523365…` — UI kit ✅ INSPECTED (this session)
**Surface:** "UI kit" canvas with 6 dashed-bordered cards on dark bg: Icons / Stickers / Buttons / Brand+wordmark / Tags / Forms.

**Confirmed visually:**

**Icons (top-left card):** ~24 small icon glyphs in a grid, all outline-style with thin (~1.5px) strokes, white. Includes phone, dots, X, message, arrows, attach, send, link, search, location, camera, refresh, map, share, heart, sync, etc.

**Stickers/Callouts (top-middle):** 3 callout examples on a stylized card-canvas:
- "Awesome" — lavender filled lozenge/pill with confetti sparkles overlaid
- "Check my stories" — indigo circular badge with star icons + lavender lozenge wing
- Background: lavender soft-shape blobs

**Buttons (top-right):**
- **Lime filled pill** — "Find out your personality type" (large, full-width primary CTA)
- **Lavender outline pill** with **trailing lime "94%" pill** — "Edit profile info" (compound: secondary text-button with attached metric badge) — note: the OUTER border is lavender, NOT indigo (correction to plan's "indigo outline" seed)
- **Lavender filled pill** — "Confirm" (smaller secondary CTA)
- **Icon-circular row** at bottom: lavender outlined circle + lavender outlined circle with "+" + pink filled circle with heart + dark filled circle with X. ~40px diameter each.

**Brand (bottom-left):**
- Lime square (40px or so) with **filled white-on-lime 4-point sparkle** — primary brand mark
- Indigo square (~40px) with **outlined white 4-point sparkle** — alt brand mark
- "Dateasy" wordmark in Cabinet Grotesk Bold, white, large display weight

**Tags (bottom-middle):**
- "94%" tag — lime fill, with chat icon prefix (compound)
- "Cooking" — lavender fill
- "Knitting" — lavender outline (no fill)
- "Relationship" — lavender outline (no fill)
- "Friendship" — lavender fill
- ⇒ **Three tag states coexist:** lime fill (compat / metric), lavender fill (interests when selected), lavender outline (interests when unselected)
- All tags are pill-shaped (full radius), with ~28–32px height, ~8/12px padding

**Forms (bottom-right):**
- "First name" input — **lavender fill bg**, white text "Michael", floating label "First name" in small text above the value (correction to plan: NOT "indigo-on-indigo filled treatment" — it's lavender fill)
- "Say hi!" input — **lavender fill bg**, with trailing send icon (lavender)
- "About me" textarea — **lavender fill bg**, multi-line text, with trailing edit icon top-right

**Rules to encode:**
- **Buttons:**
  - Primary CTA: lime fill, black text, pill shape (full radius), no border
  - Secondary CTA: lavender fill, black text, pill shape, no border
  - Outline CTA: lavender border, transparent fill, lavender text, pill shape
  - Compound button (text + metric): lavender outline + trailing lime metric pill
  - Icon-circular: ~40px circle, can be lavender outline OR pink filled OR dark filled OR lavender outlined-with-+
- **Tags:**
  - Selected/active state: lavender fill OR lime fill (lime for metrics like "94%")
  - Unselected state: lavender outline
  - All tags pill-shaped, ~28–32px height
- **Form inputs:**
  - **lavender fill bg** (NOT indigo — correction to plan)
  - Floating label above input value
  - Trailing icon (send/edit/clear) when applicable
  - White text inside, lavender placeholder
- **Brand mark:**
  - Square + 4-point sparkle (lime square + outlined sparkle, OR indigo square + filled sparkle)
  - Wordmark = Cabinet Grotesk Bold display
- **Icons:** lucide-style outline at 1.5px, 24px box

**Corrections to apply to current `ahavah-web` primitives:**
- **Input.tsx tone="elevated"** is currently `bg-bg-elevated` — should review if it should be `bg-lavender` per Dateasy. This is a brand decision: do we follow Dateasy literally (lavender form fields) or adapt (dark form fields per Ahavah's dark-only adaptation)? Recommend: keep elevated dark for product UX (lavender bg + white text fails AA contrast at body sizes); use lavender fill ONLY for inline highlight inputs (the "Say hi!" placeholder pattern in match screen)
- **Button outline variant** is currently `border-border` (which resolves to white/8); should add a `lavenderOutline` Button variant per Dateasy reference for the "Edit profile info" secondary CTA pattern
- **Compound button** (text + metric pill) — pattern not currently primitive; could be `<Button variant="lavenderOutline">Text <Pill variant="lime">94%</Pill></Button>`

### #10 — `5df395…` — Phone-in-hand chat with floating sticker confetti
**Status:** Seed rules from plan; NOT inspected this session.
**Seed rules — sticker library:**
- Heart (pinkish red), sparkle (lime), 5-point star (lime/lavender mix), flower (lavender), blob (lavender), squiggle line (red), small circle (lavender)
- All have 2px black stroke + slight drop shadow
- Become `<StickerBadge variant="..." />` SVG sources
**Action:** inspect when building the 4 missing sticker variants in `<StickerBadge>`.

### #11 — `765247…` — Overview montage (~40 screens)
**Status:** Validation reference only — confirms screen count + color consistency. No new rules.

### #12 — `85a576…` — Swipe deck + filters drawer ✅ INSPECTED (this session)
**Surface:** Two phones side-by-side. Left: swipe-deck main screen. Right: filters drawer.

**Confirmed visually:**

**Swipe-deck phone (left):**
- Top chrome:
  - Top-left: "✦ Dateasy" wordmark + sparkle (lime sparkle to the left of Cabinet Grotesk Bold "Dateasy")
  - Top-right: small avatar (~32–36px circular) with notification dot
- Card (centered, ~80–90% width):
  - Aspect ratio: ~4:5 portrait
  - Photo fills card; rounded-3xl (~24–28px corner radius)
  - **Top-right inset:** lime "94%" compatibility pill with chat-bubble icon
  - **Bottom-left inset (~24px padding):** name+age white display heading "Jessica Maple, 25", caption with location pin "📍 3 km away" below
  - Subtle bottom gradient overlay (dark → transparent) for caption legibility
- Action row below card:
  - Three buttons in a row: lavender X (small ~48px) / lime pause (LARGE ~64px, center) / pink heart (small ~48px)
  - Each button is circular with subtle drop shadow
  - Layout: 48 / 64 / 48 with ~24px gap between
- Bottom-nav (at very bottom):
  - Dark elongated pill, 4 circular icons evenly spaced
  - Order looks like: sparkle (left) / globe/world / chat-active (middle, FILLED with lime ring or fill) / heart (right)

**Filters drawer phone (right):**
- Top chrome: same "✦ Dateasy" wordmark left + "Skip" link top-right
- "Filters" title (large display) with close X on the right
- Sections:
  - "Looking for:" — segmented row of 2 pills: "Relationship" (lime, selected) / "Friendship" (lavender outline, unselected)
  - "Show me:" — segmented row of 3 pills: "Men" (lavender outline) / "Women" (lime, selected) / "All" (lavender outline)
  - "Preferred age" — slider with TWO thumbs (range), value displayed top-right "18-23"
  - "Preferred distance" — slider with ONE thumb, value displayed "1 km"
  - "Apply filters" pill button at bottom — **LAVENDER fill** (matches conflict-resolution rule: lavender = "modify / apply settings")

**Rules to encode:**

**SwipeCard:**
- Container: ~85% width centered, ~4:5 aspect, rounded-3xl (~24–28px)
- Photo fills, with bottom gradient overlay (dark → transparent over bottom 30–40%)
- Top-right inset: CompatibilityPill at 12–16/12–16 inset
- Bottom-left inset: name+age + location at 24/24 inset
- Single shadow (medium-large, drop-shadow style)

**SwipeDeck action row:**
- 3 circular buttons: 48 / 64 / 48 px
- Lavender X (left) / lime pause (center, larger) / pink heart (right)
- Drop shadow on all three
- ~24px gap between buttons

**FiltersDrawer:**
- Sections separated by spacing (no dividers visible)
- Segmented rows of pills (selected = lime fill, unselected = lavender outline)
- RangeSlider for age (two thumbs)
- Single-thumb Slider for distance
- "Apply filters" CTA = lavender PillButton at bottom (overrides lime-CTA default for this specific "modify" action)

**Bottom-nav:**
- Dark elongated pill (rounded-full), 4 circular icons
- Active state = filled with brand color (lime / lavender depending on tab? — TBD; image shows chat as active with what looks like lime-tinted background)

**Corrections to apply to current `ahavah-web` primitives:**
- **`/discover` is missing this entire layout.** Currently a single static photo card. Need:
  - SwipeCard primitive (proper proportions, bottom-left caption, top-right pill)
  - SwipeDeck container with the three-button action row (X / pause / heart, sized 48/64/48)
  - 60fps gesture handling per Phase D.3
- **Filters drawer (B4)** isn't built. Use `<Sheet>` from shadcn + ToggleGroup for segmented rows + Slider + RangeSlider + Button variant="lavender" for Apply.
- **BrandMark** is currently called via `<BrandMark size="sm" />`; verify it produces the "✦ Dateasy" lockup at the right scale for /discover header.

### #13 — `a393f0…` — Font + colors ✅ INSPECTED (this session)
**Surface:** "font and colors" canvas with 4 color shapes (heart=red, pentagon=lime, circle=indigo, sparkle=lavender) + Cabinet Grotesk specimen.

**Confirmed visually:**
- Color palette:
  - Pinkish Red (in heart shape) — labeled `#D7FF81` in image (TYPO; correct hex is `#FF4566` per plan + globals.css)
  - White (in triangle) — `#ffffff` ✓
  - Mindaro lime (in pentagon) — labeled `#D7FF81` ✓ (and the swatch is lime ✓)
  - Persian Indigo (in circle) — labeled `#D7FF81` (TYPO; correct hex is `#5524F5` per plan + globals.css)
  - Lavender (in sparkle) — `#BC96FF` ✓
- Typography:
  - "Cabinet Grotesk" display heading (very large, white on indigo card)
  - Aa Bb Cc... full alphabet
  - 0123456789 numerals
  - Three weight pills: Regular / Medium / Bold (all lavender outline)
- Manifesto text (top-right): **"We decided to step away from the traditional division between light and dark modes and opted instead for a dark blue background with bright green and pink accents."**

**Rules to encode:**
- **The Dateasy reference says "dark BLUE background", not pure black.** Our `globals.css` has `--color-bg-canvas: #000000` (pure black) and `--color-bg-indigo: oklch(0.18 0.11 280)` (= #1A1340). The Dateasy reference suggests the canvas should be the dark blue, not pure black. **Decision needed:** keep our pure-black marketing canvas (with bg-indigo for in-app surfaces) OR shift canvas to bg-indigo as Dateasy intends.
- Hex codes verified via plan + globals.css: `#FF4566` red / `#D7FF81` lime / `#5524F5` indigo / `#BC96FF` lavender. The image's hex labels are typo'd.
- Font: Cabinet Grotesk per Dateasy. **Ahavah uses Plus Jakarta Sans instead** (per pivot decision; both are similar grotesque-style display sans-serifs). Documented deviation.
- Three Cabinet weights used: Regular / Medium / Bold. Plus Jakarta is loaded with weights 300/400/500/600/700/800 in `layout.tsx` — superset, OK.

**Corrections to apply:**
- **Decision:** is bg-canvas pure black (current) or dark blue per Dateasy? Defer this to a brand-direction conversation; current pure black has WCAG contrast advantage for body text, but reads less "Dateasy".
- Plus Jakarta Sans vs Cabinet Grotesk: documented swap, no further action.

### #14 — `c8ce3e…` — Hero/cover marketing
**Status:** Seed rules from plan; NOT inspected this session.
**Seed rules:**
- Wordmark super-large left-aligned
- Phone mockup centered showing swipe deck
- Tagline right-aligned with one word in lime pill ("easy") + one in lavender pill ("fun")
- Body copy at bottom-left, small
- Used as marketing site landing composition (out of `ahavah-web` scope; for separate marketing site)

### #15 — `e01936…` — Feature mind-map
**Status:** Validation reference; cross-checks 4-tab nav. No new rules.

### #16 — `f5fcfc…` — Marketing collage
**Status:** Seed rules from plan; NOT inspected this session.
**Seed rules:**
- Marketing "About" or "Why us" page
- Single-word concept tags in alternating colors on indigo card
- People-photo composition: rounded-16 photos at varied sizes, slight rotation (±3°)
- Photographic style: candid + warm-toned, NOT stock-corporate
- Marketing site only (out of `ahavah-web` scope).

---

## Pin reference per atom (master plan §D.0 Step 3) — TODO

For each atom in PROJECT-STATUS.md §4:
- Crop the relevant region from the reference image
- Save as `components/<category>/<atom>/reference.png`

Currently: NO atom-level reference pinning exists. Action item: when refactoring or extending an atom, crop + commit the reference image alongside the change.

## Pin reference per screen (master plan §D.0 Step 4) — TODO

For each screen in PROJECT-STATUS.md §3:
- Identify the closest Dateasy reference image (full or crop)
- Save as `playwright-fixtures/screens/<route>/reference.png` for visual diff in R4

Mapping:
- `/` (welcome) — Image #14 hero/cover (when marketing site is built)
- `/discover` — Image #12 left phone (swipe deck)
- `/matches` — derived (no direct Dateasy ref); Image #11 montage
- `/inbox` — Image #3 left phone (chat list)
- `/chat/[id]` — Image #3 right phone (chat thread)
- `/match` — Image #5 (match screen) + Image #6 (alt match composition)
- `/profile` — Image #11 montage (settings montage); also touches Image #8 premium card
- `/profile/[uuid]` — Image #6 (profile detail)
- `/paywall` — Image #8 premium card
- `/verify` — derived (no direct Dateasy ref); use Image #11 for color/spacing parity
- `/onboarding/*` — Image #8 (personality) + Image #11 (montage)

Currently: no `playwright-fixtures/` directory exists. Action item: stand up Playwright with visual regression (BUILD-PLAN §7 Tier 0 #3).

---

## Sign-off (master plan §D.0 Step 6)

This iteration covers 4 of the 16 images visually + the 12 others have seed rules from the plan that should be confirmed/expanded by direct inspection in subsequent sessions.

**Not signed off yet.** Per Pattern 3 (solo, reference-driven), implementer = designer for this project. Sign-off requires walking the doc end-to-end against all 16 images + a written commitment in this file's revision history that all design rules are accurate to the references.

**Next iterations:**
1. Inspect images #5, #6, #7, #8 (match / profile / interests / onboarding) — needed for screens B2, B3, A10, A16, F1
2. Inspect images #1, #10, #14, #16 (app-store, stickers, hero, marketing) — needed for marketing site + sticker library
3. Document conflict-resolutions as they arise per Step 5
4. Sign off and lock.
