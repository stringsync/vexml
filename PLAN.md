# Gap measures

Non-musical measures with a fixed ms duration, optional label, and optional overlay style,
declared via `config.gaps` and inserted into the parsed document before layout.

- [x] Phase 1 — config + insertion: `Gap`/`GapStyle` types, `Config.gaps`,
      `src/gaps.ts` (insert empty mdom measures per part, copy adjacent signature,
      caller-index -> document-index map), wire into ScoreRenderer with validation.
- [x] Phase 2 — layout + draw: minWidth/label width floor in LayoutPlanner,
      skip measure numbering on gaps, draw fill overlay + centered label in DrawPass.
- [x] Phase 3 — sequence: gap MeasureInfo (beats=1, fixed ms tempo segment,
      synthesized onset/step with empty active set) in SequenceFactory.
- [x] Phase 4 — Score.getGaps() (measureIndex/label/startMs/endMs, config order) + exports.
- [x] Phase 5 — tests: integration `measures_gap.png` (baseline reviewed + accepted),
      unit tests for insertion (`src/gaps.test.ts`) + sequence timing.
      Gates passed: `vex fix` clean, `vex test` 274/274.
