import { expect, test } from 'bun:test';
import { render } from '../testing/harness';
import { testCase } from '../testing/test-case';

const TEST_CASES = [
	// A single empty 5-line stave: staff lines with start and end barlines, nothing else.
	testCase('structure_single_stave.musicxml', 'structure_single_stave.png'),

	// One part with two empty staves joined by a curly brace (grand staff).
	testCase('structure_grand_staff.musicxml', 'structure_grand_staff.png'),

	// Two separate single-stave parts stacked vertically, with no connecting brace.
	testCase('structure_two_parts.musicxml', 'structure_two_parts.png'),

	// A single-stave part above a two-stave (braced) part — mixed stave counts.
	testCase('structure_mixed_staves.musicxml', 'structure_mixed_staves.png'),

	// A guitar split across two single-stave parts — a treble notation stave (P1)
	// above a 6-line TAB stave (P2) — joined by a bracket plus the system's left line.
	// The notation+tab pairing is bracketed by convention even when the two staves
	// live in separate parts rather than one two-stave part. An ascending E4/F4/G4/A4
	// line on string 1 (frets 0/1/3/5) appears as notation on top and matching frets
	// below.
	testCase(
		'structure_notation_and_tab_parts.musicxml',
		'structure_notation_and_tab_parts.png',
	),

	// A single-stave part above a two-stave (braced) part, each with its instrument
	// name printed to the left of the first system (showPartLabels): "Violin"
	// centered on the single top stave, "Piano" centered on the braced pair.
	testCase('structure_part_labels.musicxml', 'structure_part_labels.png', {
		showPartLabels: true,
	}),

	// Same two labelled parts as structure_part_labels, but with the text font
	// overridden to Times New Roman (fonts.text). The two instrument names render in
	// that family instead of the default Source Sans 3, proving the text FontConfig option
	// flows through to the part labels (the text vexml draws in the margin).
	testCase('structure_part_labels.musicxml', 'font_text.png', {
		showPartLabels: true,
		fonts: { text: { family: 'Times New Roman' } },
	}),

	// Treble stave, 4/4, one measure (two quarters, two flagged eighths, a quarter
	// rest, all on C5), engraved with VexFlow's Petaluma font instead of the default
	// Bravura (fonts.notation). The notehead, stem flags, treble clef, and rest glyph
	// all take Petaluma's rounder, hand-drawn shapes — proving the notation FontConfig
	// option swaps the engraving font.
	testCase('font_notation_petaluma.musicxml', 'font_notation_petaluma.png', {
		fonts: { notation: { family: 'Petaluma' } },
	}),

	// A single empty stave with a treble (G) clef.
	testCase('clef_treble.musicxml', 'clef_treble.png'),

	// Grand staff: treble clef on the upper stave, bass clef on the lower, joined by a
	// brace.
	testCase('clef_treble_bass.musicxml', 'clef_treble_bass.png'),

	// A 6-line tablature stave with a stacked "TAB" label at the left. With no
	// other stave to connect to, the lone TAB stave draws its own begin barline.
	testCase('clef_tab_6_string.musicxml', 'clef_tab_6_string.png'),

	// A 4-line tablature stave with a stacked "TAB" label at the left. With no
	// other stave to connect to, the lone TAB stave draws its own begin barline.
	testCase('clef_tab_4_string.musicxml', 'clef_tab_4_string.png'),

	// A treble notation stave above a 6-line TAB stave, joined by a bracket (the
	// notation+tab convention, applied automatically with no <part-symbol> declared).
	// 3-sharp key and 4/4 time: both print on the notation stave only — the TAB stave
	// shows neither key signature nor time signature, just its stacked "TAB" glyph.
	testCase('clef_notation_and_tab.musicxml', 'clef_notation_and_tab.png'),

	// Guitar: a treble notation stave over a 6-line TAB stave joined by a bracket, here
	// stated explicitly via <part-symbol>bracket</part-symbol> (the same connector the
	// pairing gets by default). 4/4, an ascending line on string 1 — notation E4/F4/G4/A4
	// quarters sitting on the treble staff, with the matching TAB frets 0/1/3/5 below,
	// proving the fret -> pitch mapping.
	testCase(
		'clef_notation_and_tab_bracket.musicxml',
		'clef_notation_and_tab_bracket.png',
	),

	// One system, treble 4/4: key signatures and a mid-system key change. Each measure
	// holds one C5 whole note.
	// - M1: opens the system with a treble clef, a 3-sharp key signature (F#, C#, G#),
	//   and a 4/4 time signature.
	// - M2: changes the key to 2 flats (Bb, Eb) — only the new key signature is redrawn
	//   at the change (the clef and time signature are NOT repeated).
	// - M3: continues in 2 flats with no key signature redrawn.
	testCase('key.musicxml', 'key.png'),

	// One system, treble: time signatures and mid-system meter changes.
	// - M1: opens the system with a treble clef and common time (the "C" symbol = 4/4);
	//   four C5 quarters.
	// - M2: changes the meter to cut time (the "¢" symbol = 2/2) — only the new time
	//   signature is redrawn (the clef is NOT repeated); two C5 half notes.
	// - M3: changes the meter to a numeric 3/4 (stacked numerals); three C5 quarters.
	// - M4: continues in 3/4 with no time signature redrawn; three C5 quarters.
	testCase('time.musicxml', 'time.png'),

	// Treble stave, 4/4: single-note rendering — durations then stem direction.
	// - M1: a whole note (C5).
	// - M2: a half, quarter, eighth, sixteenth, then two thirty-seconds on C5 (increasing
	//   flag counts).
	// - M3: stem direction by staff position (no <stem>) — the treble middle line is B4,
	//   so E4 and G4 stem up while B4 and D5 stem down.
	// - M4: the same four pitches with an explicit <stem> overriding each position default
	//   — E4 down, G4 down, B4 up, D5 up.
	testCase('note.musicxml', 'note.png'),

	// Treble stave, 4/4, all on C5: note density per measure (beat counts deliberately
	// ignored). Each measure varies the number and kind of notes. Under the logarithmic
	// spacing model a measure's width tracks its note *count* (with a weak pull from note
	// value), so denser measures are wider — the opposite of a fixed px-per-tick, which
	// would make every 16-tick measure equally wide. Wraps to three systems (M1-3, M4-5,
	// M6); complete systems are justified to full width.
	// - M1: one whole note (1 event) — floors at the minimum width, the narrowest measure.
	// - M2: four quarters (4 events) — wider than M1.
	// - M3: eight beamed eighths (8 events) — wider still; M1-M3 share the first system.
	// - M4: sixteen beamed sixteenths (16 events) — the densest, so the widest natural
	//   width; leads the second system.
	// - M5: eight quarters (8 events) — shares the second system with M4.
	// - M6: mixed kinds in one measure — quarter, two beamed eighths, four beamed
	//   sixteenths, then a half. Trailing system, left unjustified at its natural width, so
	//   the uneven within-measure spacing (wide quarter, then progressively tighter) shows.
	testCase('note_density.musicxml', 'note_density.png'),

	// Treble stave, 4/4, all on C5: dotted-note variations.
	// - M1: dotted-quarter + eighth pairs (single dots).
	// - M2: double-dotted-quarter + sixteenth pairs (double dots).
	// - M3: four beamed dotted-eighth + sixteenth pairs (dots inside beams).
	testCase('dotted_notes.musicxml', 'dotted_notes.png'),

	// Treble stave, 4/4: the rest counterpart of note.musicxml's durations (M1-M2).
	// - M1: a whole rest, centered horizontally in the measure (full-measure-rest convention).
	// - M2: half, quarter, eighth, sixteenth, then two thirty-second rests.
	testCase('rest.musicxml', 'rest.png'),

	// Treble stave, 4/4: four C5 quarter notes at one staff position — sharp, flat,
	// natural, then no accidental — so only the accidental glyph varies.
	testCase('accidentals.musicxml', 'accidentals.png'),

	// Treble stave, 4/4: metronome marks from <direction><metronome>, drawn above the
	// staff just right of the time signature ("<quarter note> = bpm").
	// - M1: an explicit quarter = 120 over four B4 quarters (mid-staff, no collision) —
	//   the mark sits one text line above the staff.
	// - M2: quarter = 120 over a high first note (C6, two ledger lines above) that reaches
	//   up into the mark's default band, so the mark is lifted clear of the notehead.
	testCase('tempo.musicxml', 'tempo.png'),

	// Treble stave, 4/4: a words direction from <direction><direction-type><words>, drawn
	// in italics above the staff at the first note's x. Four boring quarters per measure so
	// only the directive and the first note's height vary.
	// - M1: "*ritardando..." over B4 quarters (mid-staff, no collision) — the text sits one
	//   fixed gap above the staff.
	// - M2: "*ritardando..." over a high first note (C6, two ledger lines above) that reaches
	//   up into the text's default band, so the text is lifted clear of the notehead.
	testCase('words.musicxml', 'words.png'),

	// Treble stave, 4/4: two measures split by a barline, each holding one whole note
	// (C5, same pitch in both).
	testCase('measures_two.musicxml', 'measures_two.png'),

	// Grand staff (empty treble over empty bass), two measures. Because the system has
	// multiple staves, the per-stave end barlines are suppressed and the dividing lines
	// are drawn entirely by stave connectors.
	// - M1: closes with the internal barline between measures — a single thin line
	//   spanning both staves (the singleRight connector).
	// - M2: the piece's final measure closes with a bold thin-thick double line spanning
	//   both staves (boldDoubleRight) rather than the plain single line drawn at every
	//   other measure end.
	testCase('measures_end_barline.musicxml', 'measures_end_barline.png'),

	// Treble stave, 4/4, two whole-note measures (C5 in both). M1 carries an explicit
	// right <barline> with <bar-style>light-light</bar-style>, so the divider between M1
	// and M2 renders as a thin double line instead of the default single line; M2 closes
	// with the usual thin-thick end barline.
	testCase('measures_light_light.musicxml', 'measures_light_light.png'),

	// Beam variations across seven 4/4 measures. Wraps across systems.
	// - M1: simple beamed eighths in a small range.
	// - M2: beamed eighths leaping a wide range (steep beams, ledger lines above on
	//   D6/E6 and below on C4/D4).
	// - M3: two double-beamed sixteenth groups then a half rest.
	// - M4: one beat of triple-beamed 32nds then half + quarter rests.
	// - M5: mixed eighth+sixteenth beats with partial secondary beams.
	// - M6: a beamed eighth group spanning an internal eighth rest (rest carries a
	//   beam marker).
	// - M7: beamed eighths in a low range (below the middle line) so the auto stem
	//   direction flips up.
	// - M8: a beam run spanning an eighth rest that carries NO beam markers; the rest
	//   sits under one continuous beam (C5-D5-rest-E5) rather than breaking it.
	testCase('beam_variations.musicxml', 'beam_variations.png'),

	// Treble stave, 4/4: four quarter-note chords — a C5/E5/G5 triad, a C5/D5 second
	// (offset noteheads), a C5/D5/E5 cluster, then a C5/E5/G5/A5 chord with a second
	// (G5/A5) on top.
	testCase('chord.musicxml', 'chord.png'),

	// Treble stave, 3/4: an ascending run of quarter notes covering every natural
	// pitch from F3 (three ledger lines below the staff) up to E6 (three ledger lines
	// above), three notes per measure across seven measures — ledger lines grow from
	// three below, shrink to none on the staff, then grow to three above. Wraps across
	// systems.
	testCase('ledger_lines.musicxml', 'ledger_lines.png'),

	// Treble stave, 4/4: ties on single notes (the tied-chord variants live in the
	// tie_chord_* fixtures below).
	// - M1: two half notes tied within the measure.
	// - M2-3: a whole note tied into the next whole note across a system break — M2 ends one
	//   system and M3 begins the next, so the tie splits into two partial arcs: one bowing off
	//   the right edge of M2 ("tie to nothing") and one bowing in from the left edge of M3
	//   ("tie from nothing"), rather than one line slanting down across the page.
	// - M4: two F#5 half notes tied; both notes declare a superfluous <accidental>sharp</accidental>
	//   in the MusicXML, but only the tie-start note prints the sharp — the tied note carries the
	//   accidental implicitly, so its glyph is suppressed.
	testCase('tie.musicxml', 'tie.png'),

	// Treble stave, D major, 4/4: a three-note tie chain on F#4 — dotted-eighth -> quarter ->
	// quarter — where the middle note carries both tie start and stop, so two arcs join end to
	// end across the same pitch. The exporter orders this note's <tied start> before its <tied
	// stop>, which mdom's document-order pairing mis-matched to the note's OWN stop (a
	// degenerate self-tie drawing nothing); buildTies re-resolves it so both links draw. Beat
	// 1 leads in with a 16th E4 beamed to the dotted eighth; beats 3-4 add a below-placed slur
	// over a 16th run (F#4-G4) into a slashed grace E4 that slurs into the closing F#4 eighth.
	testCase('tie_chain.musicxml', 'tie_chain.png'),

	// Treble stave, 4/4, one measure: two stem-up half-note chords (C5/E5/G5) with all three
	// members tied — the bottom member (C5) bows under (concave up) and the upper two (E5, G5)
	// bow over (concave down), sandwiching the chord while the over-arcs clear the up-stems.
	testCase('tie_chord_triad.musicxml', 'tie_chord_triad.png'),

	// Treble stave, 4/4, one measure: a two-note chord (C5/E5) with both members tied — the
	// lower bows under (concave up), the upper bows over (concave down), so the ties diverge
	// from the chord center.
	testCase('tie_chord_dyad.musicxml', 'tie_chord_dyad.png'),

	// Treble stave, 4/4, one measure: a four-note chord (C5/E5/G5/C6) with all members tied —
	// the lower half (C5, E5) bows under and the upper half (G5, C6) bows over, a two-under /
	// two-over split across a one-octave spread.
	testCase('tie_chord_octave.musicxml', 'tie_chord_octave.png'),

	// Treble stave, 4/4, one measure: spacing variant — a two-note second (C5/D5) with both
	// members tied; the second offsets the noteheads across the stem, C5 bowing under and D5
	// over.
	testCase('tie_chord_second.musicxml', 'tie_chord_second.png'),

	// Treble stave, 4/4, one measure: spacing variant — a four-note cluster of stacked seconds
	// (C5/D5/E5/F5) with all members tied; zig-zag offset noteheads, lower half under and upper
	// half over.
	testCase('tie_chord_cluster.musicxml', 'tie_chord_cluster.png'),

	// Treble, 4/4, narrowed to 360px so the system breaks between M1 and M2. A three-note
	// chord (C5/E5/G5) is tied from M1's last beat into M2's first beat, straddling the
	// break. Because M1 is the first measure of its system it shares M2's left X, so the
	// wrap is detected by stave row (Y), not X; otherwise all three ties draw as diagonals
	// slanting across the page gap (regression from a real lead sheet, measures 15-16).
	// - M1 (system 1): three filler C5 quarters then the tied chord; the three ties bow off
	//   the right edge of the stave into nothing ("tie to nothing").
	// - M2 (system 2): the tied half chord + half rest; the three ties bow in from the left
	//   edge of the stave into the chord ("tie from nothing").
	testCase('tie_system_break.musicxml', 'tie_system_break.png', {
		layout: { type: 'standard', width: 360 },
	}),

	// Treble stave, 4/4: four quarters C5, D5, E5, F5 under one slur with no placement
	// attribute (default). The stem-down notes push the slur above the noteheads.
	testCase('slur_default.musicxml', 'slur_default.png'),

	// Treble stave, 4/4: four quarters G5, A5, B5, A5 under one slur with explicit
	// placement="above" — the slur arcs above the noteheads.
	testCase('slur_above.musicxml', 'slur_above.png'),

	// Treble stave, 4/4: one slur beneath an ascending low line E4, F4, G4, A4. All
	// notes sit below the middle line so their stems point up, and the slur bows below
	// the noteheads (opposite side from the stems).
	testCase('slur_stem_up.musicxml', 'slur_stem_up.png'),

	// Treble stave, 4/4: one slur over a zig-zag line C5, G4, D5, A4 straddling the
	// middle line, so the stems alternate down-up-down-up. The slur arcs above, clear of
	// both the noteheads and the up-stem tips.
	testCase('slur_mixed_stems.musicxml', 'slur_mixed_stems.png'),

	// Treble stave, 4/4: two half notes A5 and C4 slurred across a wide downward leap —
	// the slur spans the measure between the distant noteheads.
	testCase('slur_leap.musicxml', 'slur_leap.png'),

	// Treble stave, 4/4: eight beamed eighths (two four-note beams) under a single slur
	// arcing above the whole beamed run.
	testCase('slur_beamed.musicxml', 'slur_beamed.png'),

	// Treble stave, 4/4: four quarters carrying two separate two-note slurs (C5-D5 and
	// E5-D5) using distinct slur numbers — two short independent arcs above.
	testCase('slur_multiple.musicxml', 'slur_multiple.png'),

	// Treble stave, 4/4: three chained slurs over E4, G4, E5, C5 — a slur below the
	// first pair (E4-G4, stem-up), a slur bridging note 2 to note 3 (G4-E5) below, and a
	// slur above the last pair (E5-C5, stem-down). Overlapping slurs use distinct
	// numbers, so notes 2 and 3 each carry both a stop and a start.
	testCase('slur_chained.musicxml', 'slur_chained.png'),

	// Treble, 4/4, narrowed to 350px so the system breaks between M1 and M2. A slur runs
	// from M1's last note (F5) into M2's first note (G5), straddling the break. Like a
	// wrapped tie, the slur must NOT draw one curve slanting across the page gap; it splits
	// into two partial arcs.
	// - M1 (system 1): four ascending quarters C5-F5; the slur bows off the right edge of
	//   the stave past F5 into nothing ("slur to nothing").
	// - M2 (system 2): four descending quarters G5-D5; the slur bows in from the left edge
	//   of the stave into G5 ("slur from nothing").
	testCase('slur_system_break.musicxml', 'slur_system_break.png', {
		layout: { type: 'standard', width: 350 },
	}),

	// Treble stave, 4/4: sustain pedals from <direction><direction-type><pedal>, drawn
	// under the staff spanning four B4 quarters. The pedal goes down under the first
	// note and releases past the last.
	// - M1: a text pedal (line="no") — the "Ped" glyph under the first note, the "*"
	//   release glyph near the end barline.
	// - M2: a bracket pedal (line="yes") — an L-shaped bracket line under the staff from
	//   the first note to the last instead of the text glyphs.
	testCase('pedal.musicxml', 'pedal.png'),

	// 6-line TAB stave, half notes: hammer-ons and pull-offs notated with plain
	// <slur>s, the "H"/"P" label inferred from fret motion (higher target = hammer-on,
	// lower = pull-off). No <time>, so no time signature is drawn.
	// - M1: single note on string 2, fret 5 -> 7 (ascending) — a hammer-on "H".
	// - M2: single note on string 2, fret 7 -> 5 (descending) — a pull-off "P".
	// - M3: a two-string chord (strings 3+2) hammered up (5/5 -> 7/8); the lead string's
	//   ascending motion drives the whole chord. The target chord also starts a pull-off
	//   slur that resolves in M4.
	// - M4: the pull-off chord resolves back down (7/8 -> 5/5, "P"), then a pull-off to an
	//   open string on string 1 (fret 7 -> 0, "P"), the open string drawn as "0".
	// - M5: the same gestures on eighth notes (string 1) — two hammer-on pairs (5 -> 7)
	//   then two pull-off pairs (7 -> 5) — to show the technique at a tighter rhythm.
	// - M6: sixteenth notes (string 2) — a hammer-on pair (5 -> 7) then a pull-off pair
	//   (7 -> 5), closing on a pull-off to the open string (fret 5 -> 0).
	// Default render: the tie arcs draw but the "H"/"P" labels are off
	// (showTabHammerPullText defaults to false).
	testCase('tab_hammer_pull.musicxml', 'tab_hammer_pull.png'),

	// Same fixture with showTabHammerPullText: true — the "H"/"P" labels print above
	// each hammer-on/pull-off arc.
	testCase('tab_hammer_pull.musicxml', 'tab_hammer_pull_text.png', {
		showTabHammerPullText: true,
	}),

	// Same fixture at a narrow width that breaks the system between M3 and M4, where a
	// hammer-on/pull-off slur spans the break. The split tie must bow off the right edge
	// of M3's stave and in from the left edge of M4's — not draw one diagonal across the
	// page gap.
	testCase('tab_hammer_pull.musicxml', 'tab_hammer_pull_wrap.png', {
		layout: { type: 'standard', width: 491 },
	}),

	// 6-line TAB stave, half notes: how ties vs slurs render in tab. A tie holds a string
	// without re-striking it, so its held (tie-stop) fret is dropped; a slur changes fret
	// and is drawn.
	// - M1: beat 1 strikes a dyad (strings 3/2, frets 5/5) tied into beat 2. On beat 2 both
	//   tied strings are held, so only the newly struck string 1 (fret 7) prints — the held
	//   5/5 are omitted.
	// - M2: a hammer-on on string 1 (fret 5 -> 7). The fret changes, so both numbers print
	//   under one slur arc — a slur is notated where a tie is not.
	// - M3: a lone tied note (string 1, fret 7). Every member is held, so the tab omits all
	//   frets and leaves beat 2 blank — an invisible ghost note reserves the tick so the tab
	//   stays aligned with the notation stave (see vexflowTabTickables).
	testCase('tab_tie.musicxml', 'tab_tie.png'),

	// 6-line TAB stave: grace notes (small fret numbers just left of their main note).
	// No <time>, so no time signature is drawn.
	// - M1: a single grace (string 3, fret 7) before a fret-5 half note, then a grace pair
	//   (frets 7, 9) before another fret-5 half note, all on string 3.
	// - M2: a grace note slurred to its main note — a slur curves from the small grace
	//   fret 7 to the fret-5 half note, both on string 3.
	testCase('tab_grace.musicxml', 'tab_grace.png'),

	// A notation stave (P1) stacked over a 6-line TAB stave (P2) as two separate parts,
	// formatted together so same-tick notes align vertically. Each measure has a grace
	// note before a whole note: a small notehead on top, a small fret number below. The
	// TAB grace fret must sit directly under the notation grace notehead in both bars —
	// the notation accidental in M1 must not drag it left (the bug this guards).
	// - M1: a Db5 grace (notation draws a flat accidental left of the notehead; TAB draws
	//   only "6" on string 2) before a C5 whole note (fret 5). The "6" lines up under the
	//   grace notehead, not under the accidental.
	// - M2: the same layout without an accidental — a D5 grace ("7", string 2) before the
	//   C5 whole note. Control: graces line up the same with or without the accidental.
	testCase('tab_grace_notation_align.musicxml', 'tab_grace_notation_align.png'),

	// A notation stave (P1) over a 6-line TAB stave (P2), key of Bb (-2), 4/4, formatted
	// together. Like tab_grace_notation_align but the graces and the notes they precede are
	// CHORDS, and the MAIN chords carry their own accidentals. Each grace chord's TAB frets
	// must sit under its grace noteheads, not be dragged right by the main chord's accidental
	// (the bug this guards: the main note's accidental inflated the shared modLeftPx the old
	// alignment leaned on). Quarter F5 / F4-fret6, a quarter rest, then on beats 3 and 4:
	// - Beat 3: a slashed grace chord (E4-natural + A4 + Db5-flat; TAB "2" on strings 4/3/2)
	//   before a main chord (F4 + Bb4 + D5-natural; TAB "3" on strings 4/3/2). The three "2"
	//   frets line up under the grace noteheads; the "3" frets under the main noteheads.
	// - Beat 4: a slashed grace chord (E4 + Ab4-flat + Db5-flat; TAB "7/6/6" strings 5/4/3)
	//   before a main chord (Eb4-flat + G4 + C5; TAB "6/5/5" strings 5/4/3). Same alignment.
	testCase('tab_grace_chord_align.musicxml', 'tab_grace_chord_align.png'),

	// 6-line TAB stave: slides drawn as diagonal TabSlide lines tilted by the fret motion.
	// No <time>, so no time signature is drawn.
	// - M1: a slide up (string 3, fret 5 -> 7) then a slide down (fret 9 -> 7); four
	//   quarter notes. The "sl." labels are off by default (showTabSlideText).
	testCase('tab_slide.musicxml', 'tab_slide.png'),

	// Same fixture with showTabSlideText: true — the "sl." labels print above the slide
	// lines.
	testCase('tab_slide.musicxml', 'tab_slide_text.png', {
		showTabSlideText: true,
	}),

	// 6-line TAB stave: bends, each drawn as an upward arrow + label. No <time>, so no
	// time signature is drawn.
	// - M1: a whole-step bend labelled "1" on string 3 fret 7, then a half-step bend
	//   labelled "½" on string 2 fret 5.
	// - M2: a bend-and-release on string 3 fret 7 (whole note) — an up-then-down arrow.
	testCase('tab_bend.musicxml', 'tab_bend.png'),

	// 6-line TAB stave: vibrato (wavy line) stretching to the next note or the bar's end,
	// whichever comes first. No <time>, so no time signature is drawn.
	// - M1: string 3 fret 7 runs up to the second note; fret 5 (last) runs to the bar's end.
	testCase('tab_vibrato.musicxml', 'tab_vibrato.png'),

	// 6-line TAB stave: text annotations above the frets via <other-technical>. No <time>,
	// so no time signature is drawn.
	// - M1: a leading quarter rest, then a palm mute "P.M." and a dead note "x" (both
	//   string 3, fret 7), then a trailing quarter rest.
	testCase('tab_annotation.musicxml', 'tab_annotation.png'),

	// 6-line TAB stave, quarter-note tab chords. Each chord member carries its own
	// string/fret; members after the first are <chord/>. No <time>, so no time
	// signature is drawn.
	// - M1: chord density/layout. Adjacent 3-string triad (strings 3/2/1, frets 0/1/0);
	//   full 6-string open-E chord (strings 6..1, frets 0/2/2/1/0/0) with a fret on every
	//   line; a string-skipping chord (strings 5/3/1 open, skipping 4 and 2); a wide
	//   outer-string dyad (strings 6 and 1 at fret 3) spanning the full stave height.
	// - M2: a 16th grace note (small fret 4, string 1) just left of a 3-string D-major
	//   chord (strings 3/2/1, frets 2/3/2); a double-digit-fret chord (strings 3/2/1 all
	//   at fret 12, two-digit numbers); an adjacent low dyad (strings 5/4, frets 2/2); a
	//   mixed open/fretted chord on the lower 4 strings (6/5/4/3, frets 0/0/2/2) with
	//   "0"s beside "2"s.
	testCase('tab_chord.musicxml', 'tab_chord.png'),

	// 6-line TAB stave: natural harmonics drawn as the fret in angle brackets. A <harmonic>
	// in <technical> wraps the fret in <> (src/notes.ts tabPositions); styleFrets bolds the
	// digit but leaves the brackets thin/unbolded, so a harmonic reads as light "<>" around a
	// bold fret. No <time>, so no time signature is drawn.
	// - M1: single-note harmonics, one per beat — "<12>" on string 3 hard against the start
	//   barline, "<7>" on string 2, "<5>" on string 4, "<12>" on string 1 — exercising bracket
	//   weight, single- vs double-digit width, and barline clearance of the leading harmonic.
	// - M2: harmonic chords (every member bracketed) — a 12th-fret triad (strings 3/2/1, three
	//   stacked "<12>"), a 7th-fret dyad (strings 2/1, "<7>"), a mixed chord ("<12>" on string 3
	//   over a plain "0" on string 1, so only the harmonic is bracketed), then a 5th-fret triad
	//   (strings 3/2/1, single-digit "<5>"). Watch the stacked brackets for vertical clashing.
	testCase('tab_harmonic.musicxml', 'tab_harmonic.png'),

	// Notation stave over a 6-line TAB stave: X noteheads (<notehead>x</notehead>) for
	// dead/muted notes. The notation stave draws a cross at each pitch (vexflow "/X2"); the tab
	// stave prints "✕" in place of the fret on the matching string (src/notes.ts). No <time>, so
	// no time signature is drawn.
	// - M1: four quarters, the notation pitch held at B4 (middle line, no ledger lines) so the
	//   four crosses sit in a row at one height — only the glyph is under test there. The tab
	//   <string> is what varies (6, 4, 2, 1), so the tab "✕" rises from the bottom (string 6)
	//   to the top (string 1) line left to right, proving each lands on the right string.
	// - M2: eight beamed eighths (two beam groups of four), notation pitch B4 and tab string 1
	//   both held — the cross noteheads carry stems and beam normally; the tab "✕" marks stay
	//   bare (tab draws no stems/beams), just spaced at the eighth rhythm.
	// - M3: a whole-note chord — three stacked cross noteheads (G4/B4/D5) over three stacked tab
	//   "✕" marks (strings 3/2/1), proving the X glyph stacks as a chord on both staves.
	// - M4: a realistic dead-note strum — a normal note (G4 / tab fret "0") beamed with an
	//   X-notehead dyad (A3+D4 / tab strings 2+1 "✕"), twice, then a plain G4 half note. Shows
	//   X noteheads beamed alongside normal ones and the tab "✕" next to a real fret digit; the
	//   X notes carry real pitches (A3 dips to a ledger line below the staff).
	// - M5: four B4 quarters, all with a printed <accidental>natural</accidental>, alternating
	//   round / X / round / X notehead. The natural draws only on the two round noteheads; the
	//   X (dead/muted, no definite pitch) noteheads suppress it (src/notes.ts addAccidentals).
	//   The tab stave is unaffected (it never prints accidentals): fret "0" / "✕" / "0" / "✕".
	testCase('notehead_x.musicxml', 'notehead_x.png'),

	// Notation stave over a 6-line TAB stave: parenthesized noteheads
	// (<notehead parentheses="yes">) for ghost/optional notes. The notation stave wraps each
	// notehead in round brackets (vexflow Parenthesis modifier); the tab stave wraps the fret
	// number in "()" on the matching string (src/notes.ts). No <time>, so no time signature is
	// drawn. A plain note sits between the parenthesized ones for contrast.
	// - M1: a parenthesized B4 quarter (tab string 1, fret "(2)"), a plain B4 quarter (fret 5),
	//   then a parenthesized G4/B4/D5 half-note chord — each notehead bracketed on the notation
	//   stave and each fret "(0)"/"(0)"/"(2)" bracketed on tab strings 3/2/1.
	testCase('notehead_parentheses.musicxml', 'notehead_parentheses.png'),

	// Notation stave over a 6-line TAB stave, 4/4: the same line on both staves, proving a
	// rest keeps the two staves aligned. The notation voice draws a quarter rest; the tab
	// voice reserves the same beat as blank space (tab omits rest glyphs).
	// - M1: quarter (E4 / fret 0), quarter rest, quarter (G4 / fret 3), quarter (A4 / fret
	//   5). Each tab fret sits directly under its notehead, with an empty gap on the tab
	//   stave under the rest — frets read 0, (gap), 3, 5.
	testCase('tab_notation_rest.musicxml', 'tab_notation_rest.png'),

	// Notation stave over a 6-line TAB stave, 4/4: the same ascending string-1 line on both
	// staves (E4/fret0, F4/fret1, G4/fret3, A4/fret5), varying only the durations to exercise
	// dotted rhythms. The rhythm prints on the notation stave only — the TAB stave shows bare
	// fret numbers (no stems or dots) aligned under their noteheads.
	// - M1: single dots — dotted-quarter + eighth pairs; the two long notes carry one
	//   augmentation dot each.
	// - M2: double dots — double-dotted-quarter + sixteenth pairs; the two long notes carry
	//   two augmentation dots each.
	testCase('tab_notation_durations.musicxml', 'tab_notation_durations.png'),

	// Tuplets on C5.
	// - M1: a beamed eighth-note triplet ("3"), a bracketed quarter-note triplet ("3"),
	//   then a plain quarter.
	// - M2: a beamed sixteenth-note sextuplet ("6"), a beamed eighth-note triplet ("3"),
	//   then a half note.
	testCase('tuplet_triplet.musicxml', 'tuplet_triplet.png'),

	// Treble stave, 4/4: staccato (dot), accent (>), tenuto (—), then staccatissimo
	// (wedge) — only the articulation varies within a measure; the measure sets the
	// stem direction.
	// - M1: four C5 quarters (stems down) — articulations sit above the noteheads.
	// - M2: four E4 quarters (stems up) — articulations sit below the noteheads.
	// - M3: a C5+G4 beamed eighth pair — the beam forces stems up (driven by the low
	//   G4), so the C5's staccato sits below its notehead, not above the beam.
	testCase('articulations.musicxml', 'articulations.png'),

	// Treble stave, 4/4: fermatas from <notations><fermata>, drawn as a held-note
	// arc-over-dot above (or below) the note. Unlike articulations, a fermata's side is
	// set by its type, not the stem direction.
	// - M1: a normal fermata above a C5 whole note (default placement).
	// - M2: an inverted fermata (type="inverted") below a C5 whole note.
	testCase('fermata.musicxml', 'fermata.png'),

	// Treble stave, 4/4: arpeggios from <notations><arpeggiate>, drawn as a wavy vertical
	// line down the left side of a C5/E5/G5 whole-note chord (one chord per measure). The
	// stroke spans all three noteheads; direction sets the arrowhead.
	// - M1: undirected arpeggiate — a plain wiggle, no arrowhead.
	// - M2: direction="up" — the wiggle with an arrowhead pointing up at the top.
	// - M3: direction="down" — the wiggle with an arrowhead pointing down at the bottom.
	testCase('arpeggio.musicxml', 'arpeggio.png'),

	// Treble stave, 4/4: chord symbols from <harmony>, each printed above the first
	// note of its measure (four boring B4 quarters per measure so only the symbol
	// varies). The display string is the root step + alter sign + the <kind text="…">
	// suffix.
	// - M1: a bare major triad — root C, kind text empty — prints just "C".
	// - M2: a dominant seventh — root G, kind text "7" — prints "G7".
	// - M3: an altered-root minor — root F with <root-alter>1</root-alter>, kind text
	//   "m" — prints "F♯m" (real Unicode sharp).
	// - M4: a high first note (C6, two ledger lines above the staff) under a "D" symbol —
	//   the symbol lifts above the notehead/ledger lines instead of colliding with them.
	// - M5: a flat root — root B with <root-alter>-1</root-alter> — prints "B♭".
	// - M6: an explicit natural root — root B with <root-alter>0</root-alter> — prints "B♮".
	// - M7: a slash chord — root E♭ with a <bass> of B♭ — prints "E♭/B♭".
	// - M8: a high staccato note under its symbol — a B♭5 quarter (stem down, so the
	//   staccato dot sits above the notehead) + dotted-half rest, under a "B♭" symbol. The
	//   symbol lifts to clear the staccato dot, not just the notehead, so the dot and the
	//   text don't touch.
	// - M9: a high tied pair under its symbol — two A♭5 quarters tied together (stem down,
	//   so the tie bows up over the noteheads) + half rest, under an "A♭" symbol. The
	//   symbol lifts to clear the tie's arc, not just the noteheads, so the arc and the
	//   text don't touch.
	// - M10: extension accidentals — a dominant with kind text="7(b9#11)" over four B4
	//   quarters prints "G7(♭9♯11)". The ASCII b/# in the extension render as the real
	//   ♭/♯ glyphs at the same smaller size as the root's accidental, not literal "b"/"#".
	// - M11: a tied chord under its symbol — an A4/D♯5/G♯5 chord tied to itself (two
	//   quarters) + half rest, under a "B13" symbol. The chord's upper tie bows up over
	//   the high top note (G♯5), so the symbol lifts to clear that arc, not just the
	//   noteheads — like M9 but the tie sits on a chord member, not a lone note.
	testCase('harmony.musicxml', 'harmony.png'),

	// Treble stave, 4/4: a chord symbol over a note that carries a grace note. The grace
	// note's group gives the main note a bogus near-origin bounding box; the harmony must
	// position from the notehead (noteTop), not that box — otherwise it flies to the top of
	// the page and defeats the top crop, leaving a huge blank margin above the system.
	// - M1: a "C" symbol over a B4 quarter preceded by a slashed D5 grace.
	testCase('harmony_grace.musicxml', 'harmony_grace.png'),

	// Treble stave, 4/4: guitar chord diagrams (fret boxes) from <harmony><frame>, each
	// drawn above the stave at its measure's first note, with the chord name as the box's
	// title. Four boring B4 quarters per measure so only the diagram varies. Strings run
	// low-E (left) to high-E (right); a string with no <frame-note> is muted (X above the
	// nut), <fret>0</fret> is an open ring, a fretted note is a filled dot.
	// - M1: open-position C major (first-fret 1, so the nut bar shows) — string 6 muted,
	//   strings 5/4/2 fretted (3/2/1), strings 3/1 open.
	// - M2: a movable G♯m7♭5 up the neck (first-fret 4, drawn as a "4" label left of the
	//   board instead of a nut) — strings 5 and 1 muted, the rest fretted.
	// - M3: a barre F major (first-fret 1) — a filled bar spans string 6 to string 1 at
	//   fret 1 (from a <barre> start/stop pair), with strings 5/4/3 fretted above it.
	// M4-9 are real jazz voicings (from "Bumpin' on Wes"). None carry <first-fret>, so the
	// box is laid out from the lowest fret (dots stay compact, no nut), and the position
	// label to the left shows the fret of the lowest-sounding string, drawn beside that
	// note's row.
	// - M4: Bm7, strings 4/3/2 at fret 7 → "7" beside the (only) top-row dots.
	// - M5: B7(♯5), strings 4/3/2/1 across frets 7-8 → "7" at top (lowest string-4 at 7).
	// - M6: Em11, strings 4/3/2/1 across frets 5-7 → "5" at top (lowest string-4 at 5).
	// - M7: GΔ7(sus2), strings 4/3/2/1 across frets 2-5 → box from fret 2, "5" at the bottom
	//   row beside string-4's dot.
	// - M8: F♯7(♯9), strings 5/4/3/2 across frets 8-10 → box from fret 8, "9" beside
	//   string-5's dot one row down.
	// - M9: G♯m7♭5, string 6 at fret 4, string 5 muted, strings 4/3/2 across frets 3-4 → box
	//   from fret 3, "4" beside string-6's dot one row down.
	testCase('chord_diagram.musicxml', 'chord_diagram.png'),

	// Treble stave, 4/4, two measures at a narrow 500px width: a chord diagram bound to a
	// note near the barline on each side, proving two adjacent diagrams don't collide even
	// when the music is packed tight. Diagrams sit at their lead note's x, so these two are
	// the closest a pair can get without sharing a note; the narrow width pulls those notes
	// close enough that the boxes would overlap if drawn at their raw note x.
	// - M1: four B4 quarters; a C-major fret box (X-muted string 6) above the LAST quarter.
	// - M2: four B4 quarters; a G-major fret box above the FIRST quarter.
	// The C box (anchored at M1's last beat) and the G box (anchored at M2's first beat)
	// are nudged apart so they clear each other — no overlapping boards or titles.
	testCase('chord_diagram_adjacent.musicxml', 'chord_diagram_adjacent.png', {
		layout: { type: 'standard', width: 500 },
	}),

	// Treble stave, 4/4: natural harmonics drawn as diamond noteheads (from
	// <harmonic><natural/>). The tab counterpart (angle-bracketed frets) is tab_harmonic.
	// - M1: single notes on E5 — an open diamond for the half note, then filled diamonds for
	//   the two quarters (the diamond fill follows duration), so only the notehead varies.
	// - M2: harmonic chords (open diamonds, every member a harmonic) — an E5/G5 dyad a third
	//   apart, then a C5/E5/G5 triad of three stacked diamonds.
	testCase('harmonic.musicxml', 'harmonic.png'),

	// Treble stave, 4/4: grace notes (small notes that steal no beat, drawn just left of
	// the main note they ornament). Every main note is a plain C5 quarter so only the
	// grace varies.
	// - M1: a C5 quarter preceded by an unslashed 16th D5 (appoggiatura); a slashed 16th
	//   D5 (acciaccatura, with a stroke through its flag); a beamed pair of 16ths (E5, D5)
	//   sharing one grace beam; then an unslashed 8th D5 (single flag).
	// - M2: grace notes carrying printed accidentals — a sharp D#5 grace, then a flat Db5
	//   grace, each before a C5 quarter; a half rest fills the rest of the bar.
	// - M3: a grace note slurred to its main note — an 8th D5 grace whose slur hugs underneath,
	//   running head-to-head down to the C5 quarter (stem down); a dotted-half rest fills the bar.
	// - M4: the same, but the main note's stem faces the other way — an 8th D5 grace slurred
	//   under to an E4 quarter (stem up); the slur still hugs the noteheads, clearing the up-stem.
	// - M5: a placement override — an 8th D5 grace forced above (placement="above"), so the slur
	//   arcs over the top to the C5 quarter instead of hugging under.
	// - M6: a multi-grace slur — a beamed grace pair (E5, D5) with one arc spanning from the first
	//   grace under to the C5 quarter.
	testCase('grace_notes.musicxml', 'grace_notes.png'),

	// Treble notation stave + 6-line TAB (transposed guitar), 4/4, Bb major: grace-note
	// measure-width allocation in a dense real-world excerpt (measures 6-8 of a lead sheet).
	// A measure with grace notes is allocated extra width to fit them, so the graces get
	// breathing room from the preceding note AND the real notes keep their spacing — instead
	// of the graces compressing the bar's other notes. M7 (no graces) is a narrow control
	// between the two grace-heavy bars.
	// - M6: Eb/Bb harmony; a half rest + eighth rest, a staccato Bb eighth, then a slashed
	//   F5 grace before a beamed G5 dotted-8th + F5/D5 32nds. The grace clears the staccato
	//   eighth and the 32nds stay evenly spaced (the bar widened to hold the grace).
	// - M7: Bb harmony; a lone F5 whole note tied into M8 — a plain narrow bar, no graces.
	// - M8: Eb/Bb harmony; F5 quarter (tie stop) + quarter rest, then two slashed grace
	//   chords, each just left of a quarter chord — stacked graces that get room to read. The
	//   F5 tie stop is wholly held, so the tab omits its fret (beat 1 blank); only the struck
	//   grace/quarter chords print frets.
	// - M9: a dotted chord followed by a grace. Beat 3 is a dotted-8th chord (D4/F4/Bb4, tie
	//   stop) whose three augmentation dots sit snug to the right of its noteheads — the grace
	//   cluster's lead clearance is skipped for a dotted preceding note, since padding its
	//   right would fling the dots out. The chord is flagged, not beamed (its only beam
	//   partner is the excluded grace); beat 4 beams the Bb4/C5 16ths. Beat 3's chord is wholly
	//   tied, so the tab omits all three of its frets (the held beat is blank).
	testCase('grace_spacing.musicxml', 'grace_spacing.png'),

	// Treble stave, 4/4: two voices sharing one stave across three measures of increasing
	// complexity, exercising <backup>/<forward> in different ways. V1 stems up, V2 stems
	// down. May wrap across systems.
	// - M1: V1 a mixed quarter/eighth line spanning the whole measure; V2 silent on beats 1
	//   and 4 via leading and trailing <forward> (no rests drawn). The silence is held open
	//   by invisible ghost tickables (src/notes.ts), so V2 starts aligned on beat 2
	//   (G4 under V1's F5) and its last note (G4 on beat 3.5) keeps a full beat of space to
	//   its right before V1's final C5 on beat 4.
	// - M2: a full <backup> to the measure start — V1 a dotted half (D5, dot to its right)
	//   then a quarter (C5); V2 four quarters (G4, A4, B4, A4) filling every beat.
	// - M3 (most complex): mid-measure <forward> gaps in both voices. V1 a flagged
	//   dotted-quarter F5 + eighth E5, a <forward> skipping beat 3, then a quarter D5. V2 a
	//   quarter G4, a <forward> skipping beat 2, two beamed eighths (A4, G4), then a quarter
	//   F4. The dotted notes carry their dotted duration in vexflow's tick count
	//   (src/notes.ts passes `dots` to the StaveNote), so V1's beat-3 note stays
	//   vertically aligned with V2's beat-3 note rather than drifting half a beat / a beat
	//   early.
	testCase('two_voices.musicxml', 'two_voices.png'),

	// Grand staff (treble over bass, braced), 4/4, three measures of a four-voice SATB
	// chorale — two voices on each stave to exercise voice distribution across staves. On
	// the treble stave voice 1 (soprano) stems up and voice 2 (alto) stems down; on the bass
	// stave voice 3 (tenor) stems up and voice 4 (bass) stems down. The per-stave end
	// barlines are suppressed in favor of stave connectors. May wrap across systems.
	// - M1: soprano E5 quarter, beamed F5/G5 eighths, A5 + G5 quarters; alto four quarters
	//   (C5 C5 D5 D5); tenor two half notes (G4, F4); bass a walking quarter line (C3 E3 F3 G3).
	// - M2-3: settle into quarter-quarter-half motion in every voice, the alto/tenor halves
	//   aligning vertically with the soprano/bass halves, closing on a C-major chord
	//   (E5/C5/G4/C3).
	testCase('voices_grand_staff.musicxml', 'voices_grand_staff.png'),

	// Sixteen identical C5 whole-note measures wrapping onto two systems (nine then seven
	// measures — each whole note floors at its minimum width) under the default layout. The
	// default 'system' measure numbering prints a "1" above the top system's first measure
	// and a "10" above the bottom system's first measure.
	testCase('system_break.musicxml', 'system_break.png'),

	// The same sixteen C5 whole-note measures, but with panoramic layout: all sixteen sit
	// on a single uninterrupted system (no system break).
	testCase('system_break.musicxml', 'layout_panoramic.png', {
		layout: { type: 'panoramic' },
	}),

	// The same two systems (nine then seven C5 whole-note measures), but with
	// minLastSystemFill lowered to 0 so the last system always justifies: the
	// seven bottom measures stretch to fill the full page width (flush right edge, wider
	// note spacing) instead of staying ragged at their natural width like in
	// system_break.png. The top nine-measure system is unchanged.
	// TODO: False positive: this baseline is created from the current render, so it may
	// accept an incorrect screenshot. The render suite is currently also blocked by an
	// unrelated in-progress `buildPedals` change from another agent. Once the tree builds,
	// confirm the bottom system spans the full page width, then run
	// `vex test last_system_stretch --update` only after confirming it.
	testCase('system_break.musicxml', 'last_system_stretch.png', {
		minLastSystemFill: 0,
	}),

	// The same two systems (nine then seven C5 whole-note measures), with a measure number
	// printed above the left edge of every measure (measureNumbering 'every'): "1"-"9"
	// across the top system, "10"-"16" across the bottom.
	testCase('system_break.musicxml', 'measure_numbering_every.png', {
		measureNumbering: 'every',
	}),

	// The same two systems with measure numbering turned off (measureNumbering
	// 'none'): no measure numbers anywhere, opting out of the 'system' default.
	testCase('system_break.musicxml', 'measure_numbering_none.png', {
		measureNumbering: 'none',
	}),

	// The same two systems with measureNumbering 'every-2': every 2nd measure plus every
	// system start. The every-2 cadence (0-based) falls on the odd measures 1, 3, 5, 7, 9,
	// 11, 13, 15 — so 1, 3, 5, 7, 9 on the top system and 11, 13, 15 on the bottom. The
	// second system's start, M10, is even and off the cadence, so it is numbered only
	// because it begins a system — the case that proves the "plus every system start" union.
	testCase('system_break.musicxml', 'measure_numbering_every_2.png', {
		measureNumbering: 'every-2',
	}),

	// The same two systems with measureNumbering 'every-3': every 3rd measure plus every
	// system start. The every-3 cadence falls on 1, 4, 7, 10, 13, 16 — so 1, 4, 7 on the
	// top system and 10, 13, 16 on the bottom. Here the second system's start (M10) already
	// lands on the cadence, so the "plus system start" union adds nothing visible (see
	// measure_numbering_every_2 for the case where it does).
	testCase('system_break.musicxml', 'measure_numbering_every_3.png', {
		measureNumbering: 'every-3',
	}),

	// Treble, 4/4, narrowed to 660px so it wraps to two systems of three measures each.
	// Tests vertical spacing between stacked systems: the first system's notes hang far
	// below its staff and the second system's notes rise far above its staff, the worst
	// case for a system clash. The two systems must stay clear of each other.
	// - M1-3 (system 1): very low quarter notes (C3) with many ledger lines below the staff.
	// - M4-6 (system 2): very high quarter notes (C7) with many ledger lines above the staff,
	//   which must not collide with system 1's low notes.
	testCase('system_spacing.musicxml', 'system_spacing.png', {
		layout: { type: 'standard', width: 660 },
	}),

	// Individual measures extracted from 'aloof' for focused testing.
	testCase('aloof_measure_1.musicxml', 'aloof_measure_1.png'),
	// Treble + 6-line TAB, A major, 4/4. Beat 1 strikes a chord that ties into beat 2;
	// the notation stave draws both noteheads joined by a tie arc, but the TAB omits the
	// held frets (beat 2 shows only the newly struck bass fret, not the tied 4/5) — a
	// re-struck string is shown, a held one is not. The two beamed eighth pairs carry
	// slurs that change fret (5→7, 4→5), so those are drawn as hammer/pull arcs in the tab.
	testCase('aloof_measure_2.musicxml', 'aloof_measure_2.png'),
	testCase('aloof_measure_7.musicxml', 'aloof_measure_7.png'),
	testCase('aloof_measure_14.musicxml', 'aloof_measure_14.png'),
	testCase('aloof_measure_15.musicxml', 'aloof_measure_15.png'),
];

for (const t of TEST_CASES) {
	test(t.screenshotFilename, async () => {
		const png = await render(t.musicXMLFilename, t.config);
		expect(png).toMatchScreenshot(t.screenshotFilename);
	});
}
