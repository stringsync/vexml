# What controls what

A map from a piece of music notation to the files that decide how it comes out.
Start here when you know what looks wrong on the page but not where it is
decided — it is faster than grepping, because the vocabulary of the score
(slur, volta, hairpin, fingering) rarely matches the identifier that draws it.

**Keep this file current.** When you add, move, rename, or delete a file in
`src/`, or move a concept from one file to another, update the map in the same
commit. A map that lies costs more than no map. `CLAUDE.md` is a symlink to
this file, so both agents read the same thing.

Files not named here are either infrastructure (`geometry.ts`, `quadtree.ts`),
test harnesses (`*-harness.ts`, `*-fixture.ts`, `fake-*.ts`), or the public
surface (`index.ts`, `config.ts`, `constants.ts`).

To see any of this rendered, `tests/integration/render.test.ts` has a hand-cut
fixture per feature, named for the concept (`stave_spacing_dynamic`,
`tab_bends`, `slur_cross_staff`) and commented with what it is proving.

## The pipeline

`render()` in `render.ts` is the composition root: it constructs every class
below and hands them to `ScoreRenderer` (`score-renderer.ts`), which runs the
stages in order.

| Stage | Does | Files |
| --- | --- | --- |
| Fonts | Loads Bravura + the text face, publishes them as CSS vars | `font-loader/` |
| Parse | MusicXML text to an mdom document | `score-parser/` |
| Gaps | Inserts the caller's silent measures into the parsed parts | `gaps.ts` |
| Layout | Measure widths, system breaks, stave offsets — no drawing | `layout-planner.ts` |
| Draw | Two passes over the canvas; everything engraved happens here | `score-drawer.ts`, `draw-pass.ts` + the collaborators below |
| Elements | Raw geometry to the wrappers a caller hit-tests | `element-factory.ts`, `element-index.ts` |
| Playback | The timeline: beats to ms, repeats unrolled, swing applied | `sequence-factory.ts`, `sequence.ts` |
| Result | What `render()` hands back | `score.ts` |

Two files cut across the draw stage and are worth knowing before anything else:

- `score-reader.ts` — the only place that answers *what does the MusicXML say*
  (clefs, keys, times, tunings, part groups, repeats, directions, endings).
  Nothing else should be reading mdom attributes directly.
- `note-translator.ts` — one mdom chord to vexflow objects: noteheads,
  accidentals, stems, rests, ties' anchors, articulations, ornaments, tab
  frets, bends. If a single note looks wrong, it is usually here.

## Staves, measures, and the frame

- **Stave, clef, key signature, time signature** — `stave-builder.ts`, `score-reader.ts`
- **Mid-measure clef changes, mid-measure barlines** — `score-reader.ts` (`midClefsOf`, `midBarlinesOf`), `note-translator.ts`, `layout-planner.ts`
- **Barlines, repeat signs, volta (ending) brackets** — `stave-builder.ts`, `connector-drawer.ts`, `score-reader.ts`
- **Measure numbers** — `stave-builder.ts` (`showsMeasureNumber`)
- **Multi-measure rests** — `stave-builder.ts` (`drawMultiRest`), `layout-planner.ts`
- **Braces, brackets, part-group connectors, part names** — `connector-drawer.ts`, `score-reader.ts`
- **Percussion staves, unpitched notes** — `stave-builder.ts`, `note-translator.ts`
- **Transposing parts** — `stave-builder.ts`, `system-formatter.ts`

## Notes and voices

- **Noteheads, accidentals, stems, flags, rests, dots, ledger lines** — `note-translator.ts`
- **Voices on one stave, stem direction, voice-level layout** — `voice-builder.ts`
- **Beams, tuplets, grace notes** — `voice-builder.ts` (grouping), `spanner-builder.ts` (construction), `system-formatter.ts` (grace spacing)
- **Cross-staff notes and beams** — `voice-builder.ts`
- **Articulations, fermatas, ornaments, trills, tremolos, arpeggios, harmonics** — `note-translator.ts`
- **Invisible notes (`print-object="no"`), note colors** — `note-translator.ts`
- **Formatting a measure column: note x, note extents, alignment** — `system-formatter.ts`

## Horizontal spacing (how wide a measure is, where a note sits in it)

- **Intra-voice note spacing — the curve that makes a denser measure wider and a
  longer note take more room than a short one, sub-linearly** —
  `layout-planner.ts` (`noteLogWidth`, `measureNoteArea`), `constants.ts`
  (`BASE_VOICE_WIDTH`, `LOG_SPACING_RATIO`, `MIN_LOG_FACTOR`), `config.ts`
  (`noteSpacing`, `softmaxFactor`)
- **A measure's two widths: the `ideal` the curve wants and the `min` below
  which notes collide** — `layout-planner.ts` (`measureNoteArea`)
- **Where the notes actually land, justified into the planned box at draw time** —
  `system-formatter.ts` (`formatAndDraw`), `note-translator.ts` (`softVoice`)
- **Room reserved at a measure's left for clef/key/time/repeat** — `layout-planner.ts`, `constants.ts` (`LEAD_*`)
- **Room held open for a words directive that would overrun the barline** — `layout-planner.ts` (`trailingWordsPad`, `leadingWordsPad`)
- **Grace-note room** — `layout-planner.ts` (`graceWidthOf`), `system-formatter.ts` (`closeGraceGaps`)
- **Minimum tab note spacing, minimum multi-rest width** — `layout-planner.ts`, `constants.ts`
- **Squaring opening repeats and time signatures across a system's staves** — `system-formatter.ts` (`alignBegModifiers`)

## System and page layout (vertical, and across the line)

- **Breaking measures into systems: greedy packing, then evening out a lopsided
  pair** — `layout-planner.ts` (`evenOutSystems`)
- **A break the document forced (`<print new-system="yes">`)** — `layout-planner.ts` (read straight off the mdom measure), `config.ts` (`honorSystemBreaks`)
- **Justifying a complete system to full width; leaving the last one short** — `layout-planner.ts`, `config.ts` (`minLastSystemFill`)
- **A document line too wide for the page: wrap / allow / widen** — `layout-planner.ts`, `config.ts` (`overflow`)
- **Panoramic (one endless system) vs standard layout** — `layout-planner.ts`, `config.ts`, `scroller/scroll-controller.ts`
- **The label columns reserved left of the first system** — `layout-planner.ts` (`labelIndent`, `partLabelIndent`), `connector-drawer.ts`
- **Stave offsets within a system: the gap inside a part vs between two parts** — `layout-planner.ts`, `constants.ts` (`INTRA_PART_SPACING`, `INTER_PART_SPACING`)
- **Widening a stave gap the music outgrows — measured per x column, per
  system, so one dense bar doesn't spread the whole score** — `spill-tracker.ts`, `spill-resolver.ts`
- **The gap between stacked systems, and notes rising above a system's top stave** — `spill-tracker.ts`, `spill-resolver.ts`, `constants.ts` (`SYSTEM_GAP`)
- **Why there are two draw passes at all** — `score-drawer.ts` (the driver), `spill-resolver.ts` (the redraw decision)
- **Page margins, ledger headroom, the final crop and blit** — `score-drawer.ts`, `constants.ts`
- **Keeping two marks from printing through each other** — `collision-resolver.ts`

## Spanners (things that connect two notes)

- **Ties, slurs** — `spanner-builder.ts`, `spanner-resolver.ts`
- **Hammer-ons, pull-offs, slides, glissandos** — `spanner-builder.ts`, `spanner-resolver.ts`
- **Ottava (8va) brackets, pedal lines, hairpins/wedges, bracket-and-dashes lines** — `spanner-resolver.ts`, `score-reader.ts`

## Text and marks around the stave

- **Dynamics, words directions, rehearsal marks, segno/coda navigation, figured bass** — `direction-placer.ts`, `score-reader.ts`
- **Tempo marks and metronome marks** — `direction-placer.ts`, `metronome-glyph.ts` (the note-group form)
- **Chord symbols (`<harmony>`)** — `direction-placer.ts`
- **Chord diagrams (fret boxes)** — `chord-diagram-glyph.ts` (drawing), `direction-placer.ts` (placement), `chord-diagram.ts` (the element)
- **Lyrics, verses, melisma lines** — `lyric-placer.ts`, `lyric-mark/`
- **Fingerings, string numbers, other technical marks** — `technical-mark/`, `note-translator.ts`, `system-formatter.ts` (stacking)

## Tablature

- **Tab staves, tunings, whether a part is tab** — `score-reader.ts`, `stave-builder.ts`
- **Fret numbers, tab stems, bends** — `note-translator.ts`, `voice-builder.ts`
- **Tab note geometry for the hit index** — `geometry-collector.ts`
- **The `TabPosition` a caller gets back** — `tab-position.ts`

## Reading the document

- **Divisions, ticks, beats, pickup measures, `<senza-misura>`** — `score-reader.ts` (`meterBeats`)
- **Repeat structure, endings, how many passes** — `score-reader.ts` (`measureRepeats`, `endingPasses`)
- **Directions routed to the right staff** — `score-reader.ts`
- **Silent gap measures the caller asked for** — `gaps.ts`

## Interaction and playback

- **What a caller gets from a hit test** — `element.ts`, `element-index.ts`, `note.ts`, `measure.ts`, `measure-box.ts`, `voice.ts`, `part.ts`, `system.ts`
- **Turning a pointer position into an element** — `hit-tester/`, `quadtree.ts`
- **Coloring, highlighting, halos** — `decoration/`, `decoration-style/`
- **Playback timeline, repeats unrolled, swing** — `sequence-factory.ts`, `sequence.ts`
- **The moving cursor** — `cursor-controller.ts`, `cursor-view/`, `cursor-host/`
- **Scrolling and the visible window** — `scroller/`, `viewport/`
- **The DOM the score lives in (container, canvas, overlay layers)** — `host/`, `layer/`, `layer-host/`, `scroll-host/`

## Conventions

- One concept per file, named after the class it exports; the classes sit flat
  in `src/`, and an interface with implementations gets a directory named after
  it (`font-loader/`, `lyric-mark/`), fakes included.
- The draw pass owns no shared blackboard: `draw-pass.ts` is a driver that
  constructs each collaborator per pass and snapshots per-column data into it.
- Rendering is verified by screenshot: `vex test` renders every fixture and
  diffs it. A refactor that changes no pixels should report "no screenshot
  changes", and any change that does is a decision to make deliberately.
