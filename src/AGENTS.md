# What controls what

A map from a piece of music notation to the files that decide how it comes out.
Start here when you know what looks wrong on the page but not where it is
decided — it is faster than grepping, because the vocabulary of the score
(slur, volta, hairpin, fingering) rarely matches the identifier that draws it.

**Keep this file current.** When you add, move, rename, or delete a file in
`src/`, or move a concept from one file to another, update the map in the same
commit. A map that lies costs more than no map. `CLAUDE.md` is a symlink to
this file, so both agents read the same thing.

Files not named here are either infrastructure (`geometry.ts`, `quadtree.ts`,
`listenable/`), test harnesses (`*-harness.ts`, `*-fixture.ts`, `fake-*.ts`),
or the public surface (`index.ts`, `config.ts`, `constants.ts`).

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
- **Barlines, repeat signs, volta (ending) brackets** — `stave-builder.ts`, `connector-drawer.ts`, `score-reader.ts`
- **Measure numbers** — `stave-builder.ts` (`showsMeasureNumber`)
- **Multi-measure rests** — `stave-builder.ts` (`drawMultiRest`), `layout-planner.ts`
- **Braces, brackets, part-group connectors, part names** — `connector-drawer.ts`, `score-reader.ts`
- **Measure widths, system breaks, where a stave sits** — `layout-planner.ts`
- **Stave spacing when the music outgrows it, redraw decision** — `spill-tracker.ts`, `spill-resolver.ts`
- **Page size, top/bottom crop, the scratch canvas** — `score-drawer.ts`

## Notes and voices

- **Noteheads, accidentals, stems, flags, rests, dots** — `note-translator.ts`
- **Voices on one stave, stem direction, voice-level layout** — `voice-builder.ts`
- **Beams, tuplets, grace notes** — `voice-builder.ts` (grouping), `spanner-builder.ts` (construction), `system-formatter.ts` (grace spacing)
- **Formatting a measure column: note x, note extents, alignment** — `system-formatter.ts`
- **Articulations, fermatas, ornaments, trills, tremolos, arpeggios** — `note-translator.ts`
- **Cross-stave beaming** — `voice-builder.ts`

## Spanners (things that connect two notes)

- **Ties, slurs** — `spanner-builder.ts`, `spanner-resolver.ts`
- **Hammer-ons, pull-offs, slides, glissandos** — `spanner-builder.ts`, `spanner-resolver.ts`
- **Ottava (8va) brackets, pedal lines, hairpins/wedges, bracket-and-dashes lines** — `spanner-resolver.ts`, `score-reader.ts`

## Text and marks around the stave

- **Dynamics, words directions, rehearsal marks, segno/coda, figured bass** — `direction-placer.ts`, `score-reader.ts`
- **Tempo marks and metronome marks** — `direction-placer.ts`, `metronome-glyph.ts` (the note-group form)
- **Chord symbols (`<harmony>`)** — `direction-placer.ts`
- **Chord diagrams (fret boxes)** — `chord-diagram-glyph.ts` (drawing), `direction-placer.ts` (placement), `chord-diagram.ts` (the element)
- **Lyrics, verses, melisma lines** — `lyric-placer.ts`, `lyric-mark/`
- **Fingerings, string numbers, other technical marks** — `technical-mark/`, `note-translator.ts`, `system-formatter.ts` (stacking)
- **Anything nudging to avoid an overlap** — `collision-resolver.ts`

## Tablature

- **Tab staves, tunings, whether a part is tab** — `score-reader.ts`, `stave-builder.ts`
- **Fret numbers, tab stems, bends** — `note-translator.ts`, `voice-builder.ts`
- **Tab note geometry for the hit index** — `geometry-collector.ts`
- **The `TabPosition` a caller gets back** — `tab-position.ts`

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
