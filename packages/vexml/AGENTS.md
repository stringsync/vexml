# What controls what

This file maps music notation to the source files that render it. When
something looks wrong on the page, start here, not with grep: the score's
vocabulary (slur, volta, hairpin, fingering) rarely matches the identifier
that draws it.

**Keep this file current.** A file added, moved, renamed, or deleted under
this package, or a concept moved between files, updates this map in the same commit.
`CLAUDE.md` is a symlink to this file.

Files not named here are test fakes (`fake-*.ts`) or the public surface
(`index.ts`, `config.ts`, `constants.ts`). `Rect` and the hit-index `QuadTree`
come from `webappwiz/geometry`, not this repo. Every feature has a fixture in
`packages/integration/render.test.ts`, named for the concept.

## The pipeline

`render()` in `render.ts` is the composition root; `ScoreRenderer`
(`score-renderer.ts`) runs the stages in order.

| Stage | Does | Files |
| --- | --- | --- |
| Fonts | Loads Bravura + text face as CSS vars, awaits residency before layout | `font-loader.ts`, `default-font-loader.ts` |
| Parse | MusicXML text to an mdom document | `score-parser.ts`, `default-score-parser.ts` |
| Gaps | Inserts the caller's silent measures | `gaps.ts` |
| Layout | Measure widths, system breaks, stave offsets — no drawing | `layout-planner.ts` |
| Draw | Two passes over the canvas; everything engraved | `score-drawer.ts`, `draw-pass.ts` + collaborators below |
| Elements | Raw geometry to hit-testable wrappers | `element-factory.ts`, `element-index.ts` |
| Playback | Beats to ms, repeats unrolled, swing applied | `sequence-factory.ts`, `measure-sequence-iterator.ts`, `sequence.ts` |
| Result | What `render()` hands back | `score.ts` |

Two rules cut across the draw stage:

- `score-reader.ts` is the only place that reads mdom attributes (clefs, keys,
  times, part groups, repeats, directions, endings) — nothing else reads the
  document directly. Questions that also need the caller's config live in
  `stave-plan.ts` (which staves a part shows, which are tablature).
- The translators turn one mdom chord into vexflow objects. A single wrong
  note is one of these:
  - `chord-translator.ts` — the StaveNote itself: keys, noteheads,
    accidentals, dots, stems.
  - `notation-translator.ts` — what hangs off it: articulations, ornaments,
    technical marks, fermatas, arpeggios, lyrics.
  - `tab-voice-translator.ts` — fret positions and styling, bends, tab graces.
  - `voice-translator.ts` — a whole voice of tickables: onsets, ghost padding,
    grace groups, mid-measure dividers and clef changes.
  - `signature-translator.ts` (clef/key/time specs), `barline-translator.ts`
    (repeat dots, voltas, mid-measure dividers), `duration-translator.ts`
    (duration codes, ghost fills) are the shared pieces underneath.

## Staves, measures, and the frame

- **Stave, clef, key signature, time signature** — `stave-builder.ts`, `signature-translator.ts`, `custom-key-signature.ts`, `score-reader.ts`
- **Mid-measure clef changes, mid-measure barlines** — `score-reader.ts` (`midClefsOf`, `midBarlinesOf`), `voice-translator.ts`, `signature-translator.ts`, `barline-translator.ts`, `layout-planner.ts`
- **Barlines, repeat signs, volta (ending) brackets** — `barline-translator.ts`, `stave-builder.ts`, `connector-drawer.ts`, `score-reader.ts`
- **Measure numbers** — `stave-builder.ts` (`showsMeasureNumber`)
- **Multi-measure rests** — `stave-builder.ts` (`drawMultiRest`), `layout-planner.ts`
- **Braces, brackets, part-group connectors, part names** — `connector-drawer.ts`, `score-reader.ts`
- **Percussion staves, unpitched notes** — `stave-builder.ts`, `chord-translator.ts`
- **Transposing parts** — `stave-builder.ts`, `system-formatter.ts`

## Notes and voices

- **Noteheads, accidentals, stems, flags, rests, dots, ledger lines** — `chord-translator.ts`
- **Voices on one stave, stem direction, voice-level layout** — `voice-builder.ts`
- **Beams, tuplets, grace notes** — `voice-builder.ts` (grouping), `spanner-builder.ts` (construction), `system-formatter.ts` (grace spacing)
- **Cross-staff notes and beams** — `voice-builder.ts`
- **Articulations, fermatas, ornaments, trills, tremolos, arpeggios, harmonics** — `notation-translator.ts`
- **Invisible notes (`print-object="no"`), note colors** — `chord-translator.ts`
- **Formatting a measure column: note x, note extents, alignment** — `system-formatter.ts`

## Horizontal spacing (how wide a measure is, where a note sits in it)

- **Intra-voice note spacing: denser measure wider, longer note more room, sub-linearly** — `layout-planner.ts` (`noteLogWidth`, `measureNoteArea`), `constants.ts` (`BASE_VOICE_WIDTH`, `LOG_SPACING_RATIO`, `MIN_LOG_FACTOR`), `config.ts` (`noteSpacing`, `softmaxFactor`)
- **A measure's two widths: the `ideal` the curve wants, the `min` below which notes collide** — `layout-planner.ts` (`measureNoteArea`)
- **Where notes actually land, justified into the planned box at draw time** — `system-formatter.ts` (`formatAndDraw`), `voice-translator.ts` (`softVoice`)
- **Room reserved at a measure's left for clef/key/time/repeat** — `layout-planner.ts`, `constants.ts` (`LEAD_*`)
- **Room held open for a words directive overrunning the barline** — `layout-planner.ts` (`trailingWordsPad`, `leadingWordsPad`)
- **Grace-note room** — `layout-planner.ts` (`graceWidthOf`), `system-formatter.ts` (`closeGraceGaps`)
- **Minimum tab note spacing, minimum multi-rest width** — `layout-planner.ts`, `constants.ts`
- **Squaring opening repeats and time signatures across a system's staves** — `system-formatter.ts` (`alignBegModifiers`)

## System and page layout (vertical, and across the line)

- **Breaking measures into systems: greedy packing, then evening a lopsided pair** — `layout-planner.ts` (`evenOutSystems`)
- **A break the document forced (`<print new-system="yes">`)** — `layout-planner.ts` (read off the mdom measure), `config.ts` (`honorSystemBreaks`)
- **Justifying a complete system to full width; last one left short** — `layout-planner.ts`, `config.ts` (`minLastSystemFill`)
- **A document line too wide for the page: wrap / allow / widen** — `layout-planner.ts`, `config.ts` (`overflow`)
- **Panoramic (one endless system) vs standard layout** — `layout-planner.ts`, `config.ts`, `scroll-controller.ts`
- **Label columns reserved left of the first system** — `layout-planner.ts` (`labelIndent`, `partLabelIndent`), `connector-drawer.ts`
- **Stave offsets within a system: gap inside a part vs between parts** — `layout-planner.ts`, `constants.ts` (`INTRA_PART_SPACING`, `INTER_PART_SPACING`)
- **Widening a stave gap the music outgrows — per x column, per system** — `spill-tracker.ts`, `spill-resolver.ts`
- **Gap between stacked systems; notes rising above a system's top stave** — `spill-tracker.ts`, `spill-resolver.ts`, `constants.ts` (`SYSTEM_GAP`)
- **Why there are two draw passes** — `score-drawer.ts` (driver), `spill-resolver.ts` (the redraw decision)
- **Page margins, ledger headroom, the final crop and blit** — `score-drawer.ts`, `constants.ts`
- **Keeping two marks from printing through each other** — `collision-resolver.ts` (section below)

## Spanners (things that connect two notes)

- **Ties, slurs** — `spanner-builder.ts`, `spanner-resolver.ts`, `crisp-curve.ts`, `head-curve.ts`, `tab-curve.ts` (the arcs)
- **Hammer-ons, pull-offs, slides, glissandos** — `spanner-builder.ts`, `spanner-resolver.ts`, `notation-slide.ts`, `single-slide.ts`, `crisp-tab-slide.ts`, `tab-slide-line.ts` (the lines)
- **Ottava (8va) brackets, pedal lines, hairpins/wedges, bracket-and-dashes lines** — `spanner-resolver.ts`, `score-reader.ts`, `hairpin.ts` (the wedge glyph)

## Text and marks around the stave

- **Dynamics, words directions, rehearsal marks, segno/coda, figured bass** — `direction-placer.ts`, `score-reader.ts`, `dynamic-glyphs.ts`
- **Tempo and metronome marks** — `direction-placer.ts`, `metronome-glyph.ts` (the note-group form)
- **Chord symbols (`<harmony>`)** — `direction-placer.ts`
- **Chord diagrams (fret boxes)** — `chord-diagram-glyph.ts` (drawing), `direction-placer.ts` (placement), `chord-diagram.ts` (the element)
- **Lyrics, verses, melisma lines** — `lyric-placer.ts`, `lyric-mark.ts`, `lyric-annotation.ts`
- **Fingerings, string numbers, other technical marks** — `technical-mark.ts`, `technical-annotation.ts`, `notation-translator.ts`, `system-formatter.ts` (stacking)

## Collisions and nudges

`collision-resolver.ts` is the one mechanism for "move this so it clears
that". **Any new clearance logic goes through it** — no new bespoke magic
offsets.

Per element: compute its natural `Rect`, resolve it against everything already
placed (`liftClear`/`dropClear`, `pushRightOf`, `nudgeInsideX`), draw it
there, then `add` the placed rect. `kinds` narrows which obstacles count;
`band` scopes to one stave row. The index is built per system in
`draw-pass.ts`; `escaping()` reports what the canvas would clip
(`warnEscapes`).

| Moves | To clear | Where |
| --- | --- | --- |
| Chord symbols, words, rehearsal marks, tempo marks | notes, ties, slur bows, lyrics, technical marks, volta brackets, other placed text (`placement="below"` words drop instead of lifting) | `direction-placer.ts` |
| Chord diagrams | lift off notes, push right of the previous diagram, lift again, pull inside the page edge | `direction-placer.ts` |
| Hairpins, pedal lines, ottava brackets | slur bows and beam-extended stem tips, via a resolver scoped to their own stave (they resolve after the per-system index) | `spanner-resolver.ts` |
| Volta (ending) brackets | noteheads, stem tips and slur bows on the top stave — resolved a pass late, see below | `draw-pass.ts` (`observeVoltaLift`) |

Registered as obstacles: noteheads/stem tips, tie apexes, tab bend arcs, slur
bows, technical marks (`system-formatter.ts`); lyrics and melisma lines
(`lyric-placer.ts`); volta brackets — including the next measure's, a column
early — and measure numbers (`stave-builder.ts`).

Deliberately NOT collisions, do not "migrate" them: deterministic engraving
placement (page margins, `LEAD_*` reservations, part labels and brackets,
chord-diagram internals, tab centering, slur control points); and stave/system
spill (`spill-tracker.ts`, `spill-resolver.ts`), which moves a whole row. The
volta bracket resolves against the index like anything else, but a pass late:
it draws with the stave, before the notes are formatted, so the lift is
measured after the format pass and applied on the NEXT draw pass
(`draw-pass.ts`, `observedVoltaLifts`), one shared height per system. `<bracket>`/`<dashes>` spans take
vexflow's fixed text line — drawn in the finish pass, after the index clears.

## Tablature

- **Tab staves, tunings, whether a part is tab** — `score-reader.ts`, `stave-builder.ts`
- **Fret numbers, tab stems, bends** — `tab-voice-translator.ts`, `voice-builder.ts`, `stave-plan.ts` (which staves are tab)
- **Tab note geometry for the hit index** — `geometry-collector.ts`
- **The `TabPosition` a caller gets back** — `tab-position.ts`

## Reading the document

- **Divisions, ticks, beats, pickup measures, `<senza-misura>`** — `score-reader.ts` (`meterBeats`)
- **Repeat structure, endings, how many passes** — `score-reader.ts` (`measureRepeats`, `endingPasses`)
- **Directions routed to the right staff** — `score-reader.ts`
- **Silent gap measures the caller asked for** — `gaps.ts`

## Interaction and playback

- **What a caller gets from a hit test** — `element.ts`, `element-index.ts`, `note.ts`, `measure.ts`, `measure-box.ts`, `voice.ts`, `part.ts`, `system.ts`
- **Pointer position to element** — `hit-tester.ts`, `default-hit-tester.ts`, `element-index.ts`
- **Coloring, highlighting, halos** — `decoration.ts`, `default-decoration.ts`, `default-decorations.ts`, `decoration-style.ts`, `color-style.ts`, `halo-style.ts`
- **Playback timeline, repeats unrolled, swing** — `sequence-factory.ts`, `sequence.ts`, `measure-sequence-iterator.ts` (repeat/volta expansion), `tempo-map.ts`, `swing-warp.ts`
- **The moving cursor** — `cursor-controller.ts`, `cursor-view.ts`, `playhead.ts`, `cursor-host.ts`, `cursor-host-adapter.ts`
- **Scrolling and the visible window** — `scroller.ts`, `scroll-controller.ts`, `viewport.ts`
- **The DOM the score lives in (container, canvas, overlays)** — `host.ts`, `stage.ts`, `layer.ts`, `managed-layer.ts`, `recording-context.ts`, `layer-host.ts`, `scroll-host.ts`

## Conventions

- One concept per file, named after the class it exports. Every file sits
  flat in the package root — no subdirectories. An interface and its implementations are
  siblings (`font-loader.ts`, `default-font-loader.ts`, `noop-font-loader.ts`),
  fakes included.
- The draw pass owns no shared blackboard: `draw-pass.ts` constructs each
  collaborator per pass and snapshots per-column data into it.
- Rendering is verified by screenshot: `vex test` diffs every fixture. A
  refactor that changes no pixels should report "no screenshot changes"; any
  change that does is a deliberate decision.
