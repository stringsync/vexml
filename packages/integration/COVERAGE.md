# MusicXML 4.0 coverage

What vexml does with each element of the MusicXML 4.0 schema
(`packages/vex/xmllint/schema/musicxml.xsd`), and with the attributes that
change what is drawn. `vex coverage` writes this file and prints the totals: it adds a `missing`
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

| Element | Status | Proof or reason |
| --- | --- | --- |
| `*@color` | drawn | `note_color.musicxml`: note, notehead and stem colors; other elements' color ignored |
| `*@dash-length` | drawn | `spanner_line_types.musicxml` M3: dashed ties, glissandos, slides, wedges; slurs and brackets too |
| `*@default-x` | missing | task #20 (later task in that lane); mdom raw only |
| `*@default-y` | missing | task #20 (later task in that lane); mdom raw only |
| `*@enclosure` | drawn | `text_formatting.musicxml` M6-M13, M16-M18: every shape around words, rehearsal marks and dynamics; rehearsal still boxed by default |
| `*@font-family` | drawn | `text_font_family.musicxml` M2-M6, under the documentFonts setting (off by default, when vexml's text face is used): words, rehearsal marks, other-dynamics text and lyrics in the face named, falling back to the text face for one the browser lacks; SMuFL dynamics keep the notation font |
| `*@font-size` | drawn | `text_formatting.musicxml` M4: words, rehearsal and other-dynamics text, scaled against the word-font size; SMuFL dynamics and lyrics task #51 |
| `*@font-style` | drawn | `text_formatting.musicxml` M1-M2, M19: words upright unless italic, other-dynamics italic unless normal |
| `*@font-weight` | drawn | `text_formatting.musicxml` M3, M17: words, rehearsal marks and other-dynamics text |
| `*@halign` | drawn | `text_formatting.musicxml` M15: words and rehearsal marks on their anchor; dynamics stay centered on their note |
| `*@justify` | drawn | `text_formatting.musicxml` M14: words and rehearsal marks, as halign when that is absent |
| `*@line-type` | drawn | `spanner_line_types.musicxml`, `slur_line_types.musicxml`, `direction_lines.musicxml`: slurs, ties, glissandos, slides, wedges, brackets; tab slides stay solid |
| `*@placement` | drawn | `direction_lines.musicxml`, `note_color.musicxml`: directions, slurs, tuplets, technical; ornaments ignore it |
| `*@print-object` | drawn | `invisible_notes.musicxml`: notes; `print_object.musicxml`: notations, ending, staff-details; accidental and direction elements have none in the schema; clef, key, time, lyric and part-name ignore it |
| `*@relative-x` | missing | task #20 (later task in that lane); mdom raw only |
| `*@relative-y` | missing | task #20 (later task in that lane); mdom raw only |
| `*@rotation` | drawn | `text_formatting.musicxml` M20: words |
| `*@space-length` | drawn | `spanner_line_types.musicxml` M3: dashed and dotted lines, as dash-length |
| `*@underline` | drawn | `text_formatting.musicxml` M5: words, rehearsal marks and dynamics |
| `*@valign` | missing | task #50, after default-y (task #20); mdom raw only |
| `accent` | drawn | `articulations.musicxml` |
| `accidental` | drawn | `accidentals.musicxml`: every value, arrow, triple, Turkish and Persian forms included, and `other` by its `@smufl` name; cautionary and editorial forms too |
| `accidental@bracket` | drawn | `accidentals.musicxml`: bracketed sharp and flat |
| `accidental@cautionary` | drawn | `accidentals.musicxml`: parenthesized accidental |
| `accidental@editorial` | drawn | `accidentals.musicxml`: bracketed accidental |
| `accidental@parentheses` | drawn | `accidentals.musicxml`: parenthesized sharp and flat |
| `accidental@size` | missing | task #9; mdom raw only |
| `accidental@smufl` | drawn | `accidentals.musicxml` M12: `other` drawn by its SMuFL glyph name |
| `accidental-mark` | drawn | `ornaments.musicxml`: small accidental on the ornament it follows |
| `accidental-text` | drawn | `notehead_text.musicxml`: inside notehead-text, its text drawn as written |
| `accord` | drawn | `direction_pictograms.musicxml` M6: each string and its pitch in the scordatura line |
| `accordion-high` | drawn | `direction_pictograms.musicxml` M5: the dot in the top rank |
| `accordion-low` | drawn | `direction_pictograms.musicxml` M5: the dot in the bottom rank |
| `accordion-middle` | drawn | `direction_pictograms.musicxml` M5: one to three dots across the middle rank |
| `accordion-registration` | drawn | `direction_pictograms.musicxml` M5: the three-rank register circle |
| `actual-notes` | drawn | `tuplet_triplet.musicxml`: tuplet ratio via timeModification |
| `alter` | drawn | `accidentals.musicxml`: pitch alter read for note pitch; printed glyph comes from accidental |
| `appearance` | missing | task #36; line widths, note sizes and distances from defaults not applied; mdom raw only |
| `arpeggiate` | drawn | `arpeggio.musicxml` |
| `arpeggiate@direction` | drawn | `arpeggio.musicxml`: up and down arrowheads |
| `arpeggiate@unbroken` | drawn | `arpeggio_unbroken.musicxml`: one line across both staves of a part |
| `arrow` | drawn | `technical_marks.musicxml`: single, filled and hollow arrows in the eight compass directions |
| `arrow-direction` | drawn | `technical_marks.musicxml`: the two-headed directions draw nothing, no SMuFL glyph |
| `arrow-style` | drawn | `technical_marks.musicxml`: double, paired and combined draw as single |
| `arrowhead` | drawn | `technical_marks.musicxml` |
| `articulations` | drawn | `articulations.musicxml`, `articulations_extended.musicxml` |
| `artificial` | drawn | `technical_marks.musicxml`: keeps the diamond; its stopped note is a separate `base-pitch` note |
| `assess` | ignored | listening/assessment only |
| `attributes` | drawn | `key.musicxml`, `time.musicxml`: clef, key, time, divisions |
| `backup` | drawn | `two_voices.musicxml`: onsets via mdom timeline |
| `bar-style` | drawn | `barline_styles.musicxml` |
| `barline` | drawn | `barline_styles.musicxml`, `repeats.musicxml` |
| `barline@location` | drawn | `barline_mid_measure.musicxml`, `barline_styles.musicxml`: left, right and middle barlines |
| `barre` | drawn | `chord_diagram.musicxml`: barre across the fret box |
| `base-pitch` | drawn | `technical_marks.musicxml`: a normal notehead |
| `bass` | drawn | `harmony.musicxml`: slash chord bass |
| `bass-alter` | drawn | `harmony.musicxml` |
| `bass-separator` | drawn | `harmony.musicxml` M20: " over " between chord and bass |
| `bass-step` | drawn | `harmony.musicxml` |
| `beam` | drawn | `beam_variations.musicxml` |
| `beam@fan` | drawn | `beam_tremolo_extras.musicxml` M1-M2: accel and rit feathered beams |
| `beam@repeater` | ignored | deprecated in MusicXML 3.0; tremolos replace it |
| `beat-repeat` | drawn | `measure_style.musicxml`: a repeat slash per beat; a span starting or stopping mid-measure draws its notes |
| `beat-type` | drawn | `time.musicxml` |
| `beat-unit` | drawn | `tempo.musicxml`: metronome mark note value |
| `beat-unit-dot` | drawn | `tempo_beat_unit_dot.musicxml` |
| `beat-unit-tied` | drawn | `tempo_metronome_extras.musicxml`: M1, M3 |
| `beater` | drawn | `direction_pictograms.musicxml` M3: SMuFL beater pictograms, tip up or down |
| `beats` | drawn | `time.musicxml` |
| `bend` | drawn | `tab_bend.musicxml` |
| `bend@shape` | drawn | `tab_bend.musicxml` M4: angled legs |
| `bend-alter` | drawn | `tab_bend.musicxml`: bend amount label |
| `bookmark` | ignored | metadata |
| `bottom-margin` | drawn | `document_layout.musicxml`: the page bottom margin pages fit to, when documentLayout follows the document (paged) |
| `bracket` | drawn | `direction_lines.musicxml` |
| `bracket@line-end` | drawn | `direction_lines.musicxml`: hooked bracket ends |
| `brass-bend` | drawn | `technical_marks.musicxml` |
| `breath-mark` | drawn | `articulations_extended.musicxml` |
| `caesura` | drawn | `articulations_extended.musicxml` |
| `cancel` | drawn | `key_cancel.musicxml`: the fifths name the key cancelled; naturals left of the new key, after it (right) or at the previous measure's end (before-barline) |
| `capo` | drawn | `staff_details_capo.musicxml` |
| `chord` | drawn | `chord.musicxml` |
| `chromatic` | ignored | sound only (transposition; written pitch is drawn) |
| `circular-arrow` | missing | no SMuFL glyph to draw it with; mdom raw only |
| `clef` | drawn | `clef_treble.musicxml`, `clef_c.musicxml` |
| `clef@additional` | drawn | `clef_size.musicxml` M3: an additional clef ignores its line |
| `clef@after-barline` | drawn | `clef_after_barline.musicxml`: an end-of-measure clef opens the next measure past the barline |
| `clef@size` | drawn | `clef_size.musicxml`: cue small, full at full size mid-system, large bigger |
| `clef-octave-change` | drawn | `clef_treble_octave.musicxml`: the 8 above or below the clef |
| `coda` | drawn | `navigation.musicxml` |
| `concert-score` | ignored | metadata: marks written pitch as concert pitch, nothing to draw |
| `creator` | drawn | `header_catalog.musicxml`: with showHeader and no credits, composer and arranger at the right, lyricist, poet and translator at the left |
| `credit` | drawn | `header.musicxml`: page one's, with showHeader; page numbers and footers in the page's lower half dropped |
| `credit-image` | missing | the canvas context loads no images; mdom raw only |
| `credit-symbol` | drawn | `header_extras.musicxml`: a SMuFL glyph (segno, coda, clefs, fermatas, accidentals by name) centered under the subtitles |
| `credit-type` | drawn | `header.musicxml`: title, subtitle, composer, arranger, lyricist, poet, translator; page number dropped, rights credit printed as the footer |
| `credit-words` | drawn | `header.musicxml`: at fixed header sizes in the text font; position task #21, font attributes task #28 |
| `cue` | drawn | `cue_notes.musicxml`: cue-size note, silent in playback |
| `damp` | drawn | `direction_symbols.musicxml`: pluckedDamp glyph |
| `damp-all` | drawn | `direction_symbols.musicxml`: pluckedDampAll glyph |
| `dashes` | drawn | `direction_lines.musicxml` |
| `defaults` | missing | task #20; mdom typed |
| `degree` | drawn | `harmony.musicxml` M15-M18: add, alter and subtract degrees |
| `degree-alter` | drawn | `harmony.musicxml` M16 |
| `degree-type` | drawn | `harmony.musicxml` M15-M17 |
| `degree-value` | drawn | `harmony.musicxml` M15 |
| `degree-value@symbol` | drawn | `harmony.musicxml` M25: a △ before the major-minor's 7 |
| `delayed-inverted-turn` | drawn | `ornaments.musicxml`: the turn glyph delayed, plain and slashed |
| `delayed-turn` | drawn | `ornaments.musicxml` |
| `detached-legato` | drawn | `articulations_extended.musicxml` |
| `diatonic` | ignored | sound only (transposition; written pitch is drawn) |
| `direction` | drawn | `words.musicxml`, `dynamics.musicxml` |
| `direction@directive` | drawn | `directives_offsets.musicxml` M2: words start at the first note position, left of the notes |
| `direction-type` | drawn | `words.musicxml`, `dynamics.musicxml` |
| `directive` | drawn | `directives_offsets.musicxml` M1: text above the staff at the measure start, like a words direction |
| `display-octave` | drawn | `rest_pitched.musicxml`, `percussion_display_step.musicxml` |
| `display-step` | drawn | `rest_pitched.musicxml`, `percussion_display_step.musicxml` |
| `display-text` | drawn | `notehead_text.musicxml`: inside notehead-text; other parents task #25 |
| `distance` | missing | task #36; appearance distances (beam, hyphen spacing) not applied; mdom raw only |
| `divisions` | drawn | `divisions_change.musicxml` |
| `doit` | drawn | `articulations_extended.musicxml` |
| `dot` | drawn | `dotted_notes.musicxml` |
| `double` | ignored | sound only (octave doubling in transpose) |
| `double-tongue` | drawn | `technical_marks.musicxml` |
| `down-bow` | drawn | `technical_marks.musicxml` |
| `duration` | drawn | `note.musicxml` |
| `dynamics` | drawn | `dynamics.musicxml` |
| `effect` | drawn | `direction_pictograms.musicxml` M2: SMuFL pictogram |
| `elevation` | ignored | sound only |
| `elision` | drawn | `lyrics_elision.musicxml` |
| `encoder` | ignored | metadata |
| `encoding` | ignored | metadata |
| `encoding-date` | ignored | metadata |
| `encoding-description` | ignored | metadata |
| `end-line` | ignored | a verse sits on one baseline per system; nothing to break |
| `end-paragraph` | ignored | a verse sits on one baseline per system; nothing to break |
| `ending` | drawn | `repeats.musicxml`: volta brackets |
| `ending@end-length` | drawn | `repeats_geometry.musicxml` M8-9: each jog's length, from its own start or stop |
| `ending@number` | drawn | `repeats.musicxml`: volta labels |
| `ending@print-object` | drawn | `print_object.musicxml` M5-6; a hidden bracket still plays its jumps |
| `ending@text-x` | drawn | `repeats_geometry.musicxml` M8-9: the label's offset from the bracket's start |
| `ending@type` | drawn | `repeats.musicxml`: start and stop hooks; a discontinue close leaves the right end open |
| `ensemble` | ignored | sound only (instrument definition) |
| `except-voice` | drawn | `measure_style.musicxml` M15; the named voices keep their notes under a beat repeat or slash (`measure-repeat` has no such child) |
| `extend` | drawn | `lyrics_melisma.musicxml`: lyric melisma line (figured-bass extend not drawn) |
| `eyeglasses` | drawn | `direction_symbols.musicxml`: miscEyeglasses glyph |
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
| `footnote` | drawn | `editorial_marks.musicxml` M1; a note footnote prints small above the stave; notes only |
| `for-part` | ignored | part extraction data, not shown in the score |
| `forward` | drawn | `two_voices.musicxml`: onsets via mdom timeline |
| `fp` | drawn | `dynamics.musicxml` |
| `frame` | drawn | `chord_diagram.musicxml` |
| `frame@unplayed` | drawn | `chord_diagram.musicxml` M14: empty text, no X |
| `frame-frets` | drawn | `chord_diagram.musicxml` M15: six fret rows |
| `frame-note` | drawn | `chord_diagram.musicxml` |
| `frame-strings` | drawn | `chord_diagram.musicxml` |
| `fret` | drawn | `tab_chord.musicxml`, `chord_diagram.musicxml` |
| `function` | drawn | `harmony_analysis.musicxml` M6: T, S, D7 under the stave |
| `fz` | drawn | `dynamics.musicxml` |
| `glass` | drawn | `direction_pictograms.musicxml` M2: SMuFL pictogram |
| `glissando` | drawn | `glissando.musicxml`: a straight line between the noteheads, across a barline, or a tick into a lone stop |
| `glissando@line-type` | drawn | `spanner_line_types.musicxml` M6 |
| `glyph` | missing | task #36; appearance SMuFL glyph overrides not applied; mdom raw only |
| `golpe` | drawn | `technical_marks.musicxml` M23: the golpe glyph above the note |
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
| `group-time` | drawn | `time_group.musicxml`: one large time signature across the group's staves |
| `grouping` | ignored | analysis metadata |
| `half-muted` | drawn | `technical_marks.musicxml` |
| `hammer-on` | drawn | `tab_hammer_pull.musicxml`: H arc between notes |
| `hammer-on@type` | drawn | `tab_hammer_pull.musicxml`: start/stop arcs |
| `handbell` | drawn | `technical_marks.musicxml` |
| `harmon-closed` | drawn | `technical_marks.musicxml`: closed, open, and half filled on the side location names |
| `harmon-mute` | drawn | `technical_marks.musicxml` |
| `harmonic` | drawn | `harmonic.musicxml`, `tab_harmonic.musicxml`: diamond notehead, angle-bracketed fret |
| `harmony` | drawn | `harmony.musicxml`: chord symbol text above the stave |
| `harmony@print-frame` | drawn | `chord_diagram.musicxml` M13: no box, plain symbol |
| `harp-pedals` | drawn | `harp_pedals.musicxml`: raised, centered and lowered pedals with the divider, above and below the staff |
| `haydn` | drawn | `ornaments.musicxml` M13 |
| `heel` | drawn | `technical_marks.musicxml` |
| `hole` | drawn | `technical_marks.musicxml` |
| `hole-closed` | drawn | `technical_marks.musicxml`: closed, open and half; half ignores location |
| `hole-shape` | missing | every hole draws as a circle; mdom raw only |
| `hole-type` | missing | the hole label ("thumb") is not printed; mdom raw only |
| `humming` | drawn | `lyrics_sounds.musicxml`: text-less lyric draws "mm" |
| `identification` | drawn | `header_catalog.musicxml`: its creators; rights task #47 |
| `image` | missing | the canvas context loads no images; mdom raw only |
| `instrument` | ignored | playback instrument link |
| `instrument-abbreviation` | ignored | playback instrument metadata, part-abbreviation is the printed label |
| `instrument-change` | ignored | sound only |
| `instrument-link` | ignored | file links |
| `instrument-name` | ignored | playback instrument metadata, part-name is the printed label |
| `instrument-sound` | ignored | sound only |
| `instruments` | ignored | metadata (instrument count) |
| `interchangeable` | drawn | `time_extended.musicxml`: second meter joined by its time-relation |
| `inversion` | drawn | `harmony.musicxml` M19: bass chord tone spelled from the kind; `harmony_analysis.musicxml` M2: a numeral's figures |
| `inverted-mordent` | drawn | `ornaments.musicxml` |
| `inverted-turn` | drawn | `ornaments.musicxml` |
| `inverted-turn@slash` | drawn | `ornaments.musicxml` |
| `inverted-vertical-turn` | drawn | `ornaments.musicxml` M13 |
| `ipa` | ignored | pronunciation for synthesis |
| `key` | drawn | `key.musicxml` |
| `key@number` | drawn | `staves_different_keys.musicxml`: a key per staff |
| `key-accidental` | drawn | `key_non_traditional.musicxml`: quarter-sharp, quarter-flat and slash-flat key signature glyphs |
| `key-alter` | drawn | `key_non_traditional.musicxml` |
| `key-octave` | drawn | `key_non_traditional.musicxml` |
| `key-step` | drawn | `key_non_traditional.musicxml` |
| `kind` | drawn | `harmony_kinds.musicxml`: chord symbol suffix |
| `kind@stack-degrees` | drawn | `harmony.musicxml` M21-M22: degrees in a small column beside the kind |
| `kind@use-symbols` | drawn | `harmony.musicxml` M23-M25: △ - + ° ø in place of letters |
| `laughing` | drawn | `lyrics_sounds.musicxml`: text-less lyric draws "ha ha" |
| `left-divider` | missing | task #20; mdom raw only |
| `left-margin` | drawn | `document_layout.musicxml`: page and system left margins when documentLayout follows the document; the first system indents |
| `level` | drawn | `editorial_marks.musicxml` M1; parentheses and bracket wrap a note heads; size and non-note parents not drawn |
| `line` | drawn | `clef_c.musicxml`: clef staff line |
| `line-detail` | drawn | `line_detail.musicxml`: per-line width, color, dashed or dotted line-type, print-object |
| `line-width` | missing | task #36; engraving line thicknesses from defaults appearance; mdom raw only |
| `link` | ignored | file links |
| `listen` | ignored | interactive performance only |
| `listening` | ignored | interactive performance only |
| `lyric` | drawn | `lyrics.musicxml` |
| `lyric@justify` | drawn | `lyrics_justify.musicxml`: left and right align the syllable to the notehead edge, center and absent center it |
| `lyric@number` | drawn | `lyrics.musicxml`, `lyrics_two_voices.musicxml`: verse order sets the row |
| `lyric-font` | drawn | `text_font_family.musicxml` M6: its face for lyrics under the documentFonts setting, by verse number or name; `text_lyric_music_font.musicxml` M1-M3: a lyric `<text font-size>` scales against its size |
| `lyric-language` | ignored | metadata |
| `measure` | drawn | `measures_two.musicxml` |
| `measure@implicit` | drawn | `pickup_measure.musicxml`: pickup sized to its content |
| `measure@width` | missing | task #20; mdom raw only |
| `measure-distance` | missing | task #20; mdom raw only |
| `measure-layout` | missing | task #20; mdom raw only |
| `measure-numbering` | drawn | `measure_numbering.musicxml`: followed under the `measureNumbering: 'document'` default, any other config value overrides it |
| `measure-numbering@system` | drawn | `measure_numbering.musicxml` M5-M14: only-bottom, also-bottom and none, with `staff`; an absent one numbers the system's top stave |
| `measure-repeat` | drawn | `measure_style.musicxml`: one- and two-bar signs, the count above |
| `measure-style` | drawn | `rest_multi_measure.musicxml`: multiple-rest child; `measure_style.musicxml`: repeats and slashes |
| `membrane` | drawn | `direction_pictograms.musicxml` M1, M4: SMuFL pictogram, above or below |
| `metal` | drawn | `direction_pictograms.musicxml` M1: SMuFL pictogram |
| `metronome` | drawn | `tempo.musicxml` |
| `metronome@justify` | drawn | `tempo_metronome_extras.musicxml`: M6-M8, aligned within the measure |
| `metronome@parentheses` | drawn | `tempo_beat_unit_dot.musicxml`: parenthesized tempo mark |
| `metronome-arrows` | drawn | `tempo_metronome_extras.musicxml`: M2, M5 |
| `metronome-beam` | drawn | `tempo_beat_unit_dot.musicxml`: beamed note group in the modulation mark |
| `metronome-dot` | drawn | `tempo_beat_unit_dot.musicxml`: dots after each metronome-note glyph |
| `metronome-note` | drawn | `tempo_beat_unit_dot.musicxml` |
| `metronome-relation` | drawn | `tempo_beat_unit_dot.musicxml` |
| `metronome-tied` | drawn | `tempo_metronome_extras.musicxml`: M4 |
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
| `millimeters` | ignored | see scaling |
| `miscellaneous` | ignored | metadata |
| `miscellaneous-field` | ignored | metadata |
| `mode` | drawn | `key_modes.musicxml`: read for the key, signature from fifths |
| `mordent` | drawn | `ornaments.musicxml` |
| `mordent@approach` | drawn | `ornaments.musicxml` M14-M15, M17-M18: approach="above" as SMuFL's precomposed upper-prefix mordents; approach="below", alone or with a departure, joined from SMuFL's ornament strokes |
| `mordent@departure` | drawn | `ornaments.musicxml` M14-M15, M17-M18: departure="below" on an inverted-mordent as the lower-suffix trill; the forms SMuFL has no glyph for (departure="above", a stroked mordent's departure, approach and departure together) joined from its ornament strokes |
| `mordent@long` | drawn | `ornaments.musicxml` M14-M15: the long mordent and the long inverted-mordent (the shake wiggle) |
| `movement-number` | drawn | `header_catalog.musicxml`: "2. Air" in the catalog fallback |
| `movement-title` | drawn | `header_catalog.musicxml`: the title, or the subtitle under a work-title, with showHeader and no credits |
| `mp` | drawn | `dynamics.musicxml` |
| `multiple-rest` | drawn | `rest_multi_measure.musicxml` |
| `multiple-rest@use-symbols` | drawn | `rest_multi_measure_symbols.musicxml`: breve and whole rest symbols for 2, 3 and 4 bars, plus use-symbols=no |
| `music-font` | drawn | `text_lyric_music_font.musicxml` M4-M6: a SMuFL dynamic's `font-size` scales against its size; its face stays unused on purpose, since vexml engraves in SMuFL Bravura and exporters name non-SMuFL faces (Maestro, Opus) |
| `mute` | ignored | sound only |
| `n` | drawn | `dynamics.musicxml` |
| `natural` | drawn | `harmonic.musicxml`: the diamond |
| `non-arpeggiate` | drawn | `non_arpeggiate.musicxml` |
| `non-arpeggiate@type` | drawn | `non_arpeggiate.musicxml`: bracket from bottom to top member |
| `normal-dot` | drawn | `tuplet_display.musicxml`: dots on the normal-side glyph (show-type="both") |
| `normal-notes` | drawn | `tuplet_triplet.musicxml`: tuplet ratio from time-modification |
| `normal-type` | drawn | `tuplet_display.musicxml`: normal-side note glyph (show-type="both") |
| `notations` | drawn | `articulations.musicxml` |
| `notations@print-object` | drawn | `print_object.musicxml` M4; hides every mark in the group, slurs and tuplets excepted |
| `note` | drawn | `note.musicxml` |
| `note@dynamics` | ignored | playback velocity only |
| `note@pizzicato` | ignored | playback only |
| `note@print-dot` | drawn | `print_object.musicxml` M1 |
| `note@print-leger` | drawn | `print_object.musicxml` M2 |
| `note@print-lyric` | drawn | `print_object.musicxml` M3 |
| `note@print-spacing` | drawn | `print_object.musicxml` M8: a hidden note with print-spacing="no" has its slot closed |
| `note-size` | missing | task #9; mdom raw only |
| `notehead` | drawn | `notehead_shapes.musicxml` |
| `notehead@filled` | drawn | `notehead_shapes_extended.musicxml`: filled and open shape variants |
| `notehead@parentheses` | drawn | `notehead_parentheses.musicxml`: per-member parenthesized noteheads |
| `notehead-text` | drawn | `notehead_text.musicxml`: display-text and accidental-text runs joined and centered in the head |
| `numeral` | drawn | `harmony_analysis.musicxml` M1-M4: Roman numerals under the stave, cased by the kind |
| `numeral-alter` | drawn | `harmony_analysis.musicxml` M4: ♭VI, and IV♯ with location="right" |
| `numeral-fifths` | drawn | `harmony_analysis.musicxml` M4-M5: the key named ahead of the numeral |
| `numeral-key` | drawn | `harmony_analysis.musicxml` M4-M5: "G: V", "e: i" |
| `numeral-mode` | drawn | `harmony_analysis.musicxml` M5: minor keys print lowercase |
| `numeral-root` | drawn | `harmony_analysis.musicxml` M1-M5: the degree as a numeral, or its text (M5) |
| `octave` | drawn | `note.musicxml` |
| `octave-change` | ignored | sound only: transposition, written pitch is drawn |
| `octave-shift` | drawn | `octave_shift.musicxml` |
| `octave-shift@size` | drawn | `octave_shift.musicxml`: 8va and 15ma |
| `offset` | missing | task #38; shift a direction or harmony off its note by divisions; mdom raw only |
| `open` | drawn | `technical_marks.musicxml` M24: brassMuteOpen, or the glyph its smufl names |
| `open-string` | drawn | `technical_marks.musicxml` |
| `opus` | ignored | a link to an opus document, nothing printed |
| `ornaments` | drawn | `ornaments.musicxml` |
| `other-appearance` | missing | task #36; custom engraving appearance from defaults; mdom raw only |
| `other-articulation` | drawn | `articulations_extended.musicxml` M7: the smufl glyph on the notehead side, flipping to its Below twin; text when there is no glyph |
| `other-direction` | drawn | `words.musicxml` M11: the smufl glyph in the notation font, else its text set like words |
| `other-dynamics` | drawn | `dynamics.musicxml`: italic text |
| `other-listen` | ignored | interactive performance only |
| `other-listening` | ignored | interactive performance only |
| `other-notation` | drawn | `articulations_extended.musicxml` M8: the smufl glyph above (below for placement="below"), else its text; a start/stop pair draws at its start |
| `other-ornament` | drawn | `ornaments.musicxml` M13, M16: the smufl glyph, else its text |
| `other-percussion` | drawn | `direction_pictograms.musicxml` M4: its text, upright |
| `other-play` | ignored | sound only |
| `other-technical` | drawn | `tab_annotation.musicxml`: text annotation on tab |
| `p` | drawn | `dynamics.musicxml` |
| `page-height` | drawn | `document_layout.musicxml`: the page height when documentLayout follows the document (paged) |
| `page-layout` | drawn | `document_layout.musicxml`: `<defaults>` page when documentLayout follows the document; `document_layout_print_page.musicxml`: a `<print>` page-layout gives the page it starts its own height and top/bottom margins (paged only; width and side margins stay `<defaults>`) |
| `page-margins` | drawn | `document_layout_even_margins.musicxml`: odd (or both) margins on odd pages and `type="even"` margins on even pages of a paged layout when documentLayout follows the document; systems flow to the narrower of the two |
| `page-width` | drawn | `document_layout.musicxml`: the line width when documentLayout follows the document |
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
| `pedal-alter` | drawn | `harp_pedals.musicxml`: sets each string of the harp pedal diagram |
| `pedal-step` | drawn | `harp_pedals.musicxml`: sets each string of the harp pedal diagram |
| `pedal-tuning` | drawn | `harp_pedals.musicxml`: sets each string of the harp pedal diagram |
| `per-minute` | drawn | `tempo.musicxml` |
| `percussion` | drawn | `direction_pictograms.musicxml` M1-M4: each pictogram as its SMuFL glyph; the `smufl` attribute ignored |
| `pf` | drawn | `dynamics.musicxml` |
| `pitch` | drawn | `note.musicxml` |
| `pitched` | drawn | `direction_pictograms.musicxml` M1: SMuFL pictogram |
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
| `pre-bend` | drawn | `tab_bend.musicxml` M5: vertical arrow off the fret |
| `prefix` | drawn | `figured_bass.musicxml` |
| `principal-voice` | drawn | `direction_symbols.musicxml`: Hauptstimme/Nebenstimme sign and start hook, stop hook; no line between |
| `print` | drawn | `print_new_system.musicxml`: new-system and new-page breaks honored |
| `print@blank-page` | drawn | `blank_page.musicxml`: blank pages left before a new-page print in paged layout; mdom raw only |
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
| `repeat@winged` | drawn | `repeats_geometry.musicxml` M1-6: straight, curved, double-straight and double-curved wings over the system |
| `rest` | drawn | `rest.musicxml` |
| `rf` | drawn | `dynamics.musicxml` |
| `rfz` | drawn | `dynamics.musicxml` |
| `right-divider` | missing | task #20; mdom raw only |
| `right-margin` | drawn | `document_layout.musicxml`: page and system right margins when documentLayout follows the document |
| `rights` | drawn | `header_catalog.musicxml` (identification) and `header_extras.musicxml` (credit-type rights): centered under the last system |
| `root` | drawn | `harmony.musicxml` |
| `root-alter` | drawn | `harmony.musicxml` |
| `root-step` | drawn | `harmony.musicxml` |
| `scaling` | ignored | tenths are tenths of a staff space and vexml engraves at its own staff size, so no physical scale applies |
| `schleifer` | drawn | `ornaments.musicxml` |
| `scoop` | drawn | `articulations_extended.musicxml` |
| `scordatura` | drawn | `direction_pictograms.musicxml` M6: a "Scordatura: 4 = A, 1 = D" text line |
| `score-instrument` | ignored | sound only (instrument metadata) |
| `score-part` | drawn | `structure_part_labels.musicxml`: part-list entry, part names as labels |
| `score-partwise` | drawn | `note.musicxml`: document root |
| `score-timewise` | drawn | `score_timewise.musicxml`: parser regroups it as partwise |
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
| `slash` | drawn | `measure_style.musicxml`: beat slashes, and rhythm slashes with `use-stems` |
| `slash-dot` | drawn | `measure_style.musicxml`: M12's dotted beats |
| `slash-type` | drawn | `measure_style.musicxml`: M12's quarter slashes |
| `slide` | drawn | `slide_in.musicxml`, `tab_slide.musicxml` |
| `slide@line-type` | drawn | `spanner_line_types.musicxml` M7: notation slides; tab slides stay solid |
| `slur` | drawn | `slur_default.musicxml` |
| `slur@bezier-x` | missing | task #38; document curve control points ignored; mdom raw only |
| `slur@orientation` | drawn | `spanner_line_types.musicxml` M5: over/under when placement is absent |
| `smear` | drawn | `technical_marks.musicxml` M23 |
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
| `sounding-pitch` | drawn | `technical_marks.musicxml`: a normal notehead with the small circle above |
| `source` | ignored | metadata |
| `spiccato` | drawn | `articulations_extended.musicxml` |
| `staccatissimo` | drawn | `articulations.musicxml` |
| `staccato` | drawn | `articulations.musicxml` |
| `staff` | drawn | `voices_grand_staff.musicxml`: assigns notes and directions to staves |
| `staff-details` | drawn | `staff_details_lines.musicxml` |
| `staff-details@print-object` | drawn | `print_object.musicxml` M7; hides the staff lines only, clef and key stay |
| `staff-details@show-frets` | missing | tab frets as letters; mdom showFrets reads a child element, not this attribute, so mdom needs a fix first |
| `staff-distance` | drawn | `document_layout.musicxml`: from the stave above's bottom line, when documentLayout follows the document; music that reaches further still opens it |
| `staff-divide` | drawn | `direction_symbols.musicxml`: up, down and up-down arrows |
| `staff-layout` | drawn | `document_layout.musicxml`: `<defaults>` and each part's `<print>`, by staff number, when documentLayout follows the document |
| `staff-lines` | drawn | `staff_details_lines.musicxml` |
| `staff-size` | drawn | `staff_details_size.musicxml`: line spacing, noteheads, clef, key and time signature glyphs, accidentals, flags and stem lengths shrink with it (extended and group time signatures stay full size) |
| `staff-tuning` | drawn | `clef_tab_staff_tuning.musicxml`: tuning derives frets and marks the staff as tab |
| `staff-type` | drawn | `staff_type.musicxml`: ossia and cue staves draw at 75 percent unless staff-size says otherwise, and an ossia staff shows its lines only in measures that hold notes; editorial, regular and alternate draw as a normal staff |
| `staves` | drawn | `structure_grand_staff.musicxml` |
| `stem` | drawn | `note.musicxml` |
| `stem@default-y` | missing | stem length from stem end y; task #20 lane (default-y); mdom raw only |
| `step` | drawn | `note.musicxml` |
| `stick` | drawn | `direction_pictograms.musicxml` M3: SMuFL stick pictograms by type and material; parentheses and dashed-circle ignored |
| `stick-location` | drawn | `direction_pictograms.musicxml` M2: SMuFL pictogram |
| `stick-material` | drawn | `direction_pictograms.musicxml` M3: picks the stick head |
| `stick-type` | drawn | `direction_pictograms.musicxml` M3: picks the stick |
| `stopped` | drawn | `technical_marks.musicxml` |
| `straight` | drawn | `swing.musicxml`: cancels a carried swing in playback timing |
| `stress` | drawn | `articulations_extended.musicxml` |
| `string` | drawn | `string_numbers.musicxml` |
| `string-mute` | drawn | `direction_symbols.musicxml`: mute on/off glyphs |
| `strong-accent` | drawn | `articulations_extended.musicxml` |
| `suffix` | drawn | `figured_bass.musicxml` |
| `supports` | ignored | metadata |
| `swing` | drawn | `swing.musicxml`: swing applied to playback timing |
| `swing-style` | ignored | sound only (descriptive style name, unread) |
| `swing-type` | drawn | `swing.musicxml`: sets the swung unit (16th) in playback timing |
| `syllabic` | drawn | `lyrics.musicxml` |
| `symbol` | drawn | `direction_symbols.musicxml`: a SMuFL glyph by name |
| `sync` | ignored | sound only (listening) |
| `system-distance` | drawn | `document_layout.musicxml`: from the system above's bottom line, when documentLayout follows the document; music that reaches further still opens it |
| `system-dividers` | missing | task #20; mdom raw only |
| `system-layout` | drawn | `document_layout.musicxml`: `<defaults>` and per-system `<print>` overrides, when documentLayout follows the document |
| `system-margins` | drawn | `document_layout.musicxml`: each system's indent when documentLayout follows the document |
| `tap` | drawn | `technical_marks.musicxml` M23-M24: its text like a fingering, else the hand's tapping glyph (right when none) |
| `technical` | drawn | `technical_marks.musicxml` |
| `tenths` | ignored | see scaling |
| `tenuto` | drawn | `articulations.musicxml` |
| `text` | drawn | `lyrics.musicxml`: lyric syllable text |
| `thumb-position` | drawn | `technical_marks.musicxml` |
| `tie` | ignored | sound only (the drawn arc is tied) |
| `tied` | drawn | `tie.musicxml` |
| `tied@orientation` | drawn | `spanner_line_types.musicxml` M4 |
| `time` | drawn | `time.musicxml` |
| `time@separator` | drawn | `time_separator.musicxml`: horizontal, diagonal, vertical and adjacent |
| `time@symbol` | drawn | `barline_styles.musicxml`: common; cut and single-number also honored; `time_extended.musicxml`: note and dotted-note |
| `time-modification` | drawn | `tuplet_triplet.musicxml` |
| `time-relation` | drawn | `time_extended.musicxml`: parentheses, bracket, equals, slash, hyphen, space |
| `timpani` | drawn | `direction_pictograms.musicxml` M2: SMuFL pictogram |
| `toe` | drawn | `technical_marks.musicxml` |
| `top-margin` | drawn | `document_layout.musicxml`: the page top margin when documentLayout follows the document (paged) |
| `top-system-distance` | drawn | `document_layout.musicxml`: the first system on each page, when documentLayout follows the document (paged) |
| `touching-pitch` | drawn | `technical_marks.musicxml`: the diamond |
| `transpose` | ignored | sound only (written pitch is drawn as-is) |
| `tremolo` | drawn | `tremolo.musicxml` |
| `tremolo@type` | drawn | `beam_tremolo_extras.musicxml` M3-M4: start/stop slashes between two notes; single in `tremolo.musicxml` |
| `trill-mark` | drawn | `ornaments.musicxml` |
| `triple-tongue` | drawn | `technical_marks.musicxml` |
| `tuning-alter` | drawn | `clef_tab_tuning_alter.musicxml`: frets derived from a half-step-down tuning |
| `tuning-octave` | drawn | `clef_tab_staff_tuning.musicxml` |
| `tuning-step` | drawn | `clef_tab_staff_tuning.musicxml` |
| `tuplet` | drawn | `tuplet_triplet.musicxml` |
| `tuplet@bracket` | drawn | `tuplet_display.musicxml`, `wedges.musicxml`: bracket yes and no |
| `tuplet@line-shape` | drawn | `tuplet_display.musicxml` M5-M6: curved draws arcs in place of the square bracket |
| `tuplet@placement` | drawn | `words.musicxml`, `aloof_measure_7.musicxml`: bracket above or below |
| `tuplet@show-number` | drawn | `tuplet_display.musicxml`: both draws the ratio, none leaves the numeral off |
| `tuplet@show-type` | drawn | `tuplet_display.musicxml`: actual and both draw note-value glyphs beside the numeral |
| `tuplet-actual` | drawn | `tuplet_display.musicxml` |
| `tuplet-dot` | drawn | `tuplet_display.musicxml`: dots on the actual-side glyph |
| `tuplet-normal` | drawn | `tuplet_display.musicxml` |
| `tuplet-number` | drawn | `tuplet_display.musicxml` |
| `tuplet-type` | drawn | `tuplet_display.musicxml`: actual-side note glyph |
| `turn` | drawn | `ornaments.musicxml` |
| `turn@slash` | drawn | `ornaments.musicxml` |
| `type` | drawn | `note.musicxml` |
| `type@size` | drawn | `cue_notes.musicxml`: size="cue" and "grace-cue" draw small; size="large" is not drawn larger |
| `unpitched` | drawn | `percussion_display_step.musicxml` |
| `unstress` | drawn | `articulations_extended.musicxml` |
| `up-bow` | drawn | `technical_marks.musicxml` |
| `vertical-turn` | drawn | `ornaments.musicxml` M13 |
| `virtual-instrument` | ignored | sound only |
| `virtual-library` | ignored | sound only |
| `virtual-name` | ignored | sound only |
| `voice` | drawn | `two_voices.musicxml` |
| `volume` | ignored | sound only |
| `wait` | ignored | sound only (listening) |
| `wavy-line` | drawn | `tab_vibrato.musicxml`: vibrato on tab and trill extension line |
| `wedge` | drawn | `wedges.musicxml` |
| `wedge@niente` | drawn | `spanner_line_types.musicxml` M9-M10: a circle at the point |
| `wedge@spread` | missing | task #38; hairpin opening fixed; mdom raw only |
| `wedge@type` | drawn | `wedges.musicxml`: crescendo and diminuendo hairpins |
| `with-bar` | drawn | `tab_bend.musicxml` M6-M7: dip and scoop glyphs, else "w/bar" text |
| `wood` | drawn | `direction_pictograms.musicxml` M1: SMuFL pictogram |
| `word-font` | drawn | `text_formatting.musicxml`: its style and weight are the words default, its size the base text sizes scale against; `text_font_family.musicxml` M1: its face, under the documentFonts setting |
| `words` | drawn | `words.musicxml` |
| `work` | drawn | `header_catalog.musicxml`: its work-title |
| `work-number` | drawn | `header_catalog.musicxml`: a subtitle under the work title in the catalog fallback |
| `work-title` | drawn | `header_catalog.musicxml`: the title, with showHeader and no credits |
