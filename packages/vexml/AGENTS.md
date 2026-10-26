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

[`packages/integration/COVERAGE.md`](../integration/COVERAGE.md) lists every
MusicXML 4.0 element as drawn (with the fixture that shows it), ignored on
purpose, or missing. A change that draws something new updates its row, and
`vex coverage` adds rows when the schema grows.


**A rendering fix lints its fixture before and after** (`vex lint --input <fixture>`).
The score should rise and the finding should go, and nothing else should drop.
## The pipeline

`render()` in `render.ts` is the composition root; `ScoreRenderer`
(`score-renderer.ts`) runs the stages in order.

| Stage | Does | Files |
| --- | --- | --- |
| Fonts | Loads Bravura + text face as CSS vars, awaits residency before layout | `font-loader.ts`, `default-font-loader.ts`, `bravura-url.ts` (the shipped `assets/fonts/Bravura.woff2`, VexFlow's own face; vexml imports `vexflow/core`, which embeds none), `recording-font-loader.ts` (test fake that records loads) |
| Parse | MusicXML text to an mdom document | `score-parser.ts`, `default-score-parser.ts` |
| Gaps | Finds the caller's silent measures, inserting positioned ones into vexml's own parse | `gaps.ts`, `gap-inserter.ts` |
| Layout | Measure widths, system breaks, stave offsets, no drawing | `layout-planner.ts`, `probe-text-canvas.ts` (vexflow's text measuring canvas, answered by the cached probe), `metrics-patch.ts` (vexflow's per-element font/style copies, minus its structuredClone) |
| Draw | A system at a time, recorded as paint ops (no canvas), redrawn only when it needs room; everything engraved | `score-drawer.ts` (whole), `system-draw.ts` (the resumable per-system driver), `draw-pass.ts` + collaborators below |
| Elements | Raw geometry to a plain model, the model to hit-testable wrappers | `element-factory.ts` (`model`, `build`, `buildPlaceable`), `element-model.ts`, `mnote-facts.ts` (a note's pitch/beats/graces, read lazily), `element-index.ts`, `element-placer.ts` (a progressive render's elements moved into place per system) |
| Playback | Beats to ms, repeats unrolled, swing applied | `sequence-factory.ts` (the skeleton: passes, steps, notes), `sequence-placer.ts` (the steps placed on the geometry: x, glide, system box), `measure-sequence-iterator.ts`, `sequence.ts`; `read-timeline.ts` / `timeline.ts` time a score with no layout or draw (`SequenceFactory.timeline`) |
| Result | What `render()` hands back | `score.ts` |
| Snapshot | A render recorded as data, and rendered back without parse, layout or draw | see "Score snapshots" under Interaction and playback |

Two rules cut across the draw stage:

- `score-reader.ts` is the only place that reads mdom attributes (clefs, keys,
  times, part groups, repeats, directions, endings); nothing else reads the
  document directly. Questions that also need the caller's config live in
  `stave-plan.ts` (which staves a part shows, which are tablature).
- The translators turn one mdom chord into vexflow objects. A single wrong
  note is one of these:
  - `chord-translator.ts`: the StaveNote itself: keys, noteheads,
    accidentals, dots, stems.
  - `notation-translator.ts`: what hangs off it: articulations, ornaments,
    technical marks, fermatas, arpeggios, lyrics.
  - `tab-voice-translator.ts`: fret positions and styling, bends, tab graces.
  - `voice-translator.ts`: a whole voice of tickables: onsets, ghost padding,
    grace groups, mid-measure dividers and clef changes.
  - `signature-translator.ts` (clef/key/time specs), `barline-translator.ts`
    (repeat dots, voltas, mid-measure dividers), `duration-translator.ts`
    (duration codes, ghost fills) are the shared pieces underneath.

## Staves, measures, and the frame

- **Stave, clef, key signature, time signature**: `stave-builder.ts`, `stave-factory.ts` (the stave itself and a system's opening clef/key), `signature-translator.ts`, `extended-time-signature.ts` (note-glyph denominators and interchangeable meters), `group-time-signature.ts` (`<group-time/>`: placeholders reserve room per stave, the connector drawer draws one scaled signature; spans from `score-reader.ts` `groupTimeSpans`), `custom-key-signature.ts`, `detailed-stave.ts` (staff lines with their own width, color, dash), `score-reader.ts` (`midClefsOf` holds `after-barline` clefs for the next measure)
- **Mid-measure clef changes, mid-measure barlines**: `score-reader.ts` (`midClefsOf`, `midBarlinesOf`), `voice-translator.ts`, `signature-translator.ts`, `barline-translator.ts`, `layout-planner.ts`
- **Barlines, repeat signs, volta (ending) brackets**: `barline-translator.ts`, `stave-builder.ts`, `connector-drawer.ts`, `score-reader.ts`
- **Volta jog lengths and label offset (`<ending end-length>`, `text-x`), repeat sign wings (`<repeat winged>`)**: `score-reader.ts` (`BarlineGeometry`), `ending-volta.ts` (the bracket), `repeat-wing-drawer.ts` (the wings, from `draw-pass.ts`)
- **Fermatas on a barline**: `score-reader.ts` (`barlineFermatasOf`), `direction-placer.ts` (`drawBarlineFermata`), `fermata-glyphs.ts`
- **Measure numbers**: `measure-number-plan.ts` (which staves number which measures: the config's cadence, or the document's `<print><measure-numbering>` and its `system`/`staff`), `score-reader.ts` (`measureNumberingOf`), `stave-builder.ts` (drawing them)
- **Multi-measure rests**: `stave-builder.ts` (`drawMultiRest`), `layout-planner.ts`
- **Measure repeats, beat repeats, slash notation (`<measure-style>`)**: `score-reader.ts` (`measureStyleOf`, `noteStyleOf` for spans that start or stop mid-measure or except a voice, `isRhythmSlashed`), `measure-style-drawer.ts` (the signs, drawn in place of the notes), `invisible-stave-note.ts` (a hidden note draws its beat's sign), `draw-pass.ts`, `chord-translator.ts` (rhythm slash noteheads), `voice-builder.ts` (their beams stem up)
- **Braces, brackets, part-group connectors, part names and abbreviations**: `connector-drawer.ts`, `score-reader.ts` (`partLabels`, `partGroups`), `draw-pass.ts`, `layout-planner.ts` (`laterLabelIndent`)
- **Percussion staves, unpitched notes**: `stave-builder.ts`, `chord-translator.ts`
- **Transposing parts**: `stave-builder.ts`, `system-formatter.ts`

## Notes and voices

- **Noteheads, accidentals, stems, flags, rests, dots, ledger lines**: `chord-translator.ts`, `notehead-text.ts` (the <notehead-text> label inside a head)
- **Voices on one stave, stem direction, voice-level layout**: `voice-builder.ts`
- **Cue notes** (`<cue/>`, `<type size="cue">`): `cue-note.ts` reads them; `chord-translator.ts` draws them as small notes, `sequence-factory.ts` leaves them out of playback
- **Beams, tuplets, grace notes**: `voice-builder.ts` (grouping), `spanner-builder.ts` (construction), `feathered-beam.ts` (`beam@fan`), `display-tuplet.ts` (show-number none, note-value glyphs, curved line), `system-formatter.ts` (grace spacing)
- **Cross-staff notes, beams and tuplets; the ghosts holding a crossed note's time on the other staff**: `voice-builder.ts`, `voice-translator.ts` (`gapFill`), `score-reader.ts` (`staffVoices`)
- **Articulations, fermatas, ornaments, trills, tremolos, arpeggios, harmonics**: `notation-translator.ts`, `bowed-tremolo.ts` (start/stop tremolo between two notes), `fermata-glyphs.ts` (each fermata shape's glyphs), `stave-articulation.ts` (the lift clear of a beam), `notehead-articulation.ts` (the side opposite the stem), `voice-articulation-placer.ts` (past the stem when another voice crowds that side), `non-arpeggio-bracket.ts` (the `<non-arpeggiate>` bracket), `unbroken-arpeggio.ts` (one `unbroken="yes"` roll across a part's staves, joined in `draw-pass.ts`), `smufl.ts` (a `smufl` attribute's glyph, for the `<other-*>` marks)
- **Staff size (`staff-size`)**: `stave-factory.ts` (line spacing, clef), `system-formatter.ts` (`shrinkNoteheads`: heads, stems, flags, accidentals), `staff-scaled-signatures.ts` (key and time signature glyphs)
- **Editorial marks (`<level>` parentheses/brackets round a note, `<footnote>` text above it)**: `chord-translator.ts` (`addLevel`), `notation-translator.ts`, `footnote-annotation.ts` (stacked by `system-formatter.ts` with the technical labels)
- **Invisible notes (`print-object="no"`), hidden dots/ledger lines (`print-dot`, `print-leger`), note colors**: `chord-translator.ts`, `invisible-stave-note.ts` (the hidden StaveNote)
- **Hidden lyrics (`print-lyric`), notations (`<notations print-object>`), staff lines (`staff-details`, per-line `line-detail` via `detailed-stave.ts`), ending brackets (`<ending print-object>`)**: `notation-translator.ts`, `stave-factory.ts`, `score-reader.ts` (`measureRepeats`), `barline-translator.ts`
- **Formatting a measure column: note x, note extents, alignment**: `system-formatter.ts`

## Horizontal spacing (how wide a measure is, where a note sits in it)

- **Intra-voice note spacing: denser measure wider, longer note more room, sub-linearly**: `layout-planner.ts` (`noteLogWidth`, `measureNoteArea`), `constants.ts` (`BASE_VOICE_WIDTH`, `LOG_SPACING_RATIO`, `MIN_LOG_FACTOR`), `config.ts` (`noteSpacing`, `softmaxFactor`)
- **A measure's two widths: the `ideal` the curve wants, the `min` below which notes collide**: `layout-planner.ts` (`measureNoteArea`)
- **Where notes actually land, justified into the planned box at draw time**: `system-formatter.ts` (`formatAndDraw`), `voice-translator.ts` (`softVoice`)
- **Room reserved at a measure's left for clef/key/time/repeat**: `layout-planner.ts`, `constants.ts` (`LEAD_*`)
- **Room held open for a words directive overrunning the barline**: `layout-planner.ts` (`trailingWordsPad`, `leadingWordsPad`)
- **Grace-note room**: `layout-planner.ts` (`graceWidthOf`), `system-formatter.ts` (`closeGraceGaps`)
- **Minimum tab note spacing, minimum multi-rest width**: `layout-planner.ts`, `constants.ts`
- **Squaring opening repeats and time signatures across a system's staves**: `system-formatter.ts` (`alignBegModifiers`)

## System and page layout (vertical, and across the line)

- **Breaking measures into systems: greedy packing, then evening a lopsided pair**: `layout-planner.ts` (`evenOutSystems`)
- **A break the document forced (`<print new-system="yes">`)**: `layout-planner.ts` (read off the mdom measure), `config.ts` (`honorSystemBreaks`)
- **The document's own page, system margins, system and staff distances (`documentLayout`)**: `score-reader.ts` (`documentLayoutOf`: `<defaults>` and each `<print>`), `document-layout.ts` (per-system answers; tenths read as px), `layout-planner.ts` (page width and margins, system indents, `documentSystems`: planned stave gaps and the distances above each system), `draw-pass.ts` (`beginSystem`: system-distance from the lines above, floored by the music), `spill-resolver.ts` (the document's gaps as each system's planned floor), `page-planner.ts` (`DocumentPages`: fit by staff lines, top-system-distance, `new-page`, `blank-page`)
- **Justifying a complete system to full width; last one left short**: `layout-planner.ts`, `config.ts` (`minLastSystemFill`)
- **A document line too wide for the page: wrap / allow / widen**: `layout-planner.ts`, `config.ts` (`overflow`)
- **Panoramic (one endless system) vs standard layout**: `layout-planner.ts`, `config.ts`, `scroll-controller.ts`
- **A panoramic line shown at a `scale`, or fitted to a `fitHeight` strip**: `score-drawer.ts` (the strip's crop and the scale, from the stave lines `draw-pass.ts` records), `stage.ts` (`--vexml-scale` sizes the box; everything maps through `frame()`), `tiled-surface.ts` (`rescale`: tiles painted at the shown size)
- **Sticky clef/key fold on a scrolled panorama (`stickySignatures`)**: `signature-fold.ts` (which strip, and engraving it), `fold.ts` (the seam), `stage.ts` (the sticky element, showing it, scroll inset, pointer occlusion), `score-drawer.ts` (builds it)
- **Label columns reserved left of the first system**: `layout-planner.ts` (`labelIndent`, `partLabelIndent`), `connector-drawer.ts`
- **Stave offsets within a system: gap inside a part vs between parts**: `layout-planner.ts`, `constants.ts` (`INTRA_PART_SPACING`, `INTER_PART_SPACING`)
- **Widening a stave gap the music outgrows, per x column, per system**: `spill-tracker.ts`, `spill-resolver.ts`
- **Gap between stacked systems; notes rising above a system's top stave**: `spill-tracker.ts`, `spill-resolver.ts`, `constants.ts` (`SYSTEM_GAP`)
- **Why a system is drawn twice**: `system-draw.ts` (driver: a system drawn, weighed, redrawn if it needs room), `spill-resolver.ts` (the redraw decision)
- **Score header: title, subtitles, lyricist and composer lines above the first system, credit symbols, and the rights footer under the last (`showHeader`)**: `score-reader.ts` (`headerOf`: credits, else work/identification), `header-plan.ts` (line stack), `layout-planner.ts` (the room above the first system), `draw-pass.ts` (`drawHeader`, `drawFooter`; the header hung above the first system's ink; the crop and page plan keep it)
- **Page margins, ledger headroom, the final crop**: `score-drawer.ts`, `constants.ts`
- **Paged layout: systems fitted onto fixed-size pages, each page exported on its own canvas**: `page-planner.ts` (which system starts a page, the push down to it), `layout-planner.ts` (`PageFrame`: the page's size, margins and shift), `score-drawer.ts` (the third pass that draws the pushes, page rects), `draw-pass.ts` (`systemExtents`), `layout-planner.ts` (the page's reference width), `page.ts` (`toBlob`/`toCanvas`), `page-painter.ts` (the seam; `Stage.paintEngraving`)
- **Long scores past the browser's canvas limits (tiles)**: `paint-context.ts` (the recording `CanvasRenderingContext2D` vexflow and `Layer.ctx` draw on, and each op's bounds), `paint-op.ts`, `paint-state.ts`, `affine.ts`, `paint-sink.ts`, `paint-list.ts` (the engraving's ops), `paint-probe.ts`, `canvas-paint-probe.ts` (text metrics and hit tests a recording can't answer), `fake-paint-probe.ts`, `paint-replayer.ts` (ops back onto a real canvas), `tile-grid.ts` (ops per tile, clear pruning), `tiled-surface.ts` (tile canvases, painted whole or only near the view), `tile-budget.ts` (the LRU when painting lazily), `tiled-layer.ts`, `constants.ts` (`TILE_SIZE`, `TILE_BUDGET`)
- **Keeping two marks from printing through each other**: `collision-resolver.ts` (section below)

## Spanners (things that connect two notes)

- **Ties, slurs**: `spanner-builder.ts`, `spanner-resolver.ts`, `crisp-curve.ts`, `head-curve.ts`, `tab-curve.ts` (the arcs), `dashed-tie.ts` (a dashed or dotted tie), `score-reader.ts` (`lineDashOf`: `line-type`, `dash-length` and `space-length` to a dash array, shared by every spanner)
- **Spanners across a system break**: `spanner-resolver.ts` (`resolveSystem`: each system draws the spanners whose later end it holds, from a window of chords back to the oldest open start; hairpins wait for the bows on their stave), `spanner-builder.ts` (`SpanScope`, `reach`)
- **Hammer-ons, pull-offs, slides, glissandos**: `spanner-builder.ts`, `spanner-resolver.ts`, `notation-slide.ts`, `single-slide.ts`, `crisp-tab-slide.ts`, `tab-slide-line.ts` (the lines)
- **Ottava (8va) brackets, pedal lines, hairpins/wedges, bracket-and-dashes lines**: `spanner-resolver.ts`, `score-reader.ts`, `hairpin.ts` (the wedge glyph, its dash and niente circle)

## Text and marks around the stave

- **Dynamics, words directions (`<other-direction>` among them), rehearsal marks, segno/coda, figured bass, harp pedal diagrams (`harpPedalsOf`)**: `direction-placer.ts`, `score-reader.ts`, `dynamic-glyphs.ts`
- **Their formatting: face, style, weight, size, underline, enclosure, alignment**: `score-reader.ts` (`formatOf`, `TextFormat`; sizes scale against `<defaults><word-font>`, a glyph dynamic against `<music-font>`, a lyric against `<lyric-font>`; ratio math in `font-scale.ts`), `direction-placer.ts` (`faceOf`: the document's face only under `documentFonts`), `font-families.ts` (`documentStack`: a MusicXML font-family over the text face), `notation-translator.ts` (`lyricFaceOf`: a lyric's face from its `<text>` or `<lyric-font>`), `formatted-text.ts` (text, underlines and enclosure measured and drawn as one box), `text-enclosure.ts` (each enclosure shape)
- **Symbol-style directions (damp, eyeglasses, string mute, staff divide, principal voice, `<symbol>`)**: `score-reader.ts` (`symbolsOf`, `SMUFL_GLYPHS`), `direction-placer.ts`
- **Tempo and metronome marks**: `direction-placer.ts`, `metronome-glyph.ts` (the note-group form, tied units, arrows)
- **Chord symbols (`<harmony>`)**: `direction-placer.ts`
- **Roman numeral analysis (`<harmony><numeral>`, `<function>`), hung under the stave**: `score-reader.ts` (`analysisSymbol`: case, quality, figures, key), `direction-placer.ts` (`drawHarmony`'s below side)
- **Capo label ("Capo N" over a tab part's first system)**: `draw-pass.ts` (`capoTasks`), `direction-placer.ts` (`placeColumn`)
- **Chord diagrams (fret boxes)**: `chord-diagram-glyph.ts` (drawing), `direction-placer.ts` (placement), `chord-diagram.ts` (the element)
- **Lyrics, verses, melisma lines**: `lyric-placer.ts`, `lyric-mark.ts`, `lyric-annotation.ts` (the verse drops under below-stave articulations and technical marks: `system-formatter.ts` `belowMarksBottom`, `stave-articulation.ts` `belowBottomY`)
- **Fingerings, string numbers, other technical marks**: `technical-mark.ts`, `technical-annotation.ts`, `fingering-annotation.ts`, `string-number-annotation.ts` (the ringed digit), `notation-translator.ts`, `system-formatter.ts` (stacking)

## Collisions and nudges

`collision-resolver.ts` is the one mechanism for "move this so it clears
that". **Any new clearance logic goes through it**: no new bespoke magic
offsets.

Per element: compute its natural `Rect`, resolve it against everything already
placed (`liftClear`/`dropClear`, `pushRightOf`, `nudgeInsideX`), draw it
there, then `add` the placed rect. `kinds` narrows which obstacles count;
`band` scopes to one stave row. The index is built per system in
`draw-pass.ts`; `escaping()` reports what the canvas would clip
(`warnEscapes`).

| Moves | To clear | Where |
| --- | --- | --- |
| Chord symbols, Roman numeral analysis, words, rehearsal marks, tempo marks | notes, ties, slur bows, tuplet numbers, lyrics, technical marks, volta brackets, other placed text (`placement="below"` words drop instead of lifting, and below words also drop under the hairpins the previous pass drew there, `SpannerResolver.observeStackedWords`; dynamics stay on the hairpin's line) | `direction-placer.ts` |
| Chord diagrams | lift off notes, pull inside the page edge (leaving room for the column's later boxes, so a crowded row packs leftward in chord order), push right of the previous diagrams (iterated until clear), lift again | `direction-placer.ts` |
| Hairpins, pedal lines, ottava brackets | slur bows and beam-extended stem tips (hairpins also the notes they span, their tuplet numbers and tie arcs, and a crescendo running into a diminuendo shares one line), via a resolver scoped to their own stave (they resolve after the per-system index, a hairpin once every system its stave's bows reach is drawn) | `spanner-resolver.ts` |
| Volta (ending) brackets | noteheads, stem tips and slur bows on the top stave (resolved a pass late, see below) | `draw-pass.ts` (`observeVoltaLift`) |

Registered as obstacles: noteheads/stem tips, tie apexes, tab bend arcs, slur
bows, tuplet numbers, technical marks (`system-formatter.ts`); lyrics and melisma lines
(`lyric-placer.ts`); volta brackets (including the next measure's, a column
early) and measure numbers (`stave-builder.ts`).

Deliberately NOT collisions, do not "migrate" them: deterministic engraving
placement (page margins, `LEAD_*` reservations, part labels and brackets,
chord-diagram internals, tab centering, slur control points); and stave/system
spill (`spill-tracker.ts`, `spill-resolver.ts`), which moves a whole row:
tuplet brackets report there against the stave they stand over
(`system-formatter.ts`, `tupletHost`), and slur and tie arcs (`spanner-resolver.ts`,
`reportBow`), so a bracket or a bow
reaching into the gap between staves widens it. The
volta bracket resolves against the index like anything else, but a pass late:
it draws with the stave, before the notes are formatted, so the lift is
measured after the format pass and applied on the NEXT draw pass
(`draw-pass.ts`, `observedVoltaLifts`), one shared height per system. `<bracket>`/`<dashes>` spans take
vexflow's fixed text line, drawn in the finish pass, after the index clears.

## Tablature

- **Tab staves, tunings, whether a part is tab**: `score-reader.ts`, `stave-builder.ts`
- **Fret numbers, tab stems, bends**: `tab-voice-translator.ts`, `tab-bend.ts` (the bend arrow: angled or curved legs, pre-bends, whammy-bar dips and scoops), `score-reader.ts` (`bendOf`), `voice-builder.ts`, `stave-plan.ts` (which staves are tab)
- **Tab note geometry for the hit index**: `geometry-collector.ts`
- **The `TabPosition` a caller gets back**: `tab-position.ts`

## Reading the document

- **Divisions, ticks, beats, pickup measures, `<senza-misura>`**: `score-reader.ts` (`meterBeats`)
- **Repeat structure, endings, how many passes**: `score-reader.ts` (`measureRepeats`, `measureJumps`, `navigationJumps`, `endingPasses`)
- **Directions routed to the right staff**: `score-reader.ts`
- **Silent gap measures the caller asked for**: `gaps.ts` (which measures are gaps, and which the input can hold), `gap-inserter.ts` (inserting them; `beforeBarIndex` in playback order, refused inside a repeat), `insert-gaps.ts` (the public `insertGaps` for a caller's own document)
- **Gaps before the first measure or after the last, drawn as boxes outside the staves**: `layout-planner.ts` (`MeasureBox.edge`, fixed box widths, flush against the bracket or final barline), `stave-plan.ts` (`systemOverhang`), `draw-pass.ts` (`drawEdgeGap`; the time signature and end barline move to the music via `opensScore`/`isLastMeasure`)

## Interaction and playback

- **Editing controller activation, selection colors, shaded regions and cursor halo/outline**: `editing-controller.ts`, `selection-overlay.ts`, `color-style.ts`, `halo-style.ts`
- **Editing focus, active voice, range/set selection and undo/redo**: `editing-session.ts`, `pitch-edit.ts`; public usage and limitations in `skills/vexml/SKILL.md` (Editing)
- **Editing navigation in written order and across rendered systems**: `editing-navigator.ts`, `chord-note-order.ts` (staff and written-position order within a chord), `editing-layout.ts`, `score-editing-layout.ts`
- **Editing keyboard/pointer controller, focus scrolling and selection overlay**: `editing-controller.ts`, `editing-bindings.ts`, `default-editing-bindings.ts`, `editing-view.ts`, `selection-overlay.ts`; default composition in `score.ts`
- **Rendering an editor-owned mdom document without reparsing**: `render.ts`, `score-parser.ts`, `default-score-parser.ts`, `score-renderer.ts`
- **Score snapshots (`Score.snapshot`, `render(snapshot)`)**: `score-snapshot.ts` (the format and `SNAPSHOT_VERSION`; bump it with any change to what a snapshot holds), `score-recording.ts` (writes one from a full render, recording the fold's strips), `snapshot-reader.ts` (the version/config check before the stage, gaps left out since the snapshot brings its own, and decoding), `snapshot-config.ts` (the config a snapshot records and compares), `snapshot-mismatch-error.ts`, `snapshot-source.ts`, `stored-snapshot.ts`, `paint-encoder.ts` / `paint-decoder.ts` (ops to tables and a number stream, states once by value, bounds from each op's anchor, and back; the decoder hangs outlines on text calls), `snapshot-fingerprint.ts` (what a snapshot paints, hashed, for adoption), `recorded-fold.ts` (a fold replayed from ops), `element-model.ts`, `Sequence.model` / `SequenceFactory.restore`, `score-renderer.ts` (`restore`)
- **Snapshots made with no DOM (`@stringsync/vexml/headless`)**: `headless.ts` (the entry), `create-snapshot.ts`, `score-engraver.ts` (the engrave shared with `render`), `headless-fonts.ts` (font files read and registered, vexml's Bravura), `font-shorthand-patch.ts` and `css-font.ts` (vexflow's DOM font parse, replaced), `detached-viewport.ts`, `inert-decoration.ts`, `text-outliner.ts` (glyph outlines for the snapshot), `outline-fonts.ts` (CSS face matching and layout), `outline-face.ts` (a fontkit face), `text-outline.ts` (an outlined text, filled at replay), `glyph-outline.ts` (one glyph's path), `element.ts` (`stampGlyph` restamps a note from its outline), `score-renderer.ts` (no font wait for an outlined snapshot)
- **Painting a snapshot before the app (`@stringsync/vexml/paint`) and render adopting it**: `paint.ts` (the entry; keep its imports free of mdom, vexflow and layout), `snapshot-painter.ts`, `painted-score.ts`, `score-box.ts` (container styles, base, strut and stylesheet, shared with `stage.ts`; the paint mark and key), `tiled-surface.ts` (`adopt`), `stage.ts` (`engrave` adopts when the key matches)
- **Ink colors chosen at paint time**: `ink.ts` (the roles recorded in place of colors), `draw-pass.ts`, `system-formatter.ts` (ledger lines), `paint-replayer.ts` (resolves them), `render.ts` (from config.fonts colors)
- **What a caller gets from a hit test**: `element.ts`, `toggle.ts` (the `color`/`halo` switches), `element-index.ts`, `note.ts`, `measure.ts`, `measure-box.ts`, `voice.ts`, `part.ts`, `system.ts`
- **A note's boxes: `Note.rect` (the head alone) and `getInkRect` (head plus accidentals, arpeggio, dots, flag, graces)**: `geometry-collector.ts` (`inkOf`), `note.ts`
- **Pointer position to element**: `hit-tester.ts`, `default-hit-tester.ts`, `element-index.ts`
- **Coloring, highlighting, halos**: `decoration.ts`, `default-decoration.ts`, `default-decorations.ts`, `decoration-style.ts`, `color-style.ts`, `halo-style.ts`
- **Playback timeline, repeats unrolled, swing**: `sequence-factory.ts`, `sequence-placer.ts`, `sequence.ts`, `measure-sequence-iterator.ts` (repeat/volta expansion, D.C./D.S./Fine/To Coda from `<sound>` attributes), `tempo-map.ts`, `swing-warp.ts`
- **Playback timing without rendering (`readTimeline`: bars per pass, duration, gaps)**: `read-timeline.ts`, `timeline.ts`, `sequence-factory.ts` (`timeline`, and `unroll`, the pass walk it shares with the rendered sequence)
- **Progressive rendering (`progressive`: the first screen before `render` resolves, the rest in idle slices)**: `progressive-engraving.ts` (the slices, `draw`/`complete` events, drawing through a measure, drawing all before a snapshot), `drawing.ts` (the seam `Score` and `CursorController` see), `complete-drawing.ts` (a score drawn whole), `provisional-geometry.ts` (the layout's forecast of every system's geometry, so the model and timeline are complete before the draw), `element-placer.ts` (elements moved into place as their system lands), `element.ts` (`relocate`), `note.ts` / `tab-position.ts` (`drawn`), `sequence-placer.ts` (the timeline placed again on each drawn system), `sequence.ts` (`adoptGeometry`), `progressive-recording.ts` (the snapshot source), `idle-scheduler.ts` / `browser-idle-scheduler.ts` (`requestIdleCallback`, else a timeout), `stage.ts` (`extendEngraving`, `visibleBottom`), `score-renderer.ts` (the branch), `score-engraver.ts` (`beginProgressive`)
- **The moving cursor and playhead visibility**: `cursor-controller.ts`, `cursor-position.ts` (the box a cursor event reports), `cursor-view.ts`, `playhead.ts` (a DOM `marker.ts`/`managed-marker.ts`, not a canvas), `cursor-host.ts`, `cursor-host-adapter.ts`
- **Scrolling and the visible window**: `scroller.ts`, `scroll-controller.ts`, `viewport.ts`
- **The DOM the score lives in (container, canvas, overlays, a caller-owned `scrollContainer`)**: `host.ts`, `stage.ts`, `score-box.ts` (the container's styles, scale-to-fit: the `.vexml-fit` rule and the strut canvas that lets the box shrink in a grid or shrink-to-fit parent), `layer.ts`, `tiled-layer.ts` (content and background layers), `managed-layer.ts` (viewport layers; bitmap axis and area caps), `lazy-layer.ts`, `marker.ts`, `managed-marker.ts` (caller markers from `Score.createMarker` too), `loupe.ts`, `managed-loupe.ts` (the magnifier, a top-layer popover; `Stage.paintScore` draws into it over `Stage.paperColor`), `loupe-placement.ts` (above its anchor, else to its right, else left, within the visual viewport), `recording-context.ts`, `layer-host.ts`, `scroll-host.ts`

## Editing implementation contracts

Public integration guidance lives in [`skills/vexml/SKILL.md`](../../skills/vexml/SKILL.md#editing).
Keep the session tied to document notes: rendered wrappers and geometry belong to
one `Score` and must be resolved again after rendering.

- `editing-session.ts` owns focus, active voice and range/set selection; mdom owns history.
  The session subscribes to native history and must be disposed separately from its controllers;
  it installs no DOM listeners. Ranges keep a fixed anchor and reject cross-part
  or cross-voice selection before mutation. Explicit sets use the last distinct
  note as focus and anchor. Getters return snapshots; detached notes disappear
  from selection, and selecting detached or foreign notes throws.
- `pitch-edit.ts` is a conservative pitch command, preserving note identity and unrelated
  notation. A changed pitch removes the explicit accidental. The session runs it
  inside `document.history.edit`; mdom owns rollback and reversal. Once a session
  enables history, all document mutations use native mdom transactions. No-ops
  preserve redo. Forward `documentchange` for native committed edits, undo and redo.
  Selection does not create history. Detached focus becomes null; retained node
  references resolve again after undo. The caller owns document history disposal.
- `editing-navigator.ts` follows written order without expanding repeats and skips
  empty measures. `chord-note-order.ts` sorts by staff, then written diatonic
  position (display position for unpitched notes), ignoring accidentals and keeping
  document order for ties. Vertical moves exhaust chord members before changing
  voices, entering at the top when descending and bottom when ascending.
  `ScoreEditingLayout` permits voice navigation across systems; without a layout,
  voice navigation clamps at document edges. Cross-voice range extension is a no-op.
- `score.ts` composes and owns its controllers; early controller disposal unregisters
  it. The controller owns its view and listeners, never the session. Only handle
  keyboard events targeted at the container, preserving nested controls. Restore
  any tabindex added by the controller on disposal. Selection changes update the
  presentation without engraving; focus changes drive scrolling, with measure-box
  fallback for unindexed notes. Manual scrolling does not trigger focus following.
- `selection-overlay.ts` puts cursor halos and per-system regions behind engraving,
  with selection coloring and the cursor outline above hover. Preserve playback
  and hover decoration state. During marquee dragging, publish preview notes and
  score-space `presentation.marquee` without changing the session until release.
  Deduplicate notehead/fret hits and require full enclosure. Escape, cancellation,
  suspension, disposal or capture loss with the primary button held cancels;
  capture loss after release commits even before `pointerup`. Dragging does not
  trigger focus following. Unindexed notes remain reachable through navigation.
- Document rendering must not reparse or edit the session's document. Its gaps must
  name measures already in it (`insertGaps`, run by the caller inside a history edit);
  `render.ts` rejects positioned gaps for document input before touching the container.

## Conventions

- One concept per file, named after the class it exports. Every file sits
  flat in the package root, with no subdirectories. An interface and its implementations are
  siblings (`font-loader.ts`, `default-font-loader.ts`, `noop-font-loader.ts`),
  fakes included.
- The draw pass owns no shared blackboard: `draw-pass.ts` constructs each
  collaborator per pass and snapshots per-column data into it.
- Rendering is verified by screenshot: `vex test` diffs every fixture. A
  refactor that changes no pixels should report "no screenshot changes"; any
  change that does is a deliberate decision.
