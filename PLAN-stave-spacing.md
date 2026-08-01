# Plan: dynamic intra-part stave spacing

Status: **implemented, awaiting acceptance.** `vex fix` and `vex test` both green (457 pass).
Delete this file on acceptance.

Make the gap between a part's staves follow the music, per the rules deduced from the
Dichterliebe reference engraving.

## Phase 1 — Rule 3: cross-stave spanners are passengers ✅

`SlurCurve.crossStave` (`spanner-builder.ts`) is set from the flag `buildSlurs` already
computes, and the draw pass skips `recordStaveSpill` for such a bow. A cross-stave slur's
height IS the gap it spans, so reporting it had the gap widen to hold a curve that then grew
to match. Cross-stave *stems* were already excluded via `crossStaveNotes`.

## Phase 2 — Rules 2 + 4: spill is an x-profile, not a scalar ✅

`StaveSpill.rise`/`.drop` are now `Map<column, px>`, bucketed at `SPILL_COLUMN` (8px), filled
by `bandSpill`. Every record site passes the `Rect` it already had. `spacedOffsets` takes the
max over columns of `drop(c) + CLEARANCE + rise(c)` (`worstColumn`) instead of
`maxDrop + CLEARANCE + maxRise`, so a deep stem hanging over an empty patch of the stave below
costs nothing.

## Phase 3 — Rule 1: per-system offsets ✅

Spill is keyed `system -> row -> StaveSpill` (`systemOf` resolves a stave's system, which
matters for slurs and wedges — they're drawn in the finish pass, after the measure loop).
`spacedOffsets` returns `Map<system, offsets>`; `ScoreLayout.systemStaveOffsets` carries it to
pass two, where `buildStave` reads its own system's and falls back to the planned array.
Canvas/floor sizing uses the widest system's growth — over-allocation gets cropped.

## Phase 4 — Rule 5: the floor ✅

`INTRA_PART_SPACING` 120 -> 100 (8 -> 6 staff spaces of air). Kept clear of
`INTER_PART_SPACING` (80): `spacedOffsets` tells a within-part gap from a between-part one by
its planned size, so the two must stay distinct numbers.

## Phase 5 — baselines ✅

51 updated, reviewed by family (grand staff, notation+tab, lyrics, chord diagrams, multi-part
scores, cursor/measure-box geometry). Every one shrank; none collide. `stave_spacing.png` did
NOT change, which is the check that matters — its extremes sit at the same beats on purpose,
so the pointwise rule still widens it exactly as the old rule did.

New fixture `stave_spacing_dynamic.musicxml`: the same extremes as `stave_spacing`, alternating
beats on system 1 (gap stays tight, ledger lines interleave without touching) and stacked on
system 2 (gap opens). Two visibly different gaps in one score = rules 1 and 2 in one picture.

## Out of scope

Rule 6 (hide empty staves) is not a spacing rule and does not exist in vexml today. It changes
`totalStaves` per system, `staveRow` indexing throughout the draw pass, the brace/bracket
connectors, and part labels. Reported separately, not attempted here.
