# Plan: never render a system that can't fit its notes

Status: **implemented, awaiting acceptance.** `vex fix` and `vex test` both green (451 pass).
Delete this file on acceptance.

## Problem

`score_mozart_das_veilchen.musicxml` forces m6–11 onto one system (`new-system="yes"` on m6
and m12, `new-system="no"` on 7–11). Two places let that system be laid out narrower than its
music needs:

- the `keepsLine` branch allowed a forced line to overrun the page by up to
  `1 - MIN_SYSTEM_SQUASH` (40%).
- `Math.min(cap, …)` in placement then shrank *any* over-wide system down to the page,
  below the collision-free minimum. Notes got cut off.

## What shipped

`measureNoteArea` already computed both numbers it needed — `minNotes` from vexflow's
`preCalculateMinTotalWidth` (collision-free minimum) and `logWidth` (ideal log-spaced width) —
and threw the distinction away by maxing them. It now returns both, and **"no measure is ever
laid out narrower than its min"** is an always-on invariant.

`referenceWidth` is honored exactly, and the document-vs-page conflict is one required key:

```ts
export type StandardLayout = {
  type: 'standard';
  referenceWidth: number;
  honorSystemBreaks: boolean;   // moved here from the top level of Config
  overflow: 'wrap' | 'allow' | 'widen';
};
```

- `'wrap'` (default) — page wins: break the line where the document said not to.
- `'allow'` — document wins: the system spills past `referenceWidth`; the page box grows to
  cover it so it scales into the container instead of clipping.
- `'widen'` — `referenceWidth` itself grows until every system fits at ideal spacing.

**`'wrap'`'s limitation:** a single measure whose minimum exceeds the usable width can't be
wrapped, so it spills like `'allow'`. Documented in README.md and at the wrap site.

## Two things the plan got wrong

1. **A uniform per-system squeeze floor doesn't work.** Flooring `areaScale` at
   `max(min_i / ideal_i)` let the single least-compressible measure in a line — an empty bar
   already sitting at `BASE_VOICE_WIDTH` — pin the whole system's scale to 1.0, so lines that
   had plenty of give spilled anyway. Squeezing is now proportional to each measure's *own*
   give (`ideal - min`): rigid measures hold their width while roomier neighbors close up.
   Stretching stays uniform, so justification is unchanged.

2. **`evenOutSystems` could violate the invariant.** It rebalances a lopsided pair of systems
   by ideal width and knew nothing about minimums, so it could hand a measure to a system that
   couldn't hold it — that was joplin's 964px page. It now refuses any move that pushes the
   receiving system past its minimum.

## Files

- `src/config.ts` — `StandardLayout`/`PanoramicLayout`/`SystemOverflow`, `LayoutInput`,
  `ConfigInput`, `DEFAULT_STANDARD_LAYOUT`; `honorSystemBreaks` removed from top-level `Config`.
- `src/render.ts` — deep-merges `layout` (the top-level spread would drop omitted knobs).
- `src/engraving/layout-planner.ts` — `NoteArea`, min-based break test, `'widen'` iteration,
  proportional squeeze, `evenOutSystems` guard, page box covers spill.
- `src/constants.ts` — `MIN_SYSTEM_SQUASH` deleted.
- `src/index.ts` — new types exported.
- `site/src/App.tsx` — layout knobs write through one nested object; overflow selector added.
- `tests/testing/{harness,test-case}.ts` — take `ConfigInput`.
- `README.md` — "When a line won't fit".

## Baselines

New: `overflow_wrap/allow/widen.png` off `overflow_forced_line.musicxml` (An Chloé m5–9, an
engraved line with real give in it, so the three modes come out at three different widths).

Updated — the three fixtures whose documents force lines wider than 900px:

| fixture | before | after |
| --- | --- | --- |
| score_mozart_das_veilchen | 932x1898 | 932x3710 |
| score_mozart_an_chloe | 932x1698 | 932x3310 |
| score_joplin_elite_syncopations | 932x6442 | 932x9082 |

Each engraved line now splits in two rather than squeezing below the minimum, so these pages
roughly double in height. `overflow: 'widen'` renders them as the document drew them.

## Open question for review

Is the default `'wrap'` height cost acceptable for these Lieder, or should scores that force
their own line breaks default to `'widen'`?
