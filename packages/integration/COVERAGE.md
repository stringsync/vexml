# MusicXML 4.0 coverage

What vexml does with each element of the MusicXML 4.0 schema
(`packages/vex/xmllint/schema/musicxml.xsd`), and with the attributes that
change what is drawn. `vex coverage` writes this file: it adds a `missing`
row for each element the schema has and the table lacks, and keeps every
status and note already here, so edit those by hand. `vex test` fails while
the table is out of step with the schema, or a `drawn` row names a fixture
in `__data__` that does not use what the row is about.

- **drawn**: vexml draws it, and the named fixtures show it.
- **ignored**: on purpose, as sound or metadata nothing displays.
- **missing**: on the page, but vexml does not draw it yet.

An attribute row reads `element@attribute`, or `*@attribute` for one shared
by many elements. Element rows are one per schema element; attribute rows
are picked by hand.

Elements: 233 drawn, 69 ignored, 140 missing; vexml draws 233 of the 373 that show on the page (62%).
Attributes: 53 drawn, 5 ignored, 57 missing.

| Element | Status | Proof or reason |
| --- | --- | --- |
| `*@color` | drawn | `note_color.musicxml`: note, notehead and stem colors; other elements' color ignored |
| `*@dash-length` | missing | task #17; mdom raw only |
| `*@default-x` | missing | task #20 (later task in that lane); mdom raw only |
| `*@default-y` | missing | task #20 (later task in that lane); mdom raw only |
| `*@enclosure` | missing | task #28; rehearsal always boxed, words and dynamics never; mdom typed (rehearsal only) |
| `*@font-family` | missing | task #28; text face from the document ignored; mdom raw only |
| `*@font-size` | missing | task #28; text size from the document ignored; mdom raw only |
| `*@font-style` | missing | task #28; words always print italic; mdom typed (words only) |
| `*@font-weight` | missing | task #28; words weight ignored; mdom typed (words only) |
| `*@halign` | missing | task #28; horizontal text alignment ignored; mdom raw only |
| `*@justify` | missing | task #28; text justification ignored; mdom raw only |
| `*@line-type` | drawn | `slur_line_types.musicxml`, `direction_lines.musicxml`: slurs and brackets; ties, wedges, slides task #17 |
| `*@placement` | drawn | `direction_lines.musicxml`, `note_color.musicxml`: directions, slurs, tuplets, technical; ornaments ignore it |
| `*@print-object` | drawn | `invisible_notes.musicxml`: notes; `print_object.musicxml`: notations, ending and staff-details; clef, key, time, lyric and part-name ignore it |
| `*@relative-x` | missing | task #20 (later task in that lane); mdom raw only |
| `*@relative-y` | missing | task #20 (later task in that lane); mdom raw only |
| `*@rotation` | missing | task #28; rotated text not drawn; mdom raw only |
| `*@space-length` | missing | task #17; mdom raw only |
| `*@underline` | missing | task #28; underlined text not drawn; mdom raw only |
| `*@valign` | missing | task #28; vertical text alignment ignored; mdom raw only |
| `accent` | drawn | `articulations.musicxml` |
| `accidental` | drawn | `accidentals.musicxml`: every value, arrow, triple, Turkish and Persian forms included, and `other` by its `@smufl` name; cautionary and editorial forms too |
| `accidental@bracket` | drawn | `accidentals.musicxml`: bracketed sharp and flat |
| `accidental@cautionary` | drawn | `accidentals.musicxml`: parenthesized accidental |
| `accidental@editorial` | drawn | `accidentals.musicxml`: bracketed accidental |
| `accidental@parentheses` | drawn | `accidentals.musicxml`: parenthesized sharp and flat |
| `accidental@size` | missing | task #9; mdom raw only |
| `accidental@smufl` | drawn | `accidentals.musicxml` M12: `other` drawn by its SMuFL glyph name |
| `accidental-mark` | drawn | `ornaments.musicxml`: small accidental on the ornament it follows |
| `accidental-text` | missing | task #11; mdom raw only |
| `accord` | missing | task #16; mdom raw only |
| `accordion-high` | missing | task #16; mdom raw only |
| `accordion-low` | missing | task #16; mdom raw only |
| `accordion-middle` | missing | task #16; mdom raw only |
| `accordion-registration` | missing | task #16; mdom raw only |
| `actual-notes` | drawn | `tuplet_triplet.musicxml`: tuplet ratio via timeModification |
| `alter` | drawn | `accidentals.musicxml`: pitch alter read for note pitch; printed glyph comes from accidental |
| `appearance` | missing | task #36; line widths, note sizes and distances from defaults not applied; mdom raw only |
| `arpeggiate` | drawn | `arpeggio.musicxml` |
| `arpeggiate@direction` | drawn | `arpeggio.musicxml`: up and down arrowheads |
| `arpeggiate@unbroken` | missing | task #38; unbroken arpeggio across staves not drawn; mdom raw only |
| `arrow` | drawn | `technical_marks.musicxml`: single, filled and hollow arrows in the eight compass directions |
| `arrow-direction` | drawn | `technical_marks.musicxml`: the two-headed directions draw nothing, no SMuFL glyph |
| `arrow-style` | drawn | `technical_marks.musicxml`: double, paired and combined draw as single |
| `arrowhead` | drawn | `technical_marks.musicxml` |
| `articulations` | drawn | `articulations.musicxml`, `articulations_extended.musicxml` |
| `artificial` | missing | task #30; drawn as a natural harmonic: the stopped note should keep a normal head under the diamond; mdom raw only |
| `assess` | ignored | listening/assessment only |
| `attributes` | drawn | `key.musicxml`, `time.musicxml`: clef, key, time, divisions |
| `backup` | drawn | `two_voices.musicxml`: onsets via mdom timeline |
| `bar-style` | drawn | `barline_styles.musicxml` |
| `barline` | drawn | `barline_styles.musicxml`, `repeats.musicxml` |
| `barline@location` | drawn | `barline_mid_measure.musicxml`, `barline_styles.musicxml`: left, right and middle barlines |
| `barre` | drawn | `chord_diagram.musicxml`: barre across the fret box |
| `base-pitch` | missing | task #30; base-pitch note should keep a normal head, vexml draws every harmonic as a diamond; mdom raw only |
| `bass` | drawn | `harmony.musicxml`: slash chord bass |
| `bass-alter` | drawn | `harmony.musicxml` |
| `bass-separator` | missing | task #26; custom separator text between chord and bass (vexml always prints /); mdom raw only |
| `bass-step` | drawn | `harmony.musicxml` |
| `beam` | drawn | `beam_variations.musicxml` |
| `beam@fan` | missing | task #35; feathered beams not drawn; mdom raw only |
| `beam@repeater` | missing | task #35; repeater beams not drawn; mdom raw only |
| `beat-repeat` | missing | task #10; mdom raw only |
| `beat-type` | drawn | `time.musicxml` |
| `beat-unit` | drawn | `tempo.musicxml`: metronome mark note value |
| `beat-unit-dot` | drawn | `tempo_beat_unit_dot.musicxml` |
| `beat-unit-tied` | missing | task #33; tied note values in a metronome mark; mdom raw only |
| `beater` | missing | task #16; mdom raw only |
| `beats` | drawn | `time.musicxml` |
| `bend` | drawn | `tab_bend.musicxml` |
| `bend@shape` | missing | task #34; angled vs curved bend ignored; mdom raw only |
| `bend-alter` | drawn | `tab_bend.musicxml`: bend amount label |
| `bookmark` | ignored | metadata |
| `bottom-margin` | missing | task #20; mdom raw only |
| `bracket` | drawn | `direction_lines.musicxml` |
| `bracket@line-end` | drawn | `direction_lines.musicxml`: hooked bracket ends |
| `brass-bend` | drawn | `technical_marks.musicxml` |
| `breath-mark` | drawn | `articulations_extended.musicxml` |
| `caesura` | drawn | `articulations_extended.musicxml` |
| `cancel` | missing | task #38; naturals drawn on every key change, but cancel fifths/location not read; mdom raw only |
| `capo` | missing | task #38; capo fret label for guitar/tab parts; mdom typed |
| `chord` | drawn | `chord.musicxml` |
| `chromatic` | ignored | sound only (transposition; written pitch is drawn) |
| `circular-arrow` | missing | no SMuFL glyph to draw it with; mdom raw only |
| `clef` | drawn | `clef_treble.musicxml`, `clef_c.musicxml` |
| `clef@additional` | missing | task #38; additional (cautionary) clef form ignored; mdom raw only |
| `clef@after-barline` | missing | task #19; mdom raw only |
| `clef@size` | missing | task #38; cue or large clef size ignored; mdom raw only |
| `clef-octave-change` | drawn | `clef_treble_octave.musicxml`: the 8 above or below the clef |
| `coda` | drawn | `navigation.musicxml` |
| `concert-score` | ignored | metadata: marks written pitch as concert pitch, nothing to draw |
| `creator` | missing | task #8; mdom raw only |
| `credit` | missing | task #8; mdom raw only |
| `credit-image` | missing | task #8; mdom raw only |
| `credit-symbol` | missing | task #8; mdom raw only |
| `credit-type` | missing | task #8; mdom raw only |
| `credit-words` | missing | task #8; mdom raw only |
| `cue` | drawn | `cue_notes.musicxml`: cue-size note, silent in playback |
| `damp` | missing | task #15; mdom raw only |
| `damp-all` | missing | task #15; mdom raw only |
| `dashes` | drawn | `direction_lines.musicxml` |
| `defaults` | missing | task #20; mdom typed |
| `degree` | missing | task #26; chord-symbol degree alterations (add9, b5) not appended; mdom raw only |
| `degree-alter` | missing | task #26; chord-symbol degree alterations (add9, b5) not appended; mdom raw only |
| `degree-type` | missing | task #26; chord-symbol degree alterations (add9, b5) not appended; mdom raw only |
| `degree-value` | missing | task #26; chord-symbol degree alterations (add9, b5) not appended; mdom raw only |
| `delayed-inverted-turn` | drawn | `ornaments.musicxml`: the turn glyph delayed, plain and slashed |
| `delayed-turn` | drawn | `ornaments.musicxml` |
| `detached-legato` | drawn | `articulations_extended.musicxml` |
| `diatonic` | ignored | sound only (transposition; written pitch is drawn) |
| `direction` | drawn | `words.musicxml`, `dynamics.musicxml` |
| `direction@directive` | missing | task #38; directive alignment with the time signature ignored; mdom raw only |
| `direction-type` | drawn | `words.musicxml`, `dynamics.musicxml` |
| `directive` | missing | task #38; attributes directive text printed above the staff; mdom raw only |
| `display-octave` | drawn | `rest_pitched.musicxml`, `percussion_display_step.musicxml` |
| `display-step` | drawn | `rest_pitched.musicxml`, `percussion_display_step.musicxml` |
| `display-text` | missing | task #11; mdom raw only |
| `distance` | missing | task #36; appearance distances (beam, hyphen spacing) not applied; mdom raw only |
| `divisions` | drawn | `divisions_change.musicxml` |
| `doit` | drawn | `articulations_extended.musicxml` |
| `dot` | drawn | `dotted_notes.musicxml` |
| `double` | ignored | sound only (octave doubling in transpose) |
| `double-tongue` | drawn | `technical_marks.musicxml` |
| `down-bow` | drawn | `technical_marks.musicxml` |
| `duration` | drawn | `note.musicxml` |
| `dynamics` | drawn | `dynamics.musicxml` |
| `effect` | missing | task #16; mdom raw only |
| `elevation` | ignored | sound only |
| `elision` | drawn | `lyrics_elision.musicxml` |
| `encoder` | ignored | metadata |
| `encoding` | ignored | metadata |
| `encoding-date` | ignored | metadata |
| `encoding-description` | ignored | metadata |
| `end-line` | ignored | a verse sits on one baseline per system; nothing to break |
| `end-paragraph` | ignored | a verse sits on one baseline per system; nothing to break |
| `ending` | drawn | `repeats.musicxml`: volta brackets |
| `ending@end-length` | missing | task #38; volta hook length fixed; mdom raw only |
| `ending@number` | drawn | `repeats.musicxml`: volta labels |
| `ending@print-object` | drawn | `print_object.musicxml` M5-6; a hidden bracket still plays its jumps |
| `ending@text-x` | missing | task #38; volta label offset ignored; mdom raw only |
| `ending@type` | drawn | `repeats.musicxml`: start and stop hooks; a discontinue close leaves the right end open |
| `ensemble` | ignored | sound only (instrument definition) |
| `except-voice` | missing | task #10; mdom raw only |
| `extend` | drawn | `lyrics_melisma.musicxml`: lyric melisma line (figured-bass extend not drawn) |
| `eyeglasses` | missing | task #15; mdom raw only |
| `f` | drawn | `dynamics.musicxml` |
| `falloff` | drawn | `articulations_extended.musicxml` |
| `feature` | ignored | analysis metadata |
| `fermata` | drawn | `fermata.musicxml`: every shape (normal, angled, square, double-angled, double-square, double-dot, half-curve, curlew) above and below; M7-M8 a `<barline>` fermata centered over (or, inverted, under) its bar line |
| `fermata@type` | drawn | `fermata.musicxml`: inverted fermata drawn below |
| `ff` | drawn | `dynamics.musicxml` |
| `fff` | drawn | `dynamics.musicxml` |
| `ffff` | drawn | `dynamics.musicxml` |
| `fffff` | drawn | `dynamics.musicxml` |
| `ffffff` | drawn | `dynamics.musicxml` |
| `fifths` | drawn | `key.musicxml` |
| `figure` | drawn | `figured_bass.musicxml` |
| `figure-number` | drawn | `figured_bass.musicxml` |
| `figured-bass` | drawn | `figured_bass.musicxml` |
| `fingering` | drawn | `fingering.musicxml` |
| `fingernails` | drawn | `technical_marks.musicxml` |
| `first` | drawn | `swing.musicxml`: swing ratio times playback |
| `first-fret` | drawn | `chord_diagram.musicxml` |
| `flip` | drawn | `technical_marks.musicxml` |
| `footnote` | missing | task #38; footnote text attached to a notation element; mdom raw only |
| `for-part` | ignored | part extraction data, not shown in the score |
| `forward` | drawn | `two_voices.musicxml`: onsets via mdom timeline |
| `fp` | drawn | `dynamics.musicxml` |
| `frame` | drawn | `chord_diagram.musicxml` |
| `frame@unplayed` | missing | task #26; unplayed string text not drawn; mdom raw only |
| `frame-frets` | missing | task #26; fret-row count not read, box height derived from played frets; mdom typed |
| `frame-note` | drawn | `chord_diagram.musicxml` |
| `frame-strings` | drawn | `chord_diagram.musicxml` |
| `fret` | drawn | `tab_chord.musicxml`, `chord_diagram.musicxml` |
| `function` | missing | task #32; Roman-numeral harmony function text; mdom raw only |
| `fz` | drawn | `dynamics.musicxml` |
| `glass` | missing | task #16; mdom raw only |
| `glissando` | drawn | `glissando.musicxml`: a straight line between the noteheads, across a barline, or a tick into a lone stop |
| `glissando@line-type` | missing | task #17; mdom typed |
| `glyph` | missing | task #36; appearance SMuFL glyph overrides not applied; mdom raw only |
| `golpe` | missing | task #29; golpe (flamenco tap) glyph on the note; mdom typed |
| `grace` | drawn | `grace_notes.musicxml` |
| `grace@make-time` | drawn | `grace_notes.musicxml`: timed, grace adds its own time |
| `grace@slash` | drawn | `grace_notes.musicxml`: slashed acciaccatura |
| `grace@steal-time-previous` | drawn | `grace_notes.musicxml`: timed, grace plays before the beat |
| `group` | ignored | metadata (score vs parts version of a part) |
| `group-abbreviation` | drawn | `structure_part_abbreviations.musicxml`: group abbreviation on later systems |
| `group-abbreviation-display` | drawn | `structure_part_abbreviations.musicxml`: display-text runs override it |
| `group-barline` | drawn | `structure_part_groups.musicxml`: barlines joined or broken across the group |
| `group-link` | ignored | file links |
| `group-name` | drawn | `structure_part_group_symbols.musicxml` |
| `group-name-display` | drawn | `structure_part_abbreviations.musicxml`: display-text runs override the name |
| `group-symbol` | drawn | `structure_part_group_symbols.musicxml` |
| `group-time` | missing | task #38; one large time signature spanning a group's staves; mdom raw only |
| `grouping` | ignored | analysis metadata |
| `half-muted` | drawn | `technical_marks.musicxml` |
| `hammer-on` | drawn | `tab_hammer_pull.musicxml`: H arc between notes |
| `hammer-on@type` | drawn | `tab_hammer_pull.musicxml`: start/stop arcs |
| `handbell` | drawn | `technical_marks.musicxml` |
| `harmon-closed` | drawn | `technical_marks.musicxml`: closed, open, and half filled on the side location names |
| `harmon-mute` | drawn | `technical_marks.musicxml` |
| `harmonic` | drawn | `harmonic.musicxml`, `tab_harmonic.musicxml`: diamond notehead, angle-bracketed fret |
| `harmony` | drawn | `harmony.musicxml`: chord symbol text above the stave |
| `harmony@print-frame` | missing | task #26; frame drawn even when print-frame is no; mdom raw only |
| `harp-pedals` | missing | task #14; mdom raw only |
| `haydn` | missing | task #29; haydn ornament glyph above the note; mdom typed |
| `heel` | drawn | `technical_marks.musicxml` |
| `hole` | drawn | `technical_marks.musicxml` |
| `hole-closed` | drawn | `technical_marks.musicxml`: closed, open and half; half ignores location |
| `hole-shape` | missing | every hole draws as a circle; mdom raw only |
| `hole-type` | missing | the hole label ("thumb") is not printed; mdom raw only |
| `humming` | drawn | `lyrics_sounds.musicxml`: text-less lyric draws "mm" |
| `identification` | missing | task #8 (creator, rights); mdom raw only |
| `image` | missing | task #15; mdom raw only |
| `instrument` | ignored | playback instrument link |
| `instrument-abbreviation` | ignored | playback instrument metadata, part-abbreviation is the printed label |
| `instrument-change` | ignored | sound only |
| `instrument-link` | ignored | file links |
| `instrument-name` | ignored | playback instrument metadata, part-name is the printed label |
| `instrument-sound` | ignored | sound only |
| `instruments` | ignored | metadata (instrument count) |
| `interchangeable` | missing | task #18; mdom raw only |
| `inversion` | missing | task #26; chord inversion in the harmony symbol; mdom raw only |
| `inverted-mordent` | drawn | `ornaments.musicxml` |
| `inverted-turn` | drawn | `ornaments.musicxml` |
| `inverted-turn@slash` | drawn | `ornaments.musicxml` |
| `inverted-vertical-turn` | missing | task #29; inverted vertical turn ornament glyph; mdom typed |
| `ipa` | ignored | pronunciation for synthesis |
| `key` | drawn | `key.musicxml` |
| `key@number` | drawn | `staves_different_keys.musicxml`: a key per staff |
| `key-accidental` | drawn | `key_non_traditional.musicxml`: quarter-sharp, quarter-flat and slash-flat key signature glyphs |
| `key-alter` | drawn | `key_non_traditional.musicxml` |
| `key-octave` | drawn | `key_non_traditional.musicxml` |
| `key-step` | drawn | `key_non_traditional.musicxml` |
| `kind` | drawn | `harmony_kinds.musicxml`: chord symbol suffix |
| `laughing` | drawn | `lyrics_sounds.musicxml`: text-less lyric draws "ha ha" |
| `left-divider` | missing | task #20; mdom raw only |
| `left-margin` | missing | task #20; mdom typed |
| `level` | missing | task #38; editorial level marks (parenthesized or bracketed additions); mdom raw only |
| `line` | drawn | `clef_c.musicxml`: clef staff line |
| `line-detail` | missing | task #19; mdom typed |
| `line-width` | missing | task #36; engraving line thicknesses from defaults appearance; mdom raw only |
| `link` | ignored | file links |
| `listen` | ignored | interactive performance only |
| `listening` | ignored | interactive performance only |
| `lyric` | drawn | `lyrics.musicxml` |
| `lyric@justify` | missing | task #38; syllable justification ignored; mdom raw only |
| `lyric@number` | drawn | `lyrics.musicxml`, `lyrics_two_voices.musicxml`: verse order sets the row |
| `lyric-font` | missing | task #28; lyric typeface and size from defaults; mdom raw only |
| `lyric-language` | ignored | metadata |
| `measure` | drawn | `measures_two.musicxml` |
| `measure@implicit` | drawn | `pickup_measure.musicxml`: pickup sized to its content |
| `measure@width` | missing | task #20; mdom raw only |
| `measure-distance` | missing | task #20; mdom raw only |
| `measure-layout` | missing | task #20; mdom raw only |
| `measure-numbering` | missing | task #38; honor the score's measure-numbering choice (config decides now); mdom raw only |
| `measure-numbering@system` | missing | task #38; document numbering per system ignored, config decides; mdom raw only |
| `measure-repeat` | missing | task #10; mdom raw only |
| `measure-style` | drawn | `rest_multi_measure.musicxml`: multiple-rest child |
| `membrane` | missing | task #16; mdom raw only |
| `metal` | missing | task #16; mdom raw only |
| `metronome` | drawn | `tempo.musicxml` |
| `metronome@justify` | missing | task #33; metronome justification ignored; mdom raw only |
| `metronome@parentheses` | drawn | `tempo_beat_unit_dot.musicxml`: parenthesized tempo mark |
| `metronome-arrows` | missing | task #33; arrows in a metric modulation mark; mdom raw only |
| `metronome-beam` | drawn | `tempo_beat_unit_dot.musicxml`: beamed note group in the modulation mark |
| `metronome-dot` | drawn | `tempo_beat_unit_dot.musicxml`: dots after each metronome-note glyph |
| `metronome-note` | drawn | `tempo_beat_unit_dot.musicxml` |
| `metronome-relation` | drawn | `tempo_beat_unit_dot.musicxml` |
| `metronome-tied` | missing | task #33; tie between metronome-note glyphs; mdom raw only |
| `metronome-tuplet` | drawn | `tempo_beat_unit_dot.musicxml` |
| `metronome-type` | drawn | `tempo_beat_unit_dot.musicxml` |
| `mf` | drawn | `dynamics.musicxml` |
| `midi-bank` | ignored | sound only |
| `midi-channel` | ignored | sound only |
| `midi-device` | ignored | sound only |
| `midi-instrument` | ignored | sound only |
| `midi-name` | ignored | sound only |
| `midi-program` | ignored | sound only |
| `midi-unpitched` | ignored | sound only |
| `millimeters` | missing | task #20; mdom typed |
| `miscellaneous` | ignored | metadata |
| `miscellaneous-field` | ignored | metadata |
| `mode` | drawn | `key_modes.musicxml`: read for the key, signature from fifths |
| `mordent` | drawn | `ornaments.musicxml` |
| `mordent@approach` | missing | task #29; mordent approach hook not drawn; mdom raw only |
| `mordent@departure` | missing | task #29; mordent departure hook not drawn; mdom raw only |
| `mordent@long` | missing | task #29; long mordent glyph not drawn; mdom raw only |
| `movement-number` | missing | task #8; mdom raw only |
| `movement-title` | missing | task #8; mdom typed |
| `mp` | drawn | `dynamics.musicxml` |
| `multiple-rest` | drawn | `rest_multi_measure.musicxml` |
| `multiple-rest@use-symbols` | missing | task #38; old-style rest symbols not drawn; mdom raw only |
| `music-font` | missing | task #28; notation typeface and size from defaults; mdom raw only |
| `mute` | ignored | sound only |
| `n` | drawn | `dynamics.musicxml` |
| `natural` | drawn | `harmonic.musicxml`: drawn as the default harmonic, artificial not told apart |
| `non-arpeggiate` | drawn | `non_arpeggiate.musicxml` |
| `non-arpeggiate@type` | drawn | `non_arpeggiate.musicxml`: bracket from bottom to top member |
| `normal-dot` | missing | task #31; tuplet show-type note-value glyphs; mdom raw only |
| `normal-notes` | drawn | `tuplet_triplet.musicxml`: tuplet ratio from time-modification |
| `normal-type` | missing | task #31; tuplet show-type note-value glyphs; mdom raw only |
| `notations` | drawn | `articulations.musicxml` |
| `notations@print-object` | drawn | `print_object.musicxml` M4; hides every mark in the group, slurs and tuplets excepted |
| `note` | drawn | `note.musicxml` |
| `note@dynamics` | ignored | playback velocity only |
| `note@pizzicato` | ignored | playback only |
| `note@print-dot` | drawn | `print_object.musicxml` M1 |
| `note@print-leger` | drawn | `print_object.musicxml` M2 |
| `note@print-lyric` | drawn | `print_object.musicxml` M3 |
| `note@print-spacing` | missing | task #27; hidden notes always keep their space; mdom raw only |
| `note-size` | missing | task #9; mdom raw only |
| `notehead` | drawn | `notehead_shapes.musicxml` |
| `notehead@filled` | drawn | `notehead_shapes_extended.musicxml`: filled and open shape variants |
| `notehead@parentheses` | drawn | `notehead_parentheses.musicxml`: per-member parenthesized noteheads |
| `notehead-text` | missing | task #11; mdom raw only |
| `numeral` | missing | task #32; roman numeral harmony analysis; mdom raw only |
| `numeral-alter` | missing | task #32; roman numeral harmony analysis; mdom raw only |
| `numeral-fifths` | missing | task #32; roman numeral harmony analysis key context; mdom raw only |
| `numeral-key` | missing | task #32; roman numeral harmony analysis key context; mdom raw only |
| `numeral-mode` | missing | task #32; roman numeral harmony analysis key context; mdom raw only |
| `numeral-root` | missing | task #32; roman numeral harmony analysis; mdom raw only |
| `octave` | drawn | `note.musicxml` |
| `octave-change` | ignored | sound only: transposition, written pitch is drawn |
| `octave-shift` | drawn | `octave_shift.musicxml` |
| `octave-shift@size` | drawn | `octave_shift.musicxml`: 8va and 15ma |
| `offset` | missing | task #38; shift a direction or harmony off its note by divisions; mdom raw only |
| `open` | missing | task #29; open technical mark (circle) for brass and harp; mdom raw only |
| `open-string` | drawn | `technical_marks.musicxml` |
| `opus` | missing | task #8; mdom raw only |
| `ornaments` | drawn | `ornaments.musicxml` |
| `other-appearance` | missing | task #36; custom engraving appearance from defaults; mdom raw only |
| `other-articulation` | missing | task #29; free-form SMuFL or text articulation; mdom raw only |
| `other-direction` | missing | task #29; free-form SMuFL or text direction; mdom raw only |
| `other-dynamics` | drawn | `dynamics.musicxml`: italic text |
| `other-listen` | ignored | interactive performance only |
| `other-listening` | ignored | interactive performance only |
| `other-notation` | missing | task #29; free-form SMuFL notation mark; mdom raw only |
| `other-ornament` | missing | task #29; free-form SMuFL ornament; mdom typed |
| `other-percussion` | missing | task #16; mdom raw only |
| `other-play` | ignored | sound only |
| `other-technical` | drawn | `tab_annotation.musicxml`: text annotation on tab |
| `p` | drawn | `dynamics.musicxml` |
| `page-height` | missing | task #20; mdom raw only |
| `page-layout` | missing | task #20; mdom raw only |
| `page-margins` | missing | task #20; mdom raw only |
| `page-width` | missing | task #20; mdom raw only |
| `pan` | ignored | sound only |
| `part` | drawn | `structure_two_parts.musicxml` |
| `part-abbreviation` | drawn | `structure_part_abbreviations.musicxml`: short part label on systems after the first |
| `part-abbreviation-display` | drawn | `structure_part_abbreviations.musicxml`: display-text and accidental-text runs override it |
| `part-clef` | ignored | for-part: applies to extracted transposed parts only |
| `part-group` | drawn | `structure_part_groups.musicxml` |
| `part-group@type` | drawn | `structure_part_group_bracket_top.musicxml`: group bracket start/stop |
| `part-link` | ignored | file links |
| `part-list` | drawn | `structure_two_parts.musicxml` |
| `part-name` | drawn | `structure_part_labels.musicxml`: printed when showPartLabels is on |
| `part-name@print-object` | drawn | `structure_part_abbreviations.musicxml`: print-object="no" hides the name |
| `part-name-display` | drawn | `structure_part_abbreviations.musicxml`: display-text and accidental-text runs override the name |
| `part-symbol` | drawn | `clef_notation_and_tab_bracket.musicxml` |
| `part-transpose` | ignored | for-part: applies to extracted transposed parts only |
| `pedal` | drawn | `pedal.musicxml` |
| `pedal@abbreviated` | missing | task #38; abbreviated pedal sign not drawn; mdom raw only |
| `pedal@line` | drawn | `pedal.musicxml`: bracket line vs Ped. text |
| `pedal@sign` | missing | task #38; line plus sign (mixed) form not drawn; mdom raw only |
| `pedal@type` | drawn | `pedal.musicxml`: start/stop only; change, continue, sostenuto, discontinue ignored |
| `pedal-alter` | missing | task #14; mdom raw only |
| `pedal-step` | missing | task #14; mdom raw only |
| `pedal-tuning` | missing | task #14; mdom raw only |
| `per-minute` | drawn | `tempo.musicxml` |
| `percussion` | missing | task #16; mdom raw only |
| `pf` | drawn | `dynamics.musicxml` |
| `pitch` | drawn | `note.musicxml` |
| `pitched` | missing | task #16; mdom raw only |
| `play` | ignored | sound only |
| `player` | ignored | metadata: player assignment |
| `player-name` | ignored | metadata: player assignment |
| `plop` | drawn | `articulations_extended.musicxml`: brass plop glyph left of the notehead |
| `pluck` | drawn | `technical_marks.musicxml`: drawn as a fingering-style label |
| `pp` | drawn | `dynamics.musicxml` |
| `ppp` | drawn | `dynamics.musicxml` |
| `pppp` | drawn | `dynamics.musicxml` |
| `ppppp` | drawn | `dynamics.musicxml` |
| `pppppp` | drawn | `dynamics.musicxml` |
| `pre-bend` | missing | task #34; pre-bend arrow on a tab bend (bend getter reads only bend-alter and release); mdom raw only |
| `prefix` | drawn | `figured_bass.musicxml` |
| `principal-voice` | missing | task #15; mdom raw only |
| `print` | drawn | `print_new_system.musicxml`: new-system and new-page breaks honored |
| `print@blank-page` | missing | task #38; blank pages not inserted; mdom raw only |
| `print@new-page` | missing | task #20; only a system break, no page break in paged layout; mdom typed |
| `print@new-system` | drawn | `print_new_system.musicxml`: forced system break |
| `pull-off` | drawn | `tab_hammer_pull.musicxml` |
| `rehearsal` | drawn | `rehearsal.musicxml` |
| `relation` | ignored | metadata |
| `release` | drawn | `tab_bend.musicxml`: bend release arc |
| `repeat` | drawn | `repeats.musicxml` |
| `repeat@after-jump` | missing | task #13; mdom raw only |
| `repeat@direction` | drawn | `repeats_multiple_times.musicxml`, `repeats_notation_and_tab.musicxml`: forward and backward dots |
| `repeat@times` | drawn | `repeats_multiple_times.musicxml`: Nx label and pass count |
| `repeat@winged` | missing | task #38; winged repeat brackets not drawn; mdom raw only |
| `rest` | drawn | `rest.musicxml` |
| `rf` | drawn | `dynamics.musicxml` |
| `rfz` | drawn | `dynamics.musicxml` |
| `right-divider` | missing | task #20; mdom raw only |
| `right-margin` | missing | task #20; mdom typed |
| `rights` | ignored | metadata (a printed copyright comes through credit) |
| `root` | drawn | `harmony.musicxml` |
| `root-alter` | drawn | `harmony.musicxml` |
| `root-step` | drawn | `harmony.musicxml` |
| `scaling` | missing | task #20; mdom typed |
| `schleifer` | drawn | `ornaments.musicxml` |
| `scoop` | drawn | `articulations_extended.musicxml` |
| `scordatura` | missing | task #16; mdom raw only |
| `score-instrument` | ignored | sound only (instrument metadata) |
| `score-part` | drawn | `structure_part_labels.musicxml`: part-list entry, part names as labels |
| `score-partwise` | drawn | `note.musicxml`: document root |
| `score-timewise` | missing | task #37; timewise root, needs converting to partwise before drawing; mdom raw only |
| `second` | drawn | `swing.musicxml`: swing ratio for playback timing |
| `segno` | drawn | `navigation.musicxml` |
| `semi-pitched` | ignored | sound only (child of play) |
| `senza-misura` | drawn | `time_senza_misura.musicxml`: no time signature, measure sized by content |
| `sf` | drawn | `dynamics.musicxml` |
| `sffz` | drawn | `dynamics.musicxml` |
| `sfp` | drawn | `dynamics.musicxml` |
| `sfpp` | drawn | `dynamics.musicxml` |
| `sfz` | drawn | `dynamics.musicxml` |
| `sfzp` | drawn | `dynamics.musicxml` |
| `shake` | drawn | `ornaments.musicxml` |
| `sign` | drawn | `clef_treble.musicxml`, `clef_c.musicxml` |
| `slash` | missing | task #10; mdom raw only |
| `slash-dot` | missing | task #10; mdom raw only |
| `slash-type` | missing | task #10; mdom raw only |
| `slide` | drawn | `slide_in.musicxml`, `tab_slide.musicxml` |
| `slide@line-type` | missing | task #17; mdom typed |
| `slur` | drawn | `slur_default.musicxml` |
| `slur@bezier-x` | missing | task #38; document curve control points ignored; mdom raw only |
| `slur@orientation` | missing | task #17; mdom raw only |
| `smear` | missing | task #29; brass smear technical mark (wavy stroke above the note); mdom typed |
| `snap-pizzicato` | drawn | `technical_marks.musicxml` |
| `soft-accent` | drawn | `soft_accent.musicxml` |
| `software` | ignored | metadata |
| `solo` | ignored | metadata (score-instrument role) |
| `sound` | drawn | `tempo.musicxml`, `swing.musicxml`: tempo and swing read for playback timing |
| `sound@coda` | drawn | `navigation.musicxml`: playback follows it (D.S. al Coda) |
| `sound@dacapo` | ignored | playback follows it (measure-sequence-iterator.ts); no fixture plays it yet |
| `sound@dalsegno` | drawn | `navigation.musicxml`: playback follows it (D.S. al Coda) |
| `sound@dynamics` | ignored | playback velocity only |
| `sound@fine` | ignored | playback follows it (measure-sequence-iterator.ts); no fixture plays it yet |
| `sound@segno` | drawn | `navigation.musicxml`: playback follows it (D.S. al Coda) |
| `sound@tempo` | drawn | `tempo.musicxml`: timed, playback tempo and the tempo mark fallback |
| `sound@tocoda` | drawn | `navigation.musicxml`: playback follows it (D.S. al Coda) |
| `sounding-pitch` | missing | task #30; harmonic drawn as sounding pitch (no diamond); vexml diamonds every harmonic; mdom raw only |
| `source` | ignored | metadata |
| `spiccato` | drawn | `articulations_extended.musicxml` |
| `staccatissimo` | drawn | `articulations.musicxml` |
| `staccato` | drawn | `articulations.musicxml` |
| `staff` | drawn | `voices_grand_staff.musicxml`: assigns notes and directions to staves |
| `staff-details` | drawn | `staff_details_lines.musicxml` |
| `staff-details@print-object` | drawn | `print_object.musicxml` M7; hides the staff lines only, clef and key stay |
| `staff-details@show-frets` | missing | tab frets as letters; mdom showFrets reads a child element, not this attribute, so mdom needs a fix first |
| `staff-distance` | missing | task #20; mdom raw only |
| `staff-divide` | missing | task #15; mdom raw only |
| `staff-layout` | missing | task #20; mdom raw only |
| `staff-lines` | drawn | `staff_details_lines.musicxml` |
| `staff-size` | missing | task #19; mdom typed |
| `staff-tuning` | drawn | `clef_tab_staff_tuning.musicxml`: tuning derives frets and marks the staff as tab |
| `staff-type` | missing | task #38; ossia/cue/editorial/alternate staff styling; mdom raw only |
| `staves` | drawn | `structure_grand_staff.musicxml` |
| `stem` | drawn | `note.musicxml` |
| `stem@default-y` | missing | stem length from stem end y; task #20 lane (default-y); mdom raw only |
| `step` | drawn | `note.musicxml` |
| `stick` | missing | task #16; mdom raw only |
| `stick-location` | missing | task #16; mdom raw only |
| `stick-material` | missing | task #16; mdom raw only |
| `stick-type` | missing | task #16; mdom raw only |
| `stopped` | drawn | `technical_marks.musicxml` |
| `straight` | drawn | `swing.musicxml`: cancels a carried swing in playback timing |
| `stress` | drawn | `articulations_extended.musicxml` |
| `string` | drawn | `string_numbers.musicxml` |
| `string-mute` | missing | task #15; mdom raw only |
| `strong-accent` | drawn | `articulations_extended.musicxml` |
| `suffix` | drawn | `figured_bass.musicxml` |
| `supports` | ignored | metadata |
| `swing` | drawn | `swing.musicxml`: swing applied to playback timing |
| `swing-style` | ignored | sound only (descriptive style name, unread) |
| `swing-type` | drawn | `swing.musicxml`: sets the swung unit (16th) in playback timing |
| `syllabic` | drawn | `lyrics.musicxml` |
| `symbol` | missing | task #15; mdom raw only |
| `sync` | ignored | sound only (listening) |
| `system-distance` | missing | task #20; mdom typed |
| `system-dividers` | missing | task #20; mdom raw only |
| `system-layout` | missing | task #20; mdom typed |
| `system-margins` | missing | task #20; mdom typed |
| `tap` | missing | task #29; tap technical mark (T or + over the note); mdom typed |
| `technical` | drawn | `technical_marks.musicxml` |
| `tenths` | missing | task #20; mdom typed |
| `tenuto` | drawn | `articulations.musicxml` |
| `text` | drawn | `lyrics.musicxml`: lyric syllable text |
| `thumb-position` | drawn | `technical_marks.musicxml` |
| `tie` | ignored | sound only (the drawn arc is tied) |
| `tied` | drawn | `tie.musicxml` |
| `tied@orientation` | missing | task #17; mdom raw only |
| `time` | drawn | `time.musicxml` |
| `time@separator` | missing | task #38; separator between numerals not drawn; mdom raw only |
| `time@symbol` | drawn | `barline_styles.musicxml`: common; cut and single-number also honored; note, dotted-note task #18 |
| `time-modification` | drawn | `tuplet_triplet.musicxml` |
| `time-relation` | missing | task #18; mdom raw only |
| `timpani` | missing | task #16; mdom raw only |
| `toe` | drawn | `technical_marks.musicxml` |
| `top-margin` | missing | task #20; mdom raw only |
| `top-system-distance` | missing | task #20; mdom typed |
| `touching-pitch` | drawn | `technical_marks.musicxml`: every harmonic draws the diamond, the touching-pitch form |
| `transpose` | ignored | sound only (written pitch is drawn as-is) |
| `tremolo` | drawn | `tremolo.musicxml` |
| `tremolo@type` | missing | task #35; start/stop two-note tremolo between notes not drawn; mdom typed |
| `trill-mark` | drawn | `ornaments.musicxml` |
| `triple-tongue` | drawn | `technical_marks.musicxml` |
| `tuning-alter` | drawn | `clef_tab_tuning_alter.musicxml`: frets derived from a half-step-down tuning |
| `tuning-octave` | drawn | `clef_tab_staff_tuning.musicxml` |
| `tuning-step` | drawn | `clef_tab_staff_tuning.musicxml` |
| `tuplet` | drawn | `tuplet_triplet.musicxml` |
| `tuplet@bracket` | drawn | `tuplet_display.musicxml`, `wedges.musicxml`: bracket yes and no |
| `tuplet@line-shape` | missing | task #31; curved tuplet bracket not drawn; mdom raw only |
| `tuplet@placement` | drawn | `words.musicxml`, `aloof_measure_7.musicxml`: bracket above or below |
| `tuplet@show-number` | drawn | `tuplet_display.musicxml`: both draws the ratio; none still prints a number |
| `tuplet@show-type` | missing | task #31; note-type glyph after tuplet number not drawn; mdom typed |
| `tuplet-actual` | drawn | `tuplet_display.musicxml` |
| `tuplet-dot` | missing | task #31; dotted note-value glyph beside the tuplet number; mdom typed |
| `tuplet-normal` | drawn | `tuplet_display.musicxml` |
| `tuplet-number` | drawn | `tuplet_display.musicxml` |
| `tuplet-type` | missing | task #31; note-value glyph beside the tuplet number (3 eighths); mdom typed |
| `turn` | drawn | `ornaments.musicxml` |
| `turn@slash` | drawn | `ornaments.musicxml` |
| `type` | drawn | `note.musicxml` |
| `type@size` | drawn | `cue_notes.musicxml`: size="cue" and "grace-cue" draw small; size="large" is not drawn larger |
| `unpitched` | drawn | `percussion_display_step.musicxml` |
| `unstress` | drawn | `articulations_extended.musicxml` |
| `up-bow` | drawn | `technical_marks.musicxml` |
| `vertical-turn` | missing | task #29; vertical turn ornament glyph; mdom typed |
| `virtual-instrument` | ignored | sound only |
| `virtual-library` | ignored | sound only |
| `virtual-name` | ignored | sound only |
| `voice` | drawn | `two_voices.musicxml` |
| `volume` | ignored | sound only |
| `wait` | ignored | sound only (listening) |
| `wavy-line` | drawn | `tab_vibrato.musicxml`: vibrato on tab and trill extension line |
| `wedge` | drawn | `wedges.musicxml` |
| `wedge@niente` | missing | task #17; mdom raw only |
| `wedge@spread` | missing | task #38; hairpin opening fixed; mdom raw only |
| `wedge@type` | drawn | `wedges.musicxml`: crescendo and diminuendo hairpins |
| `with-bar` | missing | task #34; whammy bar indication on a tab bend; mdom raw only |
| `wood` | missing | task #16; mdom raw only |
| `word-font` | missing | task #28; default typeface for words directions not applied; mdom raw only |
| `words` | drawn | `words.musicxml` |
| `work` | missing | task #8; mdom typed |
| `work-number` | missing | task #8; mdom raw only |
| `work-title` | missing | task #8; mdom typed |
