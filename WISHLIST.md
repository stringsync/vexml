# Upstream wishlist

Capabilities the renderer (`src/render.ts`) would benefit from in
`@stringsync/mdom` (or other upstream deps). Each entry notes the workaround in
use today so it can be dropped once the gap is filled.

## `@stringsync/mdom`

_No outstanding requests — everything the renderer needs so far is covered._

## Resolved

- ~~`Note.dots` read getter~~ — shipped in mdom 0.1.1.
- ~~Beam-group helper (`Measure.beams`)~~ — shipped in mdom 0.1.1.
- ~~`Note.articulations` getter~~ — shipped in mdom 0.1.2; replaced the raw
  `<notations><articulations>` traversal.
- ~~`Note.stem` getter~~ — shipped in mdom 0.1.2; replaced reading `<stem>` text
  off raw children.
- ~~`Note.timeModification` (tuplet ratio)~~ — shipped in mdom 0.1.2; the tuplet
  number is now the true `actual:normal` ratio instead of vexflow's N:2 default.
