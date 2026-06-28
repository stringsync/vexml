# Nudge / collision audit

> **Caveat — not a maintained list.** This is a point-in-time snapshot taken while the
> collision pipeline (`src/geometry.ts`, `src/quadtree.ts`, `src/collision.ts`) was introduced.
> Line numbers and entries **will drift** as the code changes — treat it as a map, not a
> source of truth. Re-audit (`rg`-style sweep for offset/clearance code) if you need current
> data. It exists so the historical "where did we nudge things?" knowledge isn't lost.

The renderer (`src/draw.ts`) draws to a `<canvas>` in immediate mode. Historically, every
time two elements could clash, a one-off fix nudged one of them with its own magic constant —
a whack-a-mole. The pipeline replaces the recurring class of those with one mechanism. This
doc records what existed, split by whether the pipeline absorbs it.

## How the pipeline works (the one true path)

Compute a movable element's natural `Rect` → ask the `CollisionDetector` to resolve it against
everything already placed (`liftClear` for above-stave text, `pushRightOf` for diagrams) →
draw at the resolved position → register the placed `Rect` so later elements avoid it. Fixed
elements (noteheads, stems, ties) are registered as obstacles but never moved. The detector
also reports out-of-bounds content (`escaping`) — the "no-man's land" where renders get
clipped. A `QuadTree` (with an out-of-bounds overflow bucket) is the spatial index.

**Rule for future work:** any new "move this so it clears that" (or "is this being clipped?")
goes through `CollisionDetector`. Do not add new bespoke magic-offset clearance code.

## A. Recurring runtime clash resolution — the whack-a-mole

| Site | What moves | Clears | Status |
|---|---|---|---|
| `draw.ts::noteTop` | (obstacle calc) notehead ∪ stem tip ∪ above-articulation | — | feeds `noteRect` |
| `draw.ts::drawHarmony` | chord symbol lifts | notehead, stem-down tie apex, other text | **migrated** → `liftClear` |
| `draw.ts::drawWords` | words text lifts | notehead, tie, other text | **migrated** → `liftClear` |
| `draw.ts` chord-diagram block | fret box pushes right | adjacent diagram across a barline | **migrated** → `pushRightOf` |
| `draw.ts::drawTempo` | metronome mark lifts (`shiftY`) | high first note | **deferred** (scaled mark + reserved headroom; Phase 2) |
| chord diagram vertical | fixed `CHORD_DIAGRAM_GAP`, does **not** clear notes | (latent clip bug) | **deferred** (Phase 3) |

The migration was behavior-preserving: the full screenshot suite was byte-identical except a
1–2px improvement on `harmony_grace` (the symbol now also clears the grace note's stem tip).
The new capabilities the pipeline enables but no fixture yet exercises: a wide symbol clearing
a *neighbouring* tall note under its text, and stacking multiple annotations in one column.

## B. Out-of-bounds / clip hazards ("no-man's land") — covered by `escaping`

| Site | Hazard |
|---|---|
| `draw.ts` `pageTop`/`pageBottom` growth | crop grown ad hoc so content isn't clipped |
| `constants.ts::LEDGER_HEADROOM`, `draw.ts` `topSlack` | scratch slack; "bump if an extreme tessitura ever clips" |
| `draw.ts` system-overflow two-pass (`topOverflow`) | reserves vertical space so stacked systems don't collide |

`CollisionDetector.escaping(scratchViewport)` now flags vertical clips per system and warns
(see `warnEscapes` in `draw.ts`). The existing `pageTop`/`pageBottom` crop logic is unchanged —
`escaping` is the generic home for clip handling going forward, the two-pass overflow could
fold into it later.

## C. Fixed structural placement — left alone (NOT collisions)

These are deterministic engraving placement, not runtime clash resolution. Routing them through
the detector would add indirection for no benefit. Documented so future work doesn't "migrate"
them by mistake:

- Page margins (`PAGE_MARGIN_*`), `INTER/INTRA_PART_SPACING`, `BASE_VOICE_WIDTH`.
- Lead-glyph width estimates (`LEAD_BARLINE/CLEF/KEY/TIME`) — generous reservations so notes
  never collide with clef/key/time glyphs.
- `LABEL_GAP` / part-label centering (`+1.5`), `BRACKET_X_SHIFT` (bracket sits just outside the
  system line, `draw.ts` bracket blocks).
- Tab note-area centering, tab grace alignment, `GRACE_SPACING` pre-reservation (`layout.ts`).
- Chord-diagram-internal geometry (`barShiftX`, `bridgeWidth`, title/dot/barre positions in
  `chord-diagram.ts`).
- Tab fret / harmonic-bracket centering (`notes.ts` `boldFret`/harmonic layout).
- Analytic slur control-point lift (`spanners.ts` `cpYFor`), wrapped tie/slur split.
