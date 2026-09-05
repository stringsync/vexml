# Handoff: vexml playground redesign (design 4a)

## Overview
A visual redesign of the vexml playground at https://vexml.dev (`packages/site`). Same feature set as today: load a MusicXML file or fixture, tweak render config, play the score back with a cursor. The goal is a more professional look that shares a visual family with sound2score (IBM Plex Sans, Anybody italic wordmark, #ff3d9e accent). Light appearance only for now.

## About the Design Files
`design-4a.html` is a **design reference built in HTML** (static, inline-styled mockups at 1280×800 desktop and 390×800 mobile), not production code. Recreate it inside the existing site: React 19 + Vite, Tailwind v4, shadcn/ui components in `packages/site/components/ui`, lucide-react icons, model/state in `site-model.ts`. Keep all existing behavior (drag-drop, debounce, localStorage restore, spacebar play, scroll-into-view on step, Sheet on mobile). This is a re-skin plus a few layout moves; no new features.

## Fidelity
**High-fidelity.** Colors, type, radii, and spacing below are final. The sheet music itself is drawn by vexml; the staff lines in the mock are placeholders for its canvas.

## Screens / Views

### Desktop (≥ md, mock is 1280×800)
Root: `flex h-screen flex-col`, page bg **#f4f2f5**, text **#17171a**, font IBM Plex Sans.

**Header** — 56px, bg #fff, border-b 1px rgba(15,15,17,.08), padding 0 20px, gap 20px.
- Wordmark `vexml`: Anybody, italic, weight 900, font-stretch 125%, 22px, letter-spacing -0.5px, line-height 1. The **x** is #ff3d9e; other letters #17171a.
- Tagline "MusicXML renderer for the web": 13px, #6f6d75.
- Right cluster (`margin-left:auto`, gap 18px):
  - npm chip: 36px tall, radius 10, bg #f4f2f5, border 1px rgba(15,15,17,.08), padding 0 6px 0 14px, IBM Plex Mono 13px #44424a. Leading `$` in #ff3d9e, text `npm i @stringsync/vexml`, trailing 26×26 copy button (lucide `copy`, 13px, #8d8b92). Click copies the command.
  - GitHub: plain text link, no button chrome. 13.5px/500 #44424a, trailing lucide `external-link` 13px. Opens https://github.com/stringsync/vexml in a new tab. **Remove the Docs button and the shields.io stars badge.**

**Sidebar (aside)** — 320px, bg #fff, border-r 1px rgba(15,15,17,.08), padding 16px 14px, column gap 12px, scrolls vertically. Three cards, each: padding 12px 14px, radius 12, border 1px rgba(15,15,17,.08), no fill.
Card header row: icon 17px #6f6d75 (lucide), title 14.5px/500, optional right action 12.5px (`Reset` #8d8b92 when inactive, #ff3d9e when something can be reset).

1. **MusicXML** (icon `upload`)
   - Primary button "Choose file" + faint ".xml .musicxml .mxl": 40px, radius 10, bg **#ff3d9e**, text **#1a0a12** 14px/600 (suffix 500, opacity .7). Full width. Wraps the hidden file input.
   - "Or pick an example" 12.5px #6f6d75, then a row (gap 6): prev/next 36×36 buttons (radius 10, bg #f4f2f5, border 1px rgba(15,15,17,.08), chevrons 16px #44424a) flanking the fixture Select (36px, radius 10, border 1px rgba(15,15,17,.14), IBM Plex Mono 13px, chevron-down #8d8b92). Same disabled logic as today.
   - "Edit MusicXML" collapsible trigger: 13px/500 #44424a with chevron-right 14px; expands the existing Textarea (mono, 12px).
2. **Playback** (icon `sliders-horizontal` / audio-lines) — one row: label "Instrument" 13.5px #6f6d75 left, compact Select right (30px tall, radius 8, border 1px rgba(15,15,17,.14), 12.5px/500).
3. **Layout** (icon `rows-3`, action "Reset" #ff3d9e) — column gap 18px:
   - "Notation font" row, same compact Select as Instrument. (Moved here from Config.)
   - Five sliders: Note spacing, Softmax factor, System spacing, Max system fill, Reference width. Each = label row (13.5px: label #6f6d75 left, value 600 tabular-nums right) then the slider. Track 3px, radius 2, bg #e4e2e7, margin 6px 0 4px; filled range #ff3d9e; thumb 14px circle, bg #fff, border 2px #ff3d9e. Same min/max/step/defaults as `app.tsx`. Per-slider reset icons are dropped in favor of the card-level Reset (per-slider reset can be a hover affordance if desired).
   - "Overflow" segmented control: label 13.5px #6f6d75 above; 3 equal columns in a container (bg #f4f2f5, radius 9, padding 3, gap 3, border 1px rgba(15,15,17,.08)); items 26px, radius 6, IBM Plex Mono 12px/500; selected bg #17171a text #f4f2f5, others #44424a. Description under it 12px #8d8b92: "What gives when an engraved line can't fit the reference width."
   - "Honor system breaks" row with a switch: 40×24, radius 12, on = #ff3d9e with 20px #fff knob at right; off = #e4e2e7 with knob left.
   - Keep today's rule: hide System spacing, Max system fill, Honor system breaks, Reference width and Overflow when layout is panoramic.

**Main column** (flex 1):
- Meta row: padding 16px 40px 0. Left: fixture name IBM Plex Mono 13px #17171a, "·", "Rendered in **12.4 ms**" 12px #6f6d75 with the number #ff3d9e/500 (replaces the green success Badge; keep the fade-in on each render). Error state: keep the destructive Alert, styled to these tokens. Right: view segmented control Stacked / Panoramic — container bg #fff, radius 9, padding 3, border 1px rgba(15,15,17,.08); items 28px, radius 6, 12.5px, icon 13px + label; selected bg #17171a text #f4f2f5 weight 600, unselected #44424a weight 500.
- Score area: padding 20px 40px, scrolls. Score card: bg #fff, radius 14, border 1px rgba(15,15,17,.08), padding 56px 48px, shadow `0 20px 50px -30px rgba(15,15,17,.25)`. vexml container inside; centered, max-width as today (950px) for stacked, no cap for panoramic (horizontal scroll).
- Cursor highlight over the score: 2px #ff3d9e line with soft glow (`0 0 10px rgba(255,61,158,.6)`); current-measure wash rgba(255,61,158,.12). Use vexml's `fonts.notation.color`/halo APIs as available; otherwise the existing cursor.

**Player (docked, not floating)** — bottom of the main column, 60px, bg #fff, border-t 1px rgba(15,15,17,.08), padding 10px 24px, flex row gap 16.
- Progress strip along the top edge: 3px, bg #e4e2e7, filled #ff3d9e, 11px pink knob with 2px white ring at the head. This is the seek slider (keep scrub tooltip "measure i of N").
- Left: time "0:03 / 0:12" IBM Plex Mono 12.5px, elapsed #6f6d75, total #b3b2c0, min-width 70px.
- Center (absolute-centered group, gap 4): prev-measure, prev-note, play/pause, next-note, next-measure. Icon buttons 34px, radius 8, icons 16px #17171a (chevrons stroke 1.5 for note steps, 2 for measure jumps). Play/pause 38px, radius 10, bg #17171a, white icon.
- Right: "measure 4 of 12" IBM Plex Mono 12px #6f6d75; instrument compact Select (30px, radius 8, border rgba(15,15,17,.14), 12.5px/500) — this mirrors the Playback card so it can be changed without opening the sidebar; mute button 34px, lucide volume-2 / volume-x.

### Mobile (< md, mock is 390 wide)
- Header: padding 12px 16px, bg #fff, border-b. Wordmark 20px; right: GitHub text link (13px) and a **single 36×36 controls button** (lucide `sliders-horizontal`, radius 10, bg #f4f2f5, border rgba(15,15,17,.08), icon #44424a). No File / view toggle in the header.
- Under header: one row 12px #6f6d75 — fixture name (mono 12.5px #17171a) left, "Rendered in 12.4 ms" right.
- Score card: radius 14 14 0 0, padding 32px 24px, fills to the player. Fade to page bg at the bottom edge (60px gradient).
- Player: bg #fff, border-t, padding 10px 16px 14px; progress strip on top edge as desktop; row 1 = time left / "measure 4 of 12" right (mono 12px); row 2 = transport centered (34px buttons, play 40px radius 10 #17171a), mute at far right.
- **Controls sheet**: the controls button opens the existing shadcn Sheet from the left, 320px, bg #fff, shadow `20px 0 60px rgba(15,15,17,.25)`, scrim rgba(15,15,17,.35). Header 56px: "Controls" 15px/600 + 32px close button (bg #f4f2f5, radius 9, lucide `x`). Body = the **same three cards as the desktop sidebar**, plus one extra row in the MusicXML card: "View" label with the Stacked/Panoramic segmented control (26px items, 12px). While open, the header controls button shows active: color #c2186f on rgba(255,61,158,.14).

## Interactions & Behavior
Unchanged from the current site: file input + drag-drop (highlight the score area with a 2px dashed #ff3d9e border and rgba(255,61,158,.05) fill while dragging), 500ms debounce with fast-render bypass, localStorage restore, spacebar toggles play, cursor scrollIntoView on step/seek, note hover halo, loading overlay (use rgba(15,15,17,.35) scrim + white card with spinner). Sheet closes when the viewport widens past md. Render-time text re-animates (fade/slide 300ms) on each render. Copy button on the npm chip shows a check icon for ~1.5s after copying.

## State Management
No new state beyond what SiteModel already exposes. The mobile sheet uses the existing `controlsOpen`. The instrument Select in the player binds to the same `model.instrument` as the Playback card.

## Design Tokens
Colors: page bg #f4f2f5 · surface #fff · text #17171a · text-secondary #44424a · text-muted #6f6d75 · text-faint #8d8b92 · text-disabled #b3b2c0 · border rgba(15,15,17,.08) · input border rgba(15,15,17,.14) · track #e4e2e7 · accent #ff3d9e · accent-on-light-text #c2186f · accent-fill rgba(255,61,158,.14) · on-accent text #1a0a12.
Suggested mapping to the existing CSS vars in `index.css`: --background #f4f2f5, --card/--popover #fff, --foreground #17171a, --muted #f4f2f5, --muted-foreground #6f6d75, --border rgba(15,15,17,.08), --input rgba(15,15,17,.14), --primary #17171a, --accent (new) #ff3d9e, --ring #ff3d9e.
Type: IBM Plex Sans 400/500/600 (body); IBM Plex Mono 400/500 (code, fixture names, times, segmented values); Anybody italic 900, stretch 125% (wordmark only). Load via Google Fonts or @fontsource (`@fontsource/ibm-plex-sans`, `@fontsource/ibm-plex-mono`, `@fontsource-variable/anybody`). Replace Geist.
Sizes: body 13.5px, small 12.5–13px, captions 12px, card titles 14.5px/500.
Radii: 12 cards · 10 buttons/inputs · 9 segmented container · 8 compact selects and icon buttons · 6 segmented items · 2 slider tracks.
Control heights: 40 primary button · 36 inputs/icon buttons · 34 transport buttons · 30 compact select · 28 view-toggle items · 26 overflow items.
Shadows: score card `0 20px 50px -30px rgba(15,15,17,.25)`; sheet `20px 0 60px rgba(15,15,17,.25)`.

## Assets
Icons: lucide-react (already a dependency): upload, chevron-left/right/down, chevron-first/last, play, pause, volume-2, volume-x, rows-3, move-horizontal, sliders-horizontal, copy, check, external-link, x. No images.

## Files
- `screenshots/4a-desktop.png`, `screenshots/4a-mobile.png`, `screenshots/4a-mobile-controls-open.png` — rendered frames for quick reference.
- `design-4a.html` — the approved design (desktop, mobile, mobile with controls open). Open in a browser; every element is inline-styled so values can be read directly from the markup.
- Source of truth for behavior: `packages/site/app.tsx`, `header.tsx`, `player.tsx`, `section.tsx`, `config-slider.tsx`, `layout-toggle.tsx`, `index.css`.
