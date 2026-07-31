import { describe, expect, it } from 'bun:test';
import { render } from '../testing/harness';
import { testCase } from '../testing/test-case';

/*
 * Every case here is a hand-cut fixture proving one thing, ordered by increasing rendering
 * complexity. The coverage backlog that used to sit inline as TODO comments is closed: the
 * MusicXML features it tracked (print-object="no", <octave-shift>, the per-element color attribute,
 * percussion <unpitched>/<display-step>, after-graces, the mid-measure <barline>, <repeat
 * times>, the segno/coda glyphs, non-traditional key signatures, the mid-measure and
 * end-of-measure clef change, <multiple-rest>, the <bracket>/<dashes> spanners, per-voice
 * lyric rows, nested repeat blocks, the flat <part-group> symbols, per-staff <direction>
 * routing, <figured-bass>, cross-staff notes, the reduced percussion stave) all have cases of
 * their own now, score-level header text is won't-fix (see below), and whole real-world
 * scores are the score_*.musicxml block at the end.
 *
 * Names like `lilypond_42b-MultiVoice-MidMeasureClefChange.xml` in the comments below refer
 * to files in the upstream corpora these fixtures were cut from — the Unofficial MusicXML
 * Test Suite (lilypond_*) and OpenSheetMusicDisplay's test files. This repo used to vendor
 * them under tmp/ and no longer does; the names are kept because they are findable upstream
 * and say exactly which conformance case a comment is pointing at.
 *
 * When adding a case, remember the first `vex test` run WILL pass — a new screenshot is
 * accepted as its own baseline — so treat that pass as meaningless until the image has been
 * reviewed, then accept it with `vex test <name> --update`.
 *
 * A stave whose part declares no <clef> is engraved as treble, and a part that declares no
 * <time> anywhere opens in 4/4 — the defaults a reader assumes when nothing is printed. Many of
 * the minimal fixtures here state neither, so they still open with a treble clef and a 4/4
 * signature; the individual comments call that out only where it would otherwise read as a
 * contradiction. An explicit <senza-misura> is the one way to get a blank meter
 * (time_senza_misura), and neither default changes measure WIDTHS — an unmetered measure is
 * still sized by its own content (see ScoreReader.meterBeats).
 */
const TEST_CASES = [
	// A single empty 5-line stave: staff lines, start and end barlines, a treble clef and a
	// 4/4 signature, nothing else. None of the structure_* fixtures declares a <clef> or a
	// <time>, so every stave in this group opens with those two defaults (see the note above).
	testCase('structure_single_stave.musicxml', 'structure_single_stave.png'),

	// One part with two empty staves joined by a curly brace (grand staff), each opening with
	// its own treble clef and 4/4 — both defaults apply per stave, as a real grand staff's
	// printed clef and meter do.
	testCase('structure_grand_staff.musicxml', 'structure_grand_staff.png'),

	// Two separate single-stave parts stacked vertically, with no connecting brace. Ungrouped
	// parts don't share barlines either, so the end barline is two separate segments — only
	// the system's left line spans both staves.
	testCase('structure_two_parts.musicxml', 'structure_two_parts.png'),

	// A single-stave part above a two-stave (braced) part — mixed stave counts. The braced
	// part's own two staves share an end barline (that is what the brace means); the barline
	// still stops at the boundary between the two parts.
	testCase('structure_mixed_staves.musicxml', 'structure_mixed_staves.png'),

	// The four <group-symbol> values, each on its own FLAT (non-nested) <part-group>, so a
	// symbol can be read without the nesting offsets of the case below. Eight single-stave
	// parts in four consecutive pairs, one whole note each in common time, showPartLabels on.
	// Two label columns are reserved left of the staves: the part names right-aligned against
	// the staves, and each group's <group-name> right-aligned in its own column outside those,
	// vertically centered on the pair it spans.
	// - "Brace" (P1-2): a curly brace, and <group-barline>yes</group-barline> — the end
	//   barline runs through the pair.
	// - "Bracket" (P3-4): a square bracket with top and bottom curls, and
	//   <group-barline>no</group-barline> — the end barline STOPS between P3 and P4, so this
	//   pair reads as two separate instruments despite sharing a bracket.
	// - "Square" (P5-6): drawn as a bracket. vexflow has no squared-bracket connector, so
	//   'square' falls back to the nearest reading (see groupSymbol in engraving/staves.ts).
	//   It declares no <group-barline>, which reads as common barlines, so unlike the pair
	//   above its end barline runs through — the two brackets look alike, their barlines don't.
	// - "Line" (P7-8): a plain vertical line, no curls, and another 'no' breaking the barline
	//   between P7 and P8.
	// The barlines also break BETWEEN the groups: a barline joins parts only where a
	// <part-group> asks it to, and stops at every other part boundary. See barlineBreaks in
	// engraving/staves.ts.
	testCase(
		'structure_part_group_symbols.musicxml',
		'structure_part_group_symbols.png',
		{ showPartLabels: true },
	),

	// Five single-stave parts (one empty-ish measure each, a whole note in common time)
	// joined by nested <part-group> spans read off the <part-list>. The system's own left
	// line closes all five staves; each group's <group-symbol> draws outside it, the
	// innermost group hugging the system and each level out stepping further left.
	// - The outer group (number 1, <group-symbol>line</group-symbol>) spans parts 2-4 and
	//   draws as a plain vertical line, furthest from the staves.
	// - The inner group (number 2, <group-symbol>bracket</group-symbol>) spans parts 3-4 and
	//   draws as a square bracket with top and bottom curls, nested to its right.
	// - Parts 1 and 5 belong to no group, so nothing but the system line touches them.
	// Neither group declares a <group-barline>, which reads as common barlines, so the end
	// barline runs through parts 2-4 and stops at the 1|2 and 4|5 boundaries.
	testCase('structure_part_groups.musicxml', 'structure_part_groups.png'),

	// Score-level header text (<work-title>, <movement-title>,
	// <identification><creator>, <credit-words>) is deliberately NOT drawn, and has no
	// reader in src/. vexml engraves staff notation; the page heading belongs to the host
	// app, which already owns the surrounding page and its typography. Closed as won't-fix,
	// not deferred — don't add a fixture for it.

	// A guitar split across two single-stave parts — a treble notation stave (P1)
	// above a 6-line TAB stave (P2) — joined by a bracket plus the system's left line.
	// The notation+tab pairing is bracketed by convention even when the two staves
	// live in separate parts rather than one two-stave part. An ascending E4/F4/G4/A4
	// line on string 1 (frets 0/1/3/5) appears as notation on top and matching frets
	// below.
	// An all-tab score: a two-stave TAB part (P1) above a single-stave TAB part (P2),
	// three 6-line staves in all, each with its own stacked "TAB" label. No connector
	// joins P1's two staves — a tab+tab stack isn't a grand staff, so no brace — and all
	// three staves sit at the same vertical pitch. Every measure holds one whole note per
	// stave (frets 0/3/5 on string 1, top to bottom).
	// - M1: the bare stack — connector and spacing only.
	// - M2: a words direction whose <staff> is 2, so "lower staff" prints over P1's
	//   *lower* stave (the middle of the three), not over the part's top stave. The gap
	//   above that stave widens to hold the text — and so does the gap below it, which
	//   carries no text, so the three staves stay evenly spaced instead of the middle one
	//   drifting down toward the bottom one.
	// - M3: a <harmony> of root D + <kind>power</kind> with no text attribute over P1's
	//   top stave, printing "D5" — a chord symbol resolves against a tab note when the
	//   part has no notation stave, and the kind's conventional suffix fills in for the
	//   missing text.
	testCase('structure_tab_parts.musicxml', 'structure_tab_parts.png'),

	testCase(
		'structure_notation_and_tab_parts.musicxml',
		'structure_notation_and_tab_parts.png',
	),

	// A single-stave part above a two-stave (braced) part, each with its instrument
	// name printed to the left of the first system (showPartLabels): "Violin"
	// centered on the single top stave, "Piano" centered on the braced pair. All three
	// staves open with a treble clef (the fixture declares none).
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

	// Custom colors over a "Melody" part on a light pink background. A deep-blue notation color
	// recolors the engraved glyphs, a burnt-orange text color recolors the "Melody" part label
	// vexml draws, and backgroundColor paints the container behind them — all three contrasting
	// the light background, proving fonts.*.color and backgroundColor flow through to the render.
	// - M1: four beamed eighths (C5 D5 E5 F5) plus a G5 half note — noteheads, stems, the beam,
	//   staff, treble clef, and measure number all take the notation color.
	// - M2: quarter notes above (A5, C6) and below (C4, A3) the staff, so their ledger lines also
	//   take the notation color, not VexFlow's hardcoded gray.
	testCase('colors.musicxml', 'colors.png', {
		showPartLabels: true,
		backgroundColor: '#fce4ec',
		fonts: {
			notation: { family: 'Bravura', color: '#1d4ed8' },
			text: { family: 'Source Sans 3', color: '#c2410c' },
		},
	}),

	// Treble stave, 4/4, one measure (two quarters, two flagged eighths, a quarter
	// rest, all on C5), engraved with VexFlow's Petaluma font instead of the default
	// Bravura (fonts.notation). The notehead, stem flags, treble clef, and rest glyph
	// all take Petaluma's rounder, hand-drawn shapes — proving the notation FontConfig
	// option swaps the engraving font.
	testCase('font_notation_petaluma.musicxml', 'font_notation_petaluma.png', {
		fonts: { notation: { family: 'Petaluma' } },
	}),

	// A single empty stave with a treble (G) clef and the default 4/4 signature (the
	// fixture declares neither).
	testCase('clef_treble.musicxml', 'clef_treble.png'),

	// A treble (G) clef carrying a <clef-octave-change> of -1 (treble-8vb, the guitar/tenor
	// clef): a small "8" numeral hangs below the clef glyph, and the octave shift moves every
	// notehead up an octave.
	// - M1: an E2/E3/E4 whole-note chord sits an octave higher than it would on a plain
	//   treble clef — E4 near the top of the staff, E3 on the bottom line, E2 two ledger
	//   lines below — instead of E4 on the bottom line with E2 far beneath it.
	// - M2: two voices with no <stem> elements (a guitar transcription figure): V1's beamed
	//   16th pairs sit above the staff on ledger lines (written G5/B5) with stems up and
	//   beams above; V2 stems down — a quarter on the bottom line (written E4), then an
	//   x-notehead 16th two ledger lines below (written E3) beamed to a dotted eighth back
	//   on the bottom line, beam below the staff, then a half rest. The voices stay clear
	//   of each other; auto-stemming both voices down would slash V1's beams through V2.
	testCase('clef_treble_octave.musicxml', 'clef_treble_octave.png'),

	// Grand staff: treble clef on the upper stave, bass clef on the lower, joined by a
	// brace, each stave taking the default 4/4 (the fixture states no <time>).
	testCase('clef_treble_bass.musicxml', 'clef_treble_bass.png'),

	// A 6-line tablature stave with a stacked "TAB" label at the left. With no
	// other stave to connect to, the lone TAB stave draws its own begin barline.
	testCase('clef_tab_6_string.musicxml', 'clef_tab_6_string.png'),

	// A 4-line tablature stave with a stacked "TAB" label at the left. With no
	// other stave to connect to, the lone TAB stave draws its own begin barline.
	testCase('clef_tab_4_string.musicxml', 'clef_tab_4_string.png'),

	// A 6-line tablature stave whose <clef> is an octave-down treble, not TAB — the stave
	// is marked as tablature only by the six <staff-tuning>s in <staff-details>, which is
	// how some exporters write guitar tab. It must still render as TAB: stacked "TAB"
	// label, six lines, its own begin barline, and frets 0/1/3/5 on string 1 (an ascending
	// E4/F4/G4/A4) drawn as numbers on the top line rather than noteheads on a treble staff.
	testCase('clef_tab_staff_tuning.musicxml', 'clef_tab_staff_tuning.png'),

	// A treble notation stave above a 6-line TAB stave, joined by a bracket (the
	// notation+tab convention, applied automatically with no <part-symbol> declared).
	// 3-sharp key and 4/4 time: both print on the notation stave only — the TAB stave
	// shows neither key signature nor time signature, just its stacked "TAB" glyph.
	testCase('clef_notation_and_tab.musicxml', 'clef_notation_and_tab.png'),

	// The same notation-over-TAB pairing, but with the six <staff-tuning>s copied onto BOTH
	// staves the way Guitar Pro exports them — on the treble notation staff they are noise,
	// and only the TAB staff declares <staff-lines>6. Staff 1 must still render as a 5-line
	// treble stave (G clef, 3-sharp key, 4/4 meter, E4 and A4 halves); staff 2 is the 6-line
	// TAB showing the same two notes as frets 0 and 5 on string 1. Tuning alone must not make
	// a staff tablature — clef_tab_staff_tuning above is the case where it legitimately does,
	// and it declares <staff-lines> too.
	testCase(
		'clef_notation_and_tab_tuned.musicxml',
		'clef_notation_and_tab_tuned.png',
	),

	// Guitar: a treble notation stave over a 6-line TAB stave joined by a bracket, here
	// stated explicitly via <part-symbol>bracket</part-symbol> (the same connector the
	// pairing gets by default). 4/4, an ascending line on string 1 — notation E4/F4/G4/A4
	// quarters sitting on the treble staff, with the matching TAB frets 0/1/3/5 below,
	// proving the fret -> pitch mapping.
	testCase(
		'clef_notation_and_tab_bracket.musicxml',
		'clef_notation_and_tab_bracket.png',
	),

	// One system, 4/4: a clef change in every measure, each redrawn at the measure's left
	// edge at the smaller "change clef" size (the way key.musicxml M2 redraws a changed
	// key). Every measure holds one C4 whole note, so only the clef varies and the notehead
	// moves to the staff position each clef gives that one pitch.
	// - M1: opens the system with a full-size treble clef (G/2), common time, no key
	//   signature; C4 sits one ledger line below the stave.
	// - M2: alto clef (C/3) — C4 hangs one position below the middle line.
	// - M3: tenor clef (C/4) — C4 drops to the second space from the bottom.
	// - M4: bass clef (F/4) — C4 rides the second space from the top.
	// - M5: percussion clef (the two vertical bars); the note takes its default position.
	// - M6: treble clef with <clef-octave-change>-1 — the same G/2 glyph with a small "8"
	//   under it, so the note draws where M1's did.
	testCase('clef_c.musicxml', 'clef_c.png'),

	// Treble stave, 4/4: a clef change written INSIDE a measure rather than at its head, drawn
	// as a small clef glyph inline between the notes it falls between. Every note in the
	// fixture is a C4 quarter, so the clef is the only thing that can move the row — one
	// ledger line BELOW the stave in treble, one ledger line ABOVE it in bass.
	// - M1: opens treble (full-size clef, 4/4); after the second quarter a small bass clef
	//   prints between the notes, and the last two quarters jump from below the stave to
	//   above it. The measure widens to hold the glyph instead of it landing on a notehead.
	// - M2: still bass, and NO clef is reprinted at the barline — the change was already
	//   stated inside M1.
	// - M3: four quarters in bass, then a small treble clef after the last one and before the
	//   end barline — the courtesy clef announcing the next measure.
	// - M4: treble, again with no clef reprinted; its quarters sit back below the stave.
	// ponytail: the glyph rides on the FIRST voice only (a second copy per voice would redraw
	// the same clef at the same x), while the change re-aims every voice's notes. A <backup>
	// is not rewound when timing the change, the same limit midBarlinesOf documents — see
	// lilypond_42b-MultiVoice-MidMeasureClefChange.xml for the case that would need it.
	// See also in_measure_clefs.xml, clef_end_measure.xml,
	// end_measure_clefs_staffentry_bbox.xml.
	testCase('clef_mid_measure.musicxml', 'clef_mid_measure.png'),

	// A percussion stave, 4/4: <unpitched> notes, which carry no <pitch> at all. Their
	// <display-step>/<display-octave> pair is a staff POSITION rather than a sounding note,
	// and their <notehead> names the drum — the two are independent, so each measure varies
	// exactly one of them. Positions resolve against the percussion clef, which shares
	// treble's line mapping (E4 = bottom line, F5 = top), so the stave opens with the two
	// vertical bars and no key signature.
	// - M1: four quarters at four display positions and the DEFAULT notehead — E4, G4, B4,
	//   D5 — a staircase up alternate lines (bottom, second, middle, fourth). Without
	//   <display-step> all four would stack on one line.
	// - M2: four quarters all at F5 (the top line) with four different <notehead> values —
	//   x, circle-x, diamond, triangle — so only the glyph changes, not the row.
	// - M3: the two combined into a realistic drumset chord, struck twice: kick (E4, default
	//   head), snare (C5, default head) and hi-hat (G5, x head) on one stem, each member
	//   keeping its own row and its own glyph.
	testCase('percussion_display_step.musicxml', 'percussion_display_step.png'),

	// Percussion on a REDUCED stave (lilypond_73a-Percussion M1-2): three single-stave parts
	// bracketed together, over two measures of 4/4, with no key signature anywhere.
	// - Part 1 is an ordinary bass-clef 5-line stave: an E3 whole note tied across the
	//   barline into an E3 half, then an A2 half.
	// - Part 2 is a 5-line PERCUSSION stave (the two vertical bars, no key signature),
	//   carrying <unpitched> notes at display positions E5, C5 and D5: a dotted half and a
	//   quarter in M1, a whole note in M2.
	// - Part 3 is the same percussion clef on a <staff-lines>1</staff-lines> stave. Its one
	//   line is CENTERED on the row a 5-line stave would fill — where the middle line goes,
	//   not the top one — with the percussion clef straddling it and the 4/4 centered on it,
	//   the way MuseScore and OSMD both draw a reduced stave. Its F4/F4/E4 notes keep the
	//   positions their display steps give them on a full stave, so they sit just below the
	//   line (F4 a space and a half under it, E4 two spaces) with their stems up through it.
	//   vexml draws no ledger lines out to them: vexflow measures ledgers off a fixed
	//   five-line frame, so a reduced stave never gets any. MuseScore does draw them here.
	// See also drumset.xml, tutorial_percussion.xml.
	testCase('clef_percussion.musicxml', 'clef_percussion.png'),

	// <staff-details><staff-lines> on NON-tab staves: two single-stave parts joined by a
	// bracket, neither declaring a clef or time signature — so each opens with the default
	// treble clef and 4/4 — over three measures. The top part is a 1-line stave
	// throughout, holding one D5 whole note per measure sitting in the space just above its
	// lone line, with the treble clef curled around that line. The bottom part changes line
	// count at every measure, so the three measures show three different staves under one
	// unbroken row of notes.
	// - M1: bottom part at <staff-lines>5</staff-lines> — an ordinary 5-line stave, one G4
	//   whole note.
	// - M2: 4 lines — the four sit a half space lower than M1's top four, centered on the
	//   same band; two G4 half notes, stems up.
	// - M3: 2 lines — the middle pair of the band; two G4 half notes hanging below them.
	// A reduced stave is CENTERED on the row a 5-line stave would fill (see clef_percussion),
	// and every note keeps the vertical position its pitch and clef give it on a full stave,
	// so the notes do not move when the count changes — only the lines around them do.
	// A count that changes MID-measure is still unsupported: vexml reads <attributes> at the
	// measure start (the same limit clef_mid_measure works around above), so this fixture puts
	// M3's change at the barline rather than after its first note, where lilypond_14a had it.
	testCase('staff_details_lines.musicxml', 'staff_details_lines.png'),

	// One system, treble 4/4: key signatures and a mid-system key change. Each measure
	// holds one C5 whole note.
	// - M1: opens the system with a treble clef, a 3-sharp key signature (F#, C#, G#),
	//   and a 4/4 time signature.
	// - M2: changes the key to 2 flats (Bb, Eb) — only the key signature is redrawn at the
	//   change (the clef and time signature are NOT repeated), and because the sharps flip
	//   to flats all three are cancelled first: three naturals (F, C, G) then the two flats.
	// - M3: continues in 2 flats with no key signature redrawn.
	// - M4: changes to G# minor (5 sharps) — a minor key whose bare tonic 'G#' is not a
	//   valid vexflow key spec, so it renders via the 'G#m' minor spec instead of throwing.
	//   The flats flip back to sharps, so two naturals cancel them ahead of the five sharps.
	testCase('key.musicxml', 'key.png'),

	// Treble stave, common time: the church modes. Every <key> carries the same
	// <fifths>2</fifths> under a different <mode>, and each quarter is a G4 whose lyric names
	// the mode it sits under — so the signature must print two sharps (F#, C#) throughout and
	// never change. The mode is a label, not an accidental count: <fifths> alone decides the
	// signature. This guards against a mode string leaking into the vexflow key spec, the
	// failure key.musicxml M4 documents for 'G#' vs 'G#m'.
	// - M1: major, minor, ionian, dorian — the two sharps drawn once at the system start.
	// - M2: phrygian, lydian, mixolydian, aeolian — no signature redrawn, the key is unchanged.
	// - M3: locrian; wraps to a second system, which reprints the same two sharps.
	testCase('key_modes.musicxml', 'key_modes.png'),

	// Treble stave, 2/4: non-traditional key signatures — <key-step>/<key-alter> pairs instead
	// of <fifths>, which is how microtonal and modal-jazz scores notate one. The accidentals
	// print in the order the <key> lists them, not in circle-of-fifths order, and each sits at
	// the staff position its named step occupies. One C4 half note per measure (on its ledger
	// line under the stave), so only the signature varies.
	// - M1: F♯, A♭, B♭ with no <key-octave>, so each takes the highest position that still
	//   lands on the stave — F♯ on the top line, A♭ in the second space from the bottom, B♭ on
	//   the middle line. Those are exactly the rows the traditional signatures use, so an
	//   unpinned custom signature reads like an ordinary one.
	// - M2: a mid-system change to C♭♭, G♯♯, D♭, B♯, F♮, each pinned by a <key-octave> (2, 3,
	//   4, 5, 6). The signature therefore climbs the page rather than sitting in a band: the
	//   double-flat hangs well below the stave, the double-sharp ("x") just under it, the flat
	//   inside it, and the sharp and natural above it. The five glyphs still march left to
	//   right in list order and the measure's note follows clear of the last one.
	// ponytail: the placement rule is "highest position on the stave", which matches every
	// traditional FLAT and most sharps but not G♯ — a <fifths> signature draws that one above
	// the top line, and an unpinned custom G♯ lands on the G inside the stave instead. Nothing
	// grows the page crop for a signature that reaches far off the stave either; M2's spread is
	// held by the ordinary page margins.
	// See also lilypond_13d-KeySignatures-Microtones.xml.
	testCase('key_non_traditional.musicxml', 'key_non_traditional.png'),

	// One system, treble: time signatures and mid-system meter changes.
	// - M1: opens the system with a treble clef and common time (the "C" symbol = 4/4);
	//   four C5 quarters.
	// - M2: changes the meter to cut time (the "¢" symbol = 2/2) — only the new time
	//   signature is redrawn (the clef is NOT repeated); two C5 half notes.
	// - M3: changes the meter to a numeric 3/4 (stacked numerals); three C5 quarters.
	// - M4: continues in 3/4 with no time signature redrawn; three C5 quarters.
	testCase('time.musicxml', 'time.png'),

	// Treble stave: additive (compound) meters, whose numerator sums the groups the bar beats
	// in. The terms are summed, not read as one number — "3+2" through Number() is NaN, which
	// would silently drop the meter length to 0 and with it the measure's trailing padding.
	// - M1: 3+2/8 — the numerator prints as "3+2" over a single "8"; five eighths beamed 3
	//   then 2, matching the grouping the signature names.
	// - M2: 5+3+1/4 — a three-term numerator over "4". The measure holds 8 of its 9 beats (a
	//   whole, a quarter, a dotted half), so the missing beat is reserved as blank space
	//   before the end barline rather than the last note being justified flush against it.
	// - <time symbol="single-number"> is covered below; several pairs printed side by side
	//   (2/4 + 3/8) is not — vexflow's TimeSignature reads only the first two '/'-separated
	//   groups, so that form needs its own glyph work before a fixture is worth adding.
	testCase('time_compound.musicxml', 'time_compound.png'),

	// Treble stave, <time symbol="single-number">: three beamed eighths under a signature that
	// prints the beat count alone — one large "3" centered between the lines the stacked
	// numerals would occupy, with no "8" beneath it.
	// ponytail: <time symbol="note"> and symbol="dotted-note" (the beat drawn as a note glyph)
	// still fall through to the stacked fraction; no fixture reaches them.
	testCase('time_single_number.musicxml', 'time_single_number.png'),

	// Treble stave, <senza-misura> (unmetered): three beamed eighths with NO time signature
	// glyph at all, the clef running straight into the first note. The measure is sized from
	// its own content, since there is no meter to pad it out to. This is the one way to get a
	// blank meter: a score that simply OMITS <time> prints an assumed 4/4 instead (see
	// clef_treble and the structure_* cases), so declaring "unmetered" and saying nothing are
	// deliberately different renders.
	testCase('time_senza_misura.musicxml', 'time_senza_misura.png'),

	// Treble stave, 4/4: single-note rendering — durations then stem direction.
	// - M1: a whole note (C5).
	// - M2: a half, quarter, eighth, sixteenth, then two thirty-seconds on C5 (increasing
	//   flag counts).
	// - M3: stem direction by staff position (no <stem>) — the treble middle line is B4,
	//   so E4 and G4 stem up while B4 and D5 stem down.
	// - M4: the same four pitches with an explicit <stem> overriding each position default
	//   — E4 down, G4 down, B4 up, D5 up.
	// - M5: the same four pitches with <stem>none</stem> — four bare filled noteheads
	//   ascending E4 (bottom line) to D5, with no stems at all.
	// - M6: eight C5 eighths with <stem>none</stem> — bare noteheads, no stems and no flags,
	//   evenly spaced across the measure.
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

	// Treble stave, 4/4: the rest counterpart of note.musicxml's durations.
	// - M1: a whole rest, centered horizontally in the measure (full-measure-rest convention).
	// - M2: half, quarter, eighth, sixteenth, then two thirty-second rests.
	// - M3: a rest carrying only a <duration> and no <type> — the spacer rest Finale writes to
	//   hold a voice open. Its duration fills the bar, so it draws as a whole rest centered in
	//   the measure, identical to M1, rather than falling back to a left-aligned quarter.
	testCase('rest.musicxml', 'rest.png'),

	// Treble stave, 5/4: five quarter rests, identical but for where they are displayed. The
	// first carries a bare <rest/> and takes the default centered position; the other four add
	// <display-step>/<display-octave>, which name a staff POSITION rather than a pitch, so the
	// row steps to visibly different heights — E4 (bottom line), F5 (top line), A3 (below the
	// stave) and C6 (above it). Rests take no ledger lines, so the outer two float free.
	// Pinning a rest this way is how multi-voice writing pushes two voices' rests apart; see
	// the rest-placement corpus in rest_positioning_*.xml for the realistic version (two
	// voices, C clef, 8th/16th rests), which deserves its own case.
	testCase('rest_pitched.musicxml', 'rest_pitched.png'),

	// Treble stave, 4/4: <measure-style><multiple-rest>, the consolidated multi-bar rest. A run
	// of N resting bars collapses into ONE wide measure holding a thick horizontal bar with
	// serifed ends, its bar count centered above the stave. measureNumbering is 'every' so the
	// collapsed bars can be seen to be skipped rather than merely unlabelled.
	// - M1-3: a 3-measure multirest, numbered "1" — one measure column, not three, opening the
	//   system with the treble clef and 4/4.
	// - M4: four ordinary B4 quarters, numbered "4" — the run ends and normal engraving
	//   resumes, so the next printed number jumps from 1 to 4.
	// - M5-16: a 12-measure multirest, numbered "5", with a two-digit count above its bar. It
	//   closes the score, so the thin-thick end barline lands on the COLLAPSED measure rather
	//   than on the boxless M16 the run swallowed.
	// The document keeps every swallowed measure, so playback still counts the full rest; only
	// the layout drops them (see ScoreReader.multiRestsOf).
	// ponytail: a <multiple-rest>1 is left as an ordinary whole-rest bar — a one-bar multirest
	// draws the same glyph a plain whole rest does. A run only collapses when EVERY part and
	// staff declares it identically; a mixed score keeps its measures separate rather than
	// shearing the parts' columns apart.
	// See also multiple_rest_measures.xml, auto_multirest.xml, and
	// measure_numbers_xml_starting_at_3_with_multirest.xml.
	testCase('rest_multi_measure.musicxml', 'rest_multi_measure.png', {
		measureNumbering: 'every',
	}),

	// Treble stave, 4/4: every measure is four quarter notes stacked on one staff position
	// (C5, third space) so nothing but the accidental glyph left of the notehead varies.
	// - M1: sharp, flat, natural, then no accidental at all.
	// - M2: double-sharp (the "x"), double-flat (two flats), then the natural-sharp and
	//   natural-flat courtesy forms — a natural printed immediately left of the new sign.
	// - M3: the quarter-tone glyphs — quarter-sharp, three-quarters-sharp, quarter-flat,
	//   three-quarters-flat — from a fractional <alter> plus a microtonal <accidental> name.
	// - M4: the same flat four times, printed plain, then cautionary (round parentheses),
	//   then editorial (square brackets), then both flags at once — which brackets only, and
	//   does not nest parentheses inside brackets. In every case only the accidental is
	//   wrapped; the notehead is untouched (unlike notehead_parentheses.musicxml, which
	//   brackets the head).
	testCase('accidentals.musicxml', 'accidentals.png'),

	// Treble stave, common time: <divisions> changing partway through, which rescales
	// <duration> from that point on. Each measure writes the same rhythm twice, once at each
	// divisions value, so a misread scale would visibly bunch or stretch the second half.
	// - M1: four quarter notes, evenly spaced — the first two at divisions 1, the last two at
	//   divisions 8.
	// - M2: two half notes, evenly spaced — the first at divisions 8, the second at 38.
	testCase('divisions_change.musicxml', 'divisions_change.png'),

	// Grand staff, 4/4: <note print-object="no">, the hidden spacer notes exporters use to
	// hold a voice open. A hidden note keeps its tick (so the other voices stay aligned) but
	// draws no notehead, stem, flag or rest glyph. Its <lyric> still prints — that label is
	// the one part of a hidden note meant to be seen. The bass stave runs the same four
	// quarters (G3 A3 B3 C4) under every measure as a visible control; the treble carries two
	// voices, V1 a G4 quarter then a quarter+half rest, V2 an E4 quarter then the same rests.
	// - M1: nothing hidden — the reference measure. V1's four quarters G4/A4/B4/C5 with the
	//   lyric "VisibleSample" under the first.
	// - M2: every treble note and rest hidden in both voices, so the whole treble measure is
	//   blank except the lyric "InvisibleNotesAndRests" hanging off V2's hidden E4.
	// - M3: V1's G4 prints and its rests are hidden; V2's E4 is hidden and its rests print.
	//   So the measure reads G4, quarter rest, half rest — proving the visible rest survives
	//   even though the hidden voice holds an identical rest at the same tick.
	// - M4: the mirror of M3 with the rests hidden in both voices — only V2's E4 prints.
	// ponytail: hiding is read off the chord's lead note, so a chord with a mix of hidden and
	// visible members draws all of them, and print-object on a whole <staff>/<measure> is
	// ignored. No fixture reaches either yet.
	testCase('invisible_notes.musicxml', 'invisible_notes.png'),

	// A colored Beethoven lied (color.xml M1-2): a vocal treble stave over a piano grand
	// staff, 3/4 in three flats, with MusicXML's own color attribute on individual elements.
	// This is NOT colors.png, which tests the vexml-wide fonts.notation.color CONFIG — here the
	// score names the colors, and each element takes the one its own attribute gives it while
	// everything unnamed stays black.
	// - M1: vocal — a blue quarter rest (<note color>, which colors the whole glyph), then a
	//   Bb4 with a blue notehead on a magenta stem (<notehead color> and <stem color> naming
	//   different colors on one note), then a Bb4 with a dark-red notehead on a black stem.
	//   Piano RH — a four-note chord, spring-green and violet heads among two black ones, on
	//   one red stem, its ledger line left at the default gray because no <note color> asks
	//   otherwise. Piano LH — an Eb2/Eb3 pair, orange stem, salmon head on the upper note.
	// - M2: vocal — a dotted Bb4 (blue head, and the augmentation dot follows the head's
	//   color), then brown and dark-green eighths that each color head and stem together, then
	//   a magenta head under a black beam. The lyrics stay black throughout: no <lyric color>
	//   is given, so a syllable does not inherit the ink of the note it hangs from. Piano —
	//   gold and green heads in the RH chord, gray rests from <note color> on both staves.
	//   The LH's "Ped." sits below the low Eb2's ledger lines rather than through them (the
	//   pedal drops clear of the notes it spans — see pedal.png M3).
	// The LH staff also carries the source's own mid-measure clef changes — to treble after
	// M1's Eb2/Eb3 pair and back to bass after M2's first note — each printed as a small inline
	// clef, which is why its notes sit on the stave instead of hanging off it (clef_mid_measure).
	// ponytail: <beam color> and <lyric color> are ignored (each draws from its own element,
	// so each needs its own pass) — hence the black beam over the colored eighths in M2.
	// See also auto_custom_coloring_entchen.xml.
	testCase('note_color.musicxml', 'note_color.png'),

	// Treble stave, 4/4: metronome marks from <direction><metronome>, drawn above the
	// staff just right of the time signature ("<quarter note> = bpm").
	// - M1: an explicit quarter = 120 over four B4 quarters (mid-staff, no collision) —
	//   the mark sits one text line above the staff.
	// - M2: quarter = 120 over a high first note (C6, two ledger lines above) that reaches
	//   up into the mark's default band, so the mark is lifted clear of the notehead.
	// - M3: quarter = 110 sharing a measure with an "Em" chord symbol, both anchored at the
	//   same first note. The mark stacks above the symbol (chord symbol nearest the staff,
	//   tempo on top) instead of the two printing on top of each other.
	testCase('tempo.musicxml', 'tempo.png'),

	// Treble stave, common time: the metronome-mark variants tempo.musicxml does not reach.
	// Every measure is four plain C5 quarters carrying one <metronome> over its first note,
	// so only the mark above the stave varies.
	// - M1: a dotted beat unit — "dotted quarter = 100". The <beat-unit-dot/> follows its
	//   <beat-unit> as a sibling rather than nesting inside it, and prints as an augmentation
	//   dot right of the note glyph. A dotted unit is the norm in compound meter, and dropping
	//   the dot would state a tempo half again too slow.
	// - M2: the metric-modulation form — "dotted quarter = dotted half". Two <beat-unit>s
	//   under one <metronome> and no <per-minute>, so the mark states a RELATION and prints
	//   no number at all; each unit keeps its own dot.
	// - M3: <metronome parentheses="yes"> — "(dotted quarter = 77)", the whole mark wrapped
	//   in round parens, which is how a suggested (rather than authoritative) tempo reads.
	// - M4: the <metronome-note> form — a swing marking, "two BEAMED eighths = a quarter and
	//   an eighth under a 3 bracket". Note GROUPS either side of the "=", which the beat-unit
	//   form cannot state: the left pair draws as two stemmed noteheads joined by a beam (no
	//   flags), and the right pair as a quarter plus a flagged eighth under a tuplet bracket
	//   whose legs point down and whose "3" sits in a break in the line.
	// - M5: both marks in one <direction>, two <direction-type>s deep — "quarter = 60" then
	//   the same swing figure, side by side on one baseline with a wider gap between them
	//   than within either. This is what a real exporter writes at the head of a swung tune.
	// ponytail: playback still reads the mark's bpm as quarter-note bpm, so M1 sounds at 100
	// quarters rather than 150. That predates the dot (a plain "half = 100" was already read
	// this way) and belongs with the playback tempo path, not here. The M4/M5 swing figure is
	// notation only for the same reason — a <sound><swing> is what makes playback swing.
	testCase('tempo_beat_unit_dot.musicxml', 'tempo_beat_unit_dot.png'),

	// Treble stave, 4/4: a words direction from <direction><direction-type><words>, drawn
	// in italics above the staff at the x of the note it precedes. Four boring quarters per
	// measure so only the directive and the first note's height vary.
	// - M1: "*ritardando..." over B4 quarters (mid-staff, no collision) — the text sits one
	//   fixed gap above the staff.
	// - M2: "*ritardando..." over a high first note (C6, two ledger lines above) that reaches
	//   up into the text's default band, so the text is lifted clear of the notehead.
	// - M3: four directions, one before each B4 quarter ("p", "i", "m", "a" — guitar
	//   fingering). Each letter prints over its own note, spread across the measure on one
	//   row; anchoring them all at the measure's first note would stack them in a column.
	// - M4: placement="below" ("dolce") over B4 quarters — the text prints UNDER the staff,
	//   at the mirror of M1's fixed gap, clear of the down-stems hanging off the notes.
	// - M5: placement="below" over a low first note (E3, two ledger lines below) that hangs
	//   into the text's default band, so the text is pushed down clear of the noteheads —
	//   the below-stave mirror of M2's lift. Wraps to its own system.
	testCase('words.musicxml', 'words.png'),

	// Treble stave, common time: the full <dynamics> vocabulary, one marking per C4 quarter,
	// drawn as SMuFL glyphs (the bold-italic p/m/f/r/s/z forms, not ordinary text) BELOW the
	// staff — the engraving default these directions carry no explicit placement for. Every
	// note also carries a LYRIC naming the dynamic it should show, so each glyph can be read
	// against the plain-text syllable directly above it; the glyph row drops clear of the
	// lyric row rather than printing through it, and each marking centers on its own note.
	// - M3: p, pp, ppp, pppp — the piano ladder.
	// - M4: ppppp, pppppp, f, ff — the tail of the piano ladder into the forte one. The two
	//   six-letter markings are wide enough to reach their neighbor's column, so they stack
	//   onto their own rows below rather than overprinting.
	// - M5: fff, ffff, fffff, ffffff — the rest of the forte ladder, stacking the same way;
	//   the widest is pulled back inside the page edge instead of being clipped.
	// - M6: mp, mf, sf, sfp — the mezzo and sforzando forms.
	// - M7: sfpp, fp, rf, rfz — the compound sforzando/rinforzando forms.
	// - M8: sfz, sffz, fz, then an <other-dynamics> ("abc-ffz") — outside the SMuFL letter
	//   vocabulary, so it falls back to its literal text in the italic words face.
	testCase('dynamics.musicxml', 'dynamics.png'),

	// Treble stave, 3/4: <wedge> hairpins, one per measure, each spanning the measure's three
	// B4 quarters. Both directions carry placement="above", so both draw ABOVE the staff
	// (hairpins default below; the explicit placement wins) at a fixed gap over the top staff
	// line, running notehead to notehead from the start direction's note to the stop's.
	// - M4: a crescendo — an opening wedge, point at the first note, mouth at the third.
	// - M5: a diminuendo — the mirror, mouth at the first note closing to a point at the
	//   third.
	// ponytail: a hairpin that wraps across a system break isn't split into two partials the
	// way a tie or slur is; no fixture reaches that yet.
	testCase('wedges.musicxml', 'wedges.png'),

	// Treble stave, common time (lilypond_33d-Spanners-OctaveShifts M1): <octave-shift>, the
	// 8va/8vb/15ma/15mb ottava brackets. This is a DIFFERENT feature from <clef-octave-change>,
	// which clef_treble_octave covers. MusicXML carries SOUNDING pitch, so the point of the
	// case is that both halves happen: the label prints AND the notes it covers are drawn an
	// octave (or two) off where their <pitch> says, which is what puts them back on the staff.
	// Nine eighth notes, in four spans plus two unshifted notes at the front:
	// - A4 then C5, no shift — the reference pair, on the 2nd space and 3rd space.
	// - A6 under a size-15 type="down" shift: "15ma" above it, and the note drawn two octaves
	//   lower, back on the 2nd space beside the opening A4 instead of five ledger lines up.
	// - C3 and B2 under a size-15 type="up" shift: "15mb" below them, both drawn two octaves
	//   higher (3rd space and middle line).
	// - two A5s under a size-8 type="down" shift: "8va" above them, both drawn an octave lower
	//   onto the 2nd space.
	// - B3 and C4 under a size-8 type="up" shift: "8vb" below them, drawn an octave higher onto
	//   the middle line and 3rd space.
	// Both below-stave brackets are pushed a row further down than vexflow's default one text
	// line, because the notes they cover are beamed stem-down INTO that row: "15mb" clears the
	// long beam sloping under the first four notes and "8vb" clears the beam over its own two,
	// each resolved through the collision pipeline (DrawPass.clearOctaveBracket). The page's
	// bottom crop grows with them, so neither label is clipped.
	// ponytail: a shift whose start has no note after it in its own measure (or whose stop has
	// none before it) is dropped, and a span that wraps onto a later system would draw one
	// bracket running right-to-left rather than splitting the way buildTies splits a tie.
	// See also octave_shift_simple_piano.xml.
	testCase('octave_shift.musicxml', 'octave_shift.png'),

	// Treble stave, 3/4 (lilypond_33a-Spanners M10-15): the direction-type LINE spanners —
	// <bracket>, the analysis/phrase bracket, and <dashes>, the line that trails a "cresc.".
	// Every measure is three identical B4 quarters spanned end to end, so only the line above
	// the stave varies. All six spans sit on the same horizontal band, above the notes.
	// - M10: solid bracket, line-end="down" at both ends — a plain rule with a vertical hook
	//   dropping toward the stave at each end, the form that reads as enclosing the passage.
	// - M11: the same bracket with line-type="dashed" — dashed rule, both hooks still drawn
	//   (the hooks take the line's dash pattern too).
	// - M12: solid, start line-end="none" and stop "down" — no opening hook, closing hook only.
	// - M13: dashed, start "none" and stop "up" — the closing hook rises AWAY from the stave
	//   instead of dropping toward it, so it mirrors M12's.
	// - M14: solid, "none" at both ends — a bare horizontal rule with no hooks at all.
	// - M15: <dashes> on its own — a dashed line, never hooked.
	// - M16: the realistic <dashes>: a "cresc." words direction over the first note with the
	//   dashed line running past it to the last. The words print on their own row and the line
	//   on the band above, so the two do not overprint.
	// ponytail: line-end="arrow" draws the same tick "down" does (an arrowhead needs its own
	// path), line-type="wavy" falls back to solid, and a span wrapping onto a later system is
	// dropped rather than split. None has a fixture.
	testCase('direction_lines.musicxml', 'direction_lines.png'),

	// Navigation marks — <segno> and <coda> — on a real (braced) piano score in 4/4, five
	// measures wrapping onto two systems: four quarters per measure on the treble staff over a
	// whole rest on the bass staff, so only the marks above the top staff vary. Both signs draw
	// as SMuFL GLYPHS in the notation font, at their measure's left edge, above everything else
	// in that column and clear of it.
	// - M1: the segno (the crossed S) at the system's left edge, above the "♩=120" metronome
	//   mark and the measure number. The bass staff opens in treble and changes to bass at M2,
	//   which is the source score's own doing.
	// - M2: "to coda" as ordinary italic words over its first note — a words direction, not a
	//   glyph, and unchanged by this case.
	// - M3: "D.S. al Coda" the same way, over the note the direction precedes.
	// - M4: the coda (the crossed circle) at that measure's left edge, level with the segno.
	// - M5: an empty measure that wraps to a second system on its own.
	// SCOPE NOTE: the playback side is deliberately out of scope. Per the playback-cursor
	// design, jumps are repeats+voltas only and D.C./D.S. are deferred — so this case is about
	// ENGRAVING the marks, and cursor.test.ts has no case for them.
	// ponytail: a sign's own placement/offset attributes are ignored — it always prints at its
	// measure's left edge, where a player scanning for "the sign" looks.
	// See also stave_repetitions_coda_etc_positioning.xml for the placement stress version.
	testCase('navigation.musicxml', 'navigation.png'),

	// Treble stave, 4/4: <lyric> verses printed as text under the stave, centered on their
	// note. Boring B4 quarters throughout except M5, so only the syllables vary.
	// - M1: one verse of whole-word syllables ("Sing we now this"), one per quarter.
	// - M2: one word split across four notes ("Al- le- lu- ia") — the three opening/middle
	//   syllables carry a trailing hyphen, the closing one doesn't.
	// - M3: only the first and last quarter carry a syllable ("day", "end"); the two middle
	//   notes print nothing under them and keep their normal spacing.
	// - M4: three verses on each of two half notes, stacked under the stave in verse order
	//   (1 nearest the stave): "one/two/thir-" then "more/less/teen".
	// - M5: one verse over notes at wildly different pitches (C4, A5, E3 on ledger lines,
	//   C6 on ledger lines) — the syllables stay on a readable row under the stave instead
	//   of following each notehead's height.
	testCase('lyrics.musicxml', 'lyrics.png'),

	// Treble stave, common time: melismas — a syllable held over notes that carry no lyric of
	// their own, with a <lyric><extend/> drawing the extender line. Every note is a quarter and
	// the only slurs present are the ones the source uses to mark the held groups.
	// - M1: "Me-" under the first quarter, then three unsung notes (the third an A4/E5 chord)
	//   under one slur — the syllable has no <extend/>, so nothing trails it and the row holds
	//   just the one word.
	// - M2: "lis-" under a tied C5 pair (only the first note is sung), then "ma." with an
	//   <extend/> over the last two notes — a horizontal line runs on the lyric row from just
	//   past "ma." to the final E5, ending under that notehead rather than at the barline.
	// The extender sits on the verse's own baseline, so it stays clear of the noteheads above
	// it and of any lower verse.
	// ponytail: an extender stops at the end of its stave — a melisma crossing a barline or a
	// system break draws only its first segment. See drawMelismas.
	testCase('lyrics_melisma.musicxml', 'lyrics_melisma.png'),

	// Treble stave, common time: <elision> — several syllables sung on one note, which is how
	// Italian and French vocal writing sets a vowel run. Four C5 quarters, so only the text
	// under each notehead varies, and all four sit centered on their note as one unit.
	// - M1: "a" (one plain <text>); "b c" (two syllables written as one <text> with a space);
	//   "d e" (two <text> runs joined by an empty <elision/>); "f g h" (three runs, two
	//   elisions). The second and third must look the same — an empty <elision/> prints as a
	//   space, so the two spellings of the same lyric render identically.
	testCase('lyrics_elision.musicxml', 'lyrics_elision.png'),

	// Treble stave, 4/4: lyrics under a stave carrying TWO voices. Both voices number their
	// verses from 1, so the row a syllable lands on is its verse index offset by the rows the
	// voices before it already used — otherwise every voice's first verse claims row 0 and the
	// words print through each other. Voice 1 is B4 (stems up), voice 2 D4 (stems down), so
	// only the rhythm and the words vary. Every row sits under the lowest note on the stave.
	// - M1: both voices in four quarters, striking together. Where the two share a beat their
	//   syllables stack in one column — "one" over "un", "two" over "deux", and so on — rather
	//   than overprinting.
	// - M2: V1 in two halves ("slow- ly"), V2 in four quarters ("much more in haste"), so each
	//   row follows its OWN voice's noteheads: V2's "more" and "haste" sit alone on the lower
	//   row where V1 has no note under them.
	// - M3: V1 carries TWO verses ("first/second", "verse/verse") and V2 one ("low", "voice"),
	//   so V2's row starts below BOTH of V1's — three rows, proving the offset counts rows
	//   used, not voices.
	// See also lilypond_61c-Lyrics-Pianostaff.xml (lyrics between the two staves of a grand
	// staff) and lilypond_61e-Lyrics-Chords.xml.
	testCase('lyrics_two_voices.musicxml', 'lyrics_two_voices.png'),

	// Treble stave, 4/4: section headers from <direction><direction-type><rehearsal>, drawn
	// as boxed bold text at each measure's left edge, above everything else over the staff.
	// Four boring quarters per measure so only the label and the first note's height vary.
	// - M1: "A" at the system start — the box sits above the printed measure number "1"
	//   (which it would otherwise print on top of), left-aligned with the clef.
	// - M2: "B" over high C6 quarters (one ledger line above) whose noteheads reach into
	//   the box's default band, so the box is lifted clear of them.
	// - M3: "Chorus" — a multi-character label, so the box widens to fit the text instead
	//   of staying letter-sized.
	testCase('rehearsal.musicxml', 'rehearsal.png'),

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

	// The whole non-repeat <bar-style> vocabulary, one value per measure. Treble stave in
	// common time, twelve measures each holding a single whole rest, so the ONLY thing that
	// differs between them is the divider at their right edge. Twelve tiny measures wrap, so
	// M1-M7 sit on the first system and M8-M12 on the second — which also shows a styled
	// divider (M7's light-light) surviving a system break.
	// - M1: no <barline> at all — the default plain thin line.
	// - M2: regular — the same plain thin line, named explicitly.
	// - M3: dotted — a broken vertical line, 1px on and 3px off.
	// - M4: dashed — a broken line with longer strokes, 4px on and 4px off.
	// - M5: heavy — one thick (3px) line.
	// - M6: heavy-heavy — two thick lines side by side.
	// - M7: light-light — two thin lines (the thin double measures_light_light covers alone).
	// - M8: light-heavy — thin then thick, the ordinary end barline read left to right.
	// - M9: heavy-light — thick then thin, its mirror.
	// - M10: tick — a SHORT stroke straddling the top staff line only, half a space above it
	//   and half below, with nothing drawn across the rest of the stave.
	// - M11: short — a stroke covering the middle two spaces (second line to fourth), again
	//   leaving the top and bottom of the stave clear.
	// - M12: none — no line whatsoever, so the measure simply abuts what follows. Here it is
	//   also the last measure, so the stave ends open rather than on the usual thin-thick.
	// The thin/thick weights and offsets match the ones vexflow's own Barline draws with, so
	// a custom style sits flush with the plain dividers around it.
	// ponytail: on a MULTI-stave system only light-light and light-heavy change the connector
	// that ties the barline across staves — StaveConnector has no dotted/dashed/heavy member.
	// These styles are a single-stave idiom, so that gap is unexercised; see drawConnectors.
	// See also bar_lines.xml.
	testCase('barline_styles.musicxml', 'barline_styles.png'),

	// Treble stave, 4/4: a barline in the MIDDLE of a measure — <barline location="middle">,
	// how a divider that falls off the measure edge is written. One measure of four quarters
	// (C5, A4, F4, C5), so only the divider is remarkable.
	// - M1: a <bar-style>dotted</bar-style> divider between beats 2 and 3, drawn as the same
	//   dotted stroke barline_styles.musicxml documents, running the full stave height. It sits
	//   between the A4 and the F4 with room of its own — the measure is measured with the
	//   divider in it, so it never lands on a notehead. The measure is NOT split for numbering:
	//   there is one "1" over the system and one end barline.
	// The divider is a zero-duration vexflow BarNote in the measure's first voice, so the
	// formatter places it by tick like a note.
	// ponytail: it rides on the FIRST voice only — a second copy per voice would redraw the
	// same line — and ScoreReader.midBarlinesOf binds it to the last note in document order
	// rather than rewinding a <backup>, so a multi-voice measure could place it early.
	testCase('barline_mid_measure.musicxml', 'barline_mid_measure.png'),

	// Pickup (anacrusis) and incomplete measures — <measure implicit="yes">, which is short by
	// declaration rather than underfull by accident, so it is sized to the music it holds
	// instead of being padded out to the meter the way an ordinary short measure is (see
	// ScoreReader.meterFloor). One treble system in common time, four measures, a rising
	// E4-to-D5 line, no beams: every note is a quarter but the pickup's second.
	// - M0: the pickup, <measure implicit="yes" number="0"> — an E4 quarter and an E4 eighth,
	//   1.5 beats of a 4/4 bar. It carries the clef and time signature, prints no measure
	//   number (a pickup takes none), and spreads its two notes across its width in
	//   proportion to their durations, the quarter taking twice the eighth's room. Without
	//   the implicit exemption it reserved the missing 2.5 beats as blank space and both
	//   notes huddled against its left edge.
	// - M1: F4 + G4 quarters — the front half of a measure split in two, and NOT implicit, so
	//   it keeps the meter floor: 2 beats of music with the other 2 held as blank space. It
	//   closes on <bar-style>none</bar-style>, so NO divider is drawn between it and MX1 —
	//   the two halves are one measure notationally and abut with only their spacing between
	//   them (see barline_styles.musicxml for the rest of the vocabulary).
	// - MX1: <measure implicit="yes" number="X1">, the continuation of that split measure —
	//   A4 + B4 quarters filling their measure, again unnumbered.
	// - M2: C5 + D5 quarters and a quarter rest, 3 beats of 4 — the ordinary underfull
	//   measure the floor exists for, closing on a light-heavy barline.
	// See implicit_pickup_measure_width.xml (the OSMD bug report this fixes),
	// pickup_measure_double_rhythm.xml, lilypond_46f-IncompleteMeasures.xml and
	// lilypond_46e-PickupMeasure-SecondVoiceStartsLater.xml.
	testCase('pickup_measure.musicxml', 'pickup_measure.png'),

	// Treble stave, 4/4, one whole note per measure (M8 excepted): repeat barlines and volta
	// brackets. M1-7 ascend C5 through B5; M8-11 restart at C5 and ascend to F5. The playback order
	// the same barlines produce (M1 M2 M1 M2 M3 M4 M5 M3 M6 M7, then M8 M9 M8 M10 M8 M11)
	// is asserted in cursor.test.ts.
	// - M1: opens with a forward-repeat barline — thick-thin plus two dots, printed after
	//   the clef and time signature.
	// - M2: closes the first repeat block with a backward repeat (dots plus thin-thick).
	// - M3: opens the second repeat block with a forward repeat. It shares a boundary with
	//   M2's backward repeat, so the two print as one back-to-back sign (dots, thin-thick-
	//   thin, dots) rather than two separate barlines, and M3 draws no opening line of its own.
	// - M4-5: one volta bracket labelled "1." spanning both measures — a down-turned hook at
	//   M4's left edge, a plain line across the M4/M5 divider, and a hook at M5's right edge.
	//   M5 also closes the block with a backward repeat under the bracket's right hook.
	// - M6: a one-measure volta labelled "2." — a hook at its left edge, but the right end runs
	//   flat with no hook, because nothing jumps back from a final ending.
	// - M7: past the endings — a plain measure, no bracket and no repeat dots.
	// - M8: opens a third repeat block (forward repeat) that carries three endings. Its notes
	//   are a dotted half plus a quarter, and a "G♯m11" chord symbol sits over that last
	//   quarter — wide enough that the text overruns the barline into M9, where the "1."
	//   bracket starts. The symbol is lifted above the bracket line rather than printing
	//   across it and its label, the same way a chord symbol clears a volta in its own measure.
	// - M9: a one-measure volta labelled "1." (hooks at both ends) closing with a backward
	//   repeat under its right hook.
	// - M10: the same shape labelled "2." — bracket with both hooks, backward repeat beneath.
	// - M11: the final ending, labelled "3.", with no backward repeat. Unlike M6 its bracket
	//   still hooks at both ends: the score stops here, so there is no music for it to run on
	//   into. The measure closes with the piece's thin-thick end barline.
	testCase('repeats.musicxml', 'repeats.png'),

	// A treble stave over a 6-line TAB stave (bracketed, one part), 4/4, one whole note per
	// measure on string 1: repeat barlines belong to the measure, not to a stave, so every
	// repeat sign lines up on both staves and its bars run unbroken from the top of the
	// notation stave to the bottom of the TAB stave. The dots stay per stave, sitting in that
	// stave's two middle spaces — two staff spaces apart on the notation stave, wider on the
	// six-line TAB. Note the opening repeat is NOT at the staves' left edge: it prints after
	// the widest opening, the notation stave's clef and time signature, and the TAB stave
	// leaves that span blank rather than placing its own sign right after the "TAB" glyph.
	// - M1: opens with a forward repeat (thick-thin plus dots), fret 0 / E4.
	// - M2: closes the block with a backward repeat, fret 3 / G4.
	// - M3: reopens immediately, so the M2/M3 boundary prints one back-to-back sign — dots,
	//   thin-thick-thin, dots — spanning both staves. Fret 5 / A4.
	// - M4: fret 7 / B4, closing with a backward repeat instead of the usual end barline.
	testCase('repeats_notation_and_tab.musicxml', 'repeats_notation_and_tab.png'),

	// Treble stave, common time: a repeat played more than twice — <repeat direction="backward"
	// times="5"/>. Five measures of one whole rest each, so only the barlines and the label vary.
	// - M1: a plain opening measure, clef and common-time signature, no repeat sign.
	// - M2: opens the block with a forward repeat (thick-thin plus dots).
	// - M3: closes it with a backward repeat, and "5x" prints above the stave in the words face,
	//   RIGHT-aligned so the label ends on that closing barline rather than starting at it.
	//   Without it the same two dots would read as the usual two passes.
	// - M4-5: past the block, two plain measures, the last closing with the end barline.
	// A bare backward repeat (no `times`, or times="2") prints no label — the dots already say
	// twice. The playback half of the same attribute is asserted in cursor.test.ts: the block
	// expands to five passes, not two.
	testCase('repeats_multiple_times.musicxml', 'repeats_multiple_times.png'),

	// Treble stave, common time: a repeat block NESTED inside another, each with its own pair
	// of alternative endings. repeats.musicxml covers back-to-back blocks and up to three
	// endings but never nesting. One whole note per measure, ascending C5 to A5, so only the
	// barlines and brackets vary.
	// - M1: the OUTER block opens — forward repeat dots at the system's left edge.
	// - M2: the INNER block opens inside it — a second set of forward dots one barline later,
	//   so two opening signs stand back to back with a measure between them.
	// - M3: the inner block's first ending — a "1." bracket with a hook at each end, closing on
	//   backward repeat dots.
	// - M4: the inner block's second ending — a "2." bracket, no repeat sign; the inner block
	//   is done and the music runs on.
	// - M5: the OUTER block's first ending — a "1." bracket over the outer level, closing on
	//   its own backward repeat dots. The numbering restarting at 1 is what marks it as a new
	//   volta group rather than a third ending of M3's.
	// - M6: the outer block's second ending — a "2." bracket, closing the score.
	// The two levels' brackets never overlap in x, so nothing has to stack: MusicXML allows one
	// <ending> per barline, so an inner volta INSIDE an outer one is not expressible and vexml's
	// MeasureEnding is likewise one per measure. Nesting shows up as blocks, not as stacked
	// brackets.
	// The playback expansion is asserted separately in cursor.test.ts: M3-M6 are four consecutive
	// ending measures with no plain measure between them, so the numbering restarting at 1 on M5
	// is the only thing that separates the two volta groups (see ScoreReader-side endingFirstPass
	// and the pre-scan in src/playback/sequence-factory.ts).
	// See also lilypond_45e-Repeats-Nested-Alternatives.xml.
	testCase('repeats_nested.musicxml', 'repeats_nested.png'),

	// Gap measures (config.gaps) inserted into the two-whole-note fixture. Four measure
	// columns on one system: a leading labeled gap, then M1, then an unlabeled gap, then
	// M2. Measure numbering is 'every' to prove gaps are skipped: "1" over the second
	// column and "2" over the last, nothing over either gap.
	// - Gap 1 (leading): inherits the treble clef and 4/4 time from its right neighbor
	//   (drawn at the line start, left of the gap), then a wide empty stave (minWidth
	//   250) whose staff lines are dimmed by a translucent white fill, with
	//   "What are pitches?" centered on the stave.
	// - M1 ("1"): the original first measure — whole note C5.
	// - Gap 2: a narrower plain empty measure — no label, no fill, staff lines at full
	//   strength, no clef/key/time restated.
	// - M2 ("2"): the original second measure — whole note C5, thin-thick end barline.
	testCase('measures_two.musicxml', 'measures_gap.png', {
		measureNumbering: 'every',
		gaps: [
			{
				beforeMeasureIndex: 0,
				durationMs: 5000,
				label: 'What are pitches?',
				minWidth: 250,
				style: { fill: 'rgba(255, 255, 255, 0.65)' },
			},
			{ beforeMeasureIndex: 1, durationMs: 2000 },
		],
	}),

	// Beam variations across eleven 4/4 measures. Wraps across systems. A beam slants only
	// when its run moves consistently one way (chords count both their outer voices) and
	// is horizontal otherwise — M3, M5, M6, M9 are the flat cases.
	// - M1: simple beamed eighths in a small range — ascending, so both beams slant up.
	// - M2: beamed eighths leaping a wide range (steep beams, ledger lines above on
	//   D6/E6 and below on C4/D4).
	// - M3: two double-beamed sixteenth groups then a half rest. Each group is
	//   B4-C5-D5-C5, whose peak (D5) is interior, so both beams are FLAT.
	// - M4: one beat of triple-beamed 32nds then half + quarter rests.
	// - M5: mixed eighth+sixteenth beats with partial secondary beams. Both groups
	//   open and close on the same pitch (C5..C5, D5..D5), so both are FLAT.
	// - M6: a beamed eighth group spanning an internal eighth rest (rest carries a
	//   beam marker). The rest is ignored for slope, leaving C5-D5-C5 — FLAT.
	// - M7: beamed eighths in a low range (below the middle line) so the auto stem
	//   direction flips up.
	// - M8: a beam run spanning an eighth rest that carries NO beam markers; the rest
	//   sits under one continuous beam (C5-D5-rest-E5) rather than breaking it.
	// - M9: beam slope over chords, flat case — [C4+G4+C5] G4 C5 returns to a pitch the
	//   opening chord already sounded. Its bottom voice rises but its top voice dips and
	//   comes back, so the beam is FLAT despite the rising stem-side notes.
	// - M10: the same shape, slanted — two dyads (B4+E5 -> C5+F5) that overlap in pitch
	//   but whose voices BOTH step up, so this beam does slant.
	// - M11: a FLAT beam over an octave-alternating run (A4 A5 G4 G5) then a half rest.
	//   Stems point down to a beam below the stave; the low A4/G4 stems reach it at full
	//   standard length rather than being pulled short by the group's average stem tip.
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
		layout: { type: 'standard', referenceWidth: 360 },
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

	// Treble stave, 4/4: above-slurs whose two ends have opposing stem directions.
	// - M1: one slur over a zig-zag line C5, G4, D5, A4 straddling the middle line, so the
	//   stems alternate down-up-down-up. The slur arcs above, clear of both the noteheads
	//   and the up-stem tips, ending on the A4 stem tip — level with where it started.
	// - M2: two adjacent E4s slurred above, the first tailing a stem-down group beamed
	//   from G5, the second heading a stem-up group beamed to A5 so its stem spans the
	//   stave. Ending on that far stem tip would draw a near-vertical whip, so both ends
	//   sit on the noteheads: a short shallow bow between the two heads, under the beams.
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
		layout: { type: 'standard', referenceWidth: 350 },
	}),

	// Treble stave, 4/4: <slur line-type>. Every measure is the same four stem-down
	// quarters C5 D5 E5 F5 under one above-bowing slur, so only the stroke varies. A
	// dashed or dotted slur is drawn as a single stroked bezier rather than the filled
	// lens a solid one is, so it reads as a thinner, even-weight curve with no taper.
	// - M1: line-type="solid" — the ordinary filled slur, thick at the middle and
	//   tapering to points at both ends. The reference for the three below.
	// - M2: "dashed" — the same arc broken into even dashes.
	// - M3: "dotted" — the same arc as a run of dots.
	// - M4: "wavy" — falls back to solid, so M4 is drawn identically to M1 rather than
	//   the slur being dropped (see LINE_TYPE_DASH in src/engraving/score-reader.ts).
	// ponytail: the <slur> bezier/orientation attributes (bezier-x/y, orientation) are
	// still ignored — vexml computes its own control points to clear the spanned notes,
	// which an exporter's absolute offsets would fight rather than improve.
	testCase('slur_line_types.musicxml', 'slur_line_types.png'),

	// Treble stave, 4/4: sustain pedals from <direction><direction-type><pedal>, drawn
	// under the staff spanning four B4 quarters. The pedal goes down under the first
	// note and releases past the last.
	// - M1: a text pedal (line="no") — the "Ped" glyph under the first note, the "*"
	//   release glyph near the end barline.
	// - M2: a bracket pedal (line="yes") — an L-shaped bracket line under the staff from
	//   the first note to the last instead of the text glyphs.
	// - M3: a text pedal over four E3 quarters, an octave below the staff, whose noteheads
	//   and ledger lines hang down into the pedal's default band. The "Ped."/"*" glyphs are
	//   dropped clear below them instead of printing through the notes; M1's pedal, over
	//   mid-staff notes, stays at the default height as the control.
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
	// - M7: a three-string chord (strings 4/3/2) hammering into a single note on string 2
	//   (5 -> 7). Only string 2 is played by both, so exactly one arc draws — from the "5"
	//   to the "7" — and the 2/2 frets on strings 4 and 3 are left untied.
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
		layout: { type: 'standard', referenceWidth: 491 },
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

	// Notation stave over a 6-line TAB stave, 4/4: a slide INTO a note (an unpaired
	// <slide type="stop">, indeterminate origin). A half rest then a half note B4 (beat 3),
	// so the note sits mid-stave with room on both sides.
	// - M1: the note has no partner to slide from, so instead of a line it draws a short
	//   "/" tick rising up into the head on both staves — left of the notehead on the
	//   notation stave, and left of the fret as "/8" on the TAB stave (string 2, fret 8).
	testCase('slide_in.musicxml', 'slide_in.png'),

	// Notation stave over a 6-line TAB stave, 4/4: a slide OUT of a note (an unpaired
	// <slide type="start">, indeterminate target). Same layout as slide_in — a half rest
	// then a half note B4 (beat 3).
	// - M1: the "/" tick sits on the RIGHT of the note instead, rising up out of it — right
	//   of the notehead on the notation stave and right of the fret as "8/" on the TAB stave.
	testCase('slide_out.musicxml', 'slide_out.png'),

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
	// - M3: notes with no <technical> — only a pitch, so the string/fret is derived from the
	//   <staff-tuning> this fixture declares (standard guitar). An open dyad (strings 3/2,
	//   frets 0/0) whose third member is a bare E3, then a lone bare E3. Each bare note lands
	//   on the highest string that reaches it — "2" on string 4, not "0" on string 1 (see
	//   derivePosition in src/engraving/note-translator.ts). The chord's derived "2" stacks
	//   directly under the two explicit "0"s on the next line down.
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

	// Treble stave, 4/4: slash noteheads (<notehead>slash</notehead>) — rhythm slashes with the
	// oval head replaced by an oblique bar. Filled for quarter and shorter, open (outlined) for
	// half and whole. All on B4 (middle line) so only the head glyph and its fill vary.
	// - M1: four quarter slashes — filled bars with stems.
	// - M2: two half slashes — open bars with stems.
	// - M3: one whole slash — open bar, no stem.
	testCase('notehead_slash.musicxml', 'notehead_slash.png'),

	// Treble stave, 4/4: alternate notehead shapes drawn via vexflow's duration-aware key-suffix
	// codes. All on B4 (middle line); each measure holds two quarters (filled) then a half (open)
	// of one shape, so the filled-vs-open forms both show.
	// - M1: diamond heads.
	// - M2: point-up triangle heads.
	// - M3: circle-x heads.
	testCase('notehead_shapes.musicxml', 'notehead_shapes.png'),

	// Treble stave, common time: four <notehead> shapes and the `filled` attribute that
	// overrides each one's default fill. Every measure holds four quarter notes on rising
	// pitches — two taking the fill the duration implies (black, for a quarter), then two
	// marked filled="no" — so each measure shows the same shape solid and hollow side by
	// side, under a lyric naming it. Wraps to two systems, M1-3 above and M4 alone below.
	// - M1: slash heads — two solid oblique bars, then two hollow ones.
	// - M2: point-up triangles, solid then hollow.
	// - M3: diamonds, solid then hollow.
	// - M4: squares, solid then hollow.
	// NOTEHEAD_SUFFIX also maps inverted triangle, rectangle, slashed/back-slashed and the
	// do/re/mi/fa/so/la/ti shape-note heads, which no fixture pins yet.
	// ponytail: 'cross' (the plus-shaped head) and 'none' (no head, stem kept) still draw an
	// ordinary oval — vexflow codes neither, so each needs a post-build glyph override like
	// addSlashNoteheads. See also notehead_shapes.xml and
	// lilypond_22b-Staff-Notestyles.xml.
	testCase('notehead_shapes_extended.musicxml', 'notehead_shapes_extended.png'),

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
	// - M3: a triplet — a beamed eighth-note triplet ("3") then a dotted half. The three
	//   triplet frets sit under their three triplet noteheads, proving the tuplet's
	//   time-modification compresses the TAB stave the same as the notation stave.
	// - M4: a triplet opening on a held (tied-into) note — measure 25 of the jazz corpus.
	//   Beat 1 is an eighth + tied eighth (F4/frets 0,1); the tie carries into the triplet's
	//   first note, so the TAB omits that fret (no re-strike). The omitted note still owns the
	//   triplet's opening slot, so the two struck frets after it (G4/fret 3, A4/fret 5) stay
	//   compressed under their triplet noteheads instead of drifting right under the following
	//   quarter and rest.
	testCase('tab_notation_durations.musicxml', 'tab_notation_durations.png'),

	// Same fixture with tabStemPlacement: 'below' — the TAB stave now draws a rhythm stem (and a
	// flag on the eighths/sixteenths) hanging below each fret instead of bare numbers, mirroring
	// the notation stave's rhythm. Beams are still not drawn, so the triplet eighths in M3/M4
	// show individual flags rather than a beam.
	testCase(
		'tab_notation_durations.musicxml',
		'tab_notation_durations_stems_below.png',
		{ tabStemPlacement: 'below' },
	),

	// Same fixture with tabStemPlacement: 'above' — the stems and flags rise above each fret
	// instead of hanging below, the mirror image of the 'below' case.
	testCase(
		'tab_notation_durations.musicxml',
		'tab_notation_durations_stems_above.png',
		{ tabStemPlacement: 'above' },
	),

	// Same notation+tab fixture with showNotation: false — the treble notation stave (staff 1)
	// is dropped and only the 6-line TAB stave renders: the ascending frets 0/1/3/5 in each
	// measure's dotted/tuplet rhythm, with no notation stave above and no bracket (the pairing
	// is gone). As a now-lone stave it gets its own begin barline at each system start.
	testCase(
		'tab_notation_durations.musicxml',
		'tab_notation_durations_no_notation.png',
		{ showNotation: false },
	),

	// Same notation+tab fixture with showTabs: false — the mirror of the showNotation case:
	// the 6-line TAB stave (staff 2) is dropped and only the treble notation stave renders,
	// with the full dotted/tuplet rhythm across M1-M4, its clef/key/time, and no bracket (the
	// pairing is gone). As a now-lone notation stave it keeps standard barlines (no explicit
	// begin barline — that is a TAB-only quirk). Verified: the notation matches the top stave
	// of tab_notation_durations.png exactly.
	testCase(
		'tab_notation_durations.musicxml',
		'tab_notation_durations_no_tab.png',
		{ showTabs: false },
	),

	// Tuplets on C5. Every note here is stem-down with its beam under the noteheads, so each
	// tuplet mark sits BELOW the stave on the beam/stem side, the engraving default.
	// - M1: a beamed eighth-note triplet ("3"), a bracketed quarter-note triplet ("3"),
	//   then a plain quarter.
	// - M2: a beamed sixteenth-note sextuplet ("6" — the count alone, not the "6:4" ratio
	//   vexflow prints by default; MusicXML's default is show-number="actual"), a beamed
	//   eighth-note triplet ("3"), then a half note.
	testCase('tuplet_triplet.musicxml', 'tuplet_triplet.png'),

	// A tuplet inside another tuplet. Treble, 2/4, nine stem-down B4 eighths beamed 2+5+2, so
	// both brackets draw BELOW and only the nesting varies.
	// - M1: an outer <tuplet number="1"> spanning all nine notes prints "3" on a bracket
	//   running the width of the measure, and an inner <tuplet number="2"> over the middle
	//   five prints "5" on a shorter bracket nested between it and the notes. Neither number
	//   touches the other — vexflow's own nesting step is shorter than the numeral it centers
	//   on the bracket line, so the outer bracket takes an extra offset
	//   (TUPLET_NESTING_EXTRA_GAP). The inner group's <time-modification> is 15:4, the two
	//   ratios already multiplied out by the exporter, so the durations need no extra work.
	// OSMD engraves the same two nested spans. MuseScore instead flattens the file into three
	// side-by-side brackets ("3", "15", "3") off the <time-modification> alone, ignoring the
	// <tuplet> spans — its own reading, not a second opinion on this one.
	testCase('tuplet_nested.musicxml', 'tuplet_nested.png'),

	// Treble stave, common time: what a <tuplet> marker asks to be PRINTED, held apart from
	// the <time-modification> that governs the durations — every measure here compresses 3:2
	// and holds two unbeamed (flagged) triplets, three eighths then three dotted quarters, so
	// only the label changes measure to measure. Every note is a stem-down C5, so all six
	// tuplets draw below the stave, each with the bracket its bracket="yes" asks for.
	// Wraps to two systems, M1-3 above and M4 alone below.
	// - M1: no display attributes — the <time-modification> count alone, "3".
	// - M2: the same "3"; its <normal-type>breve</normal-type> changes what the ratio is
	//   measured in, not what is printed.
	// - M3: show-number="both" plus <tuplet-actual>/<tuplet-normal> numbers of 7 and 5, which
	//   override the 3:2 compression for display only — "7:5" over notes still spaced 3:2.
	// - M4: show-number="both" with tuplet-actual/normal that carry a <tuplet-type> but no
	//   <tuplet-number>, so the printed pair falls back to the time-modification: "3:2".
	// ponytail: show-type (the note-value glyph some publishers print beside the number, which
	// M3-M4 also ask for) is ignored — vexflow's Tuplet text is numerals only. See also
	// lilypond_23b-Tuplets-Styles.xml, lilypond_23f-Tuplets-DurationButNoBracket.xml,
	// and tuplet_placement.xml.
	testCase('tuplet_display.musicxml', 'tuplet_display.png'),

	// Treble stave, 4/4: staccato (dot), accent (>), tenuto (—), then staccatissimo
	// (wedge) — only the articulation varies within a measure; the measure sets the
	// stem direction.
	// - M1: four C5 quarters (stems down) — articulations sit above the noteheads.
	// - M2: four E4 quarters (stems up) — articulations sit below the noteheads.
	// - M3: a C5+G4 beamed eighth pair — the beam forces stems up (driven by the low
	//   G4), so the C5's staccato sits below its notehead, not above the beam.
	testCase('articulations.musicxml', 'articulations.png'),

	// Treble stave, 4/4 (lilypond_32a-Notations M3-6): the rest of the <articulations>
	// vocabulary, beyond the five articulations.musicxml covers. Every note is the same C5
	// quarter with a stem down, so the mark is the only thing that varies, and every note
	// carries a LYRIC naming the mark it should show — the screenshot states its own
	// expectations. Stems down puts every notehead-side mark above the notehead.
	// - M3: the four already-supported marks as a control — accent (">"), strong-accent (the
	//   marcato "^"), staccato (a dot), tenuto (a dash).
	// - M4: detached-legato (a dash with a dot under it), staccatissimo (a filled wedge on
	//   the notehead), spiccato (the same wedge shape, drawn clear above the staff), and
	//   scoop — the first of the jazz brush strokes, a curve rising into the LEFT of the
	//   notehead.
	// - M5: the other three brush strokes — plop curving down into the left of the notehead,
	//   doit curving up off its right, falloff curving down off its right — then a breath-mark
	//   comma above the staff.
	// - M6: a double-slash caesura above the staff, then stress and unstress above their
	//   noteheads, and a trailing quarter rest. The caesura and the breath-mark are the two
	//   marks that name a moment in the bar rather than a way of playing the note, so they sit
	//   above the staff whichever way the stem points instead of following the notehead-side
	//   rule the others do.
	// ponytail: an explicit placement="above|below" on an articulation is still ignored — the
	// side always comes from the stem. See articulation_staccato_placement_above.xml and
	// articulation_staccato_placement_below.xml; worth its own measure when it matters.
	testCase('articulations_extended.musicxml', 'articulations_extended.png'),

	// Treble stave, 4/4 (lilypond_32a-Notations M7-10): <notations><ornaments> on a notation
	// stave. Every note is the same C5 quarter, and every note is labelled with a lyric naming
	// the ornament it should show ("tr.", "turn", "mord.", ...), so the screenshot reads as its
	// own spec. Ornament glyphs sit above the notehead, just clear of the top staff line.
	// - M7: trill-mark (the "tr"), turn, delayed-turn (the same turn glyph, shifted right to
	//   sit between its note and the next — hence the gap over its own notehead), inverted-turn
	//   (the turn with the vertical stroke through it).
	// - M8: shake (a long trill wiggle), then three notes carrying a <wavy-line> chain — start,
	//   stop+start, stop — drawn as two wavy trill-extension lines above the stave, end to end
	//   over the second, third and fourth notes.
	// - M9: mordent (the wiggle WITH the vertical stroke) and inverted-mordent (the wiggle
	//   without it) — MusicXML names these the opposite way round from vexflow — then the
	//   schleifer (a wiggle with a rising tail), then a single-note tremolo, its three slashes
	//   crossing the stem below the notehead.
	// - M10: a turn with one <accidental-mark> (a natural above it), then a turn with two (a
	//   sharp above and a three-quarters-flat below), then a trailing quarter rest.
	// ponytail: an ornament's <accidental-mark> placement attribute is ignored — the first mark
	// goes over the glyph and the second under it, which is how the pair conventionally reads.
	// See also ornaments.xml and lilypond_33f-Trill-EndingOnGraceNote.xml.
	testCase('ornaments.musicxml', 'ornaments.png'),

	// Treble stave, 3/4: <ornaments><tremolo> — the slashes through a stem — and the tuplets
	// that carry them. Every note is an A4 or G4, so only the rhythm and the slashes vary.
	// - M1: three beamed 3:2 eighth-note triplets, each note staccato, each group bracketless
	//   with a "3" over its beam. No tremolo here — the control for M2's spacing.
	// - M2: three tremolo tuplets — a dotted-quarter G4 whose <tremolo>1</tremolo> draws one
	//   slash across its stem. Each is its own degenerate 3:2 tuplet (a <tuplet> start AND
	//   stop on the same note), which prints no bracket and no number: a single-note tuplet
	//   has nothing to span, and the slash is what tells a reader the note is subdivided.
	//   OSMD engraves this identically.
	// ponytail: only the single-note form draws. The type="start"/"stop" bowed-tremolo pair
	// (slashes BETWEEN two noteheads) needs a spanner — see the note in addOrnaments — and no
	// fixture reaches it; see tremelo_two_bars.xml when one does.
	testCase('tremolo.musicxml', 'tremolo.png'),

	// <notations><technical> on a NOTATION stave (the tab side of <technical> is covered by
	// tab_bend, tab_hammer_pull, tab_harmonic and tab_annotation). Treble, 4/4, one C5-ish
	// quarter per mark, each lyric-labelled with the mark it should show, wrapping one
	// measure to a system by the width the labels claim.
	// - M11: up-bow (the open "V") and down-bow (the filled bracket) above the stave, then
	//   two <harmonic> notes, which draw as DIAMOND noteheads rather than a mark — vexml
	//   engraves every harmonic that way (see harmonic.musicxml), so the "o" a natural
	//   harmonic could take instead is deliberately not drawn on top of it.
	// - M12: the remaining <harmonic> forms — artificial, and the base/touching/sounding
	//   pitch variants — all four likewise diamond noteheads, no extra mark.
	// - M13: the open-string ring and the thumb-position hook above the stave, then an EMPTY
	//   <fingering/>, which prints nothing at all, then "1".
	// - M14: fingerings "2", "3", "4", "5" — digits centered over their noteheads.
	// - M15: a <fingering> whose text is the word "something" (printed verbatim, and wide
	//   enough that the measure widens for it); a note carrying three fingerings — 5, a
	//   substitution 3 and an alternate 2 — joined into the one label "5-3(2)"; an empty
	//   <pluck/>, which prints nothing; and <pluck>a</pluck>, the right-hand finger letter,
	//   drawn like a fingering.
	// - M16: double-tongue (two dots), triple-tongue (three dots), the "+" of a stopped
	//   note, and the snap-pizzicato ring-and-stem, all above the stave.
	testCase('technical_marks.musicxml', 'technical_marks.png'),

	// The realistic fingering case: <technical><fingering> on CHORDS across a grand staff,
	// where the digits stack in chord order and stay clear of the noteheads and each other.
	// One braced two-stave part, 4/4, one whole-note chord per stave.
	// - M1: the treble chord E5/G5/C6 carries fingerings 1/3/5 with no placement, so they
	//   stack ABOVE it reading 5-3-1 downward — the digit nearest the stave (1) belongs to
	//   the chord member nearest it (E5). The bass chord C2/E2/G2 carries 4/2/1, each
	//   placement="below", so the column mirrors under the stave reading 1-2-4 downward,
	//   nearest-first again (1 on G2). Both columns clear the stave rather than sitting
	//   beside the noteheads — the engraving MuseScore and OSMD both give this file.
	testCase('fingering.musicxml', 'fingering.png'),

	// <technical><string> on a notation stave: the string's number drawn in a ring, stacked
	// in the same column as any fingering on that note and always OUTSIDE it. Treble 4/4,
	// boring G4 quarters, so only the marks vary.
	// - M1: one <string> per note, 4 through 1 — a single ring above each notehead and
	//   nothing else.
	// - M2: <string> plus <fingering> on every note (④/1, ③/2, ②/3, ①/4), the bare digit
	//   nearest the stave and the ring beyond it. The last two notes write the two elements
	//   in the opposite document order, which must not change the stacking.
	// - M3: two half-note chords whose every member carries both marks, so each column runs
	//   three digits then three rings: C5/E5/G5 (fingerings 1/2/3, strings 3/2/1) and the
	//   same on E4/G4/B4. The low chord is the case vexflow's own annotation stacking
	//   collapses — every mark on a note low in the stave lands on one row — so it pins that
	//   the column is built by the draw pass instead (DrawPass.pinTechnicals).
	testCase('string_numbers.musicxml', 'string_numbers.png'),

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

	// Treble stave, 4/4: <notations><non-arpeggiate> — the square bracket marking a chord to
	// be struck together, the explicit opposite of the wiggle arpeggio.musicxml covers. One
	// measure of seven identical C4/E5/G5 quarter chords, each labelled by a lyric with the
	// mark it carries, so only the stroke left of the noteheads varies. The arpeggiated
	// chords are the control: "normal" draws the plain wiggle, "up" and "down" the wiggle
	// with an arrowhead at that end.
	// - The 6th chord ("non-arp.") is the case under test — <non-arpeggiate type="bottom"> on
	//   its C4 and type="top" on its G5, with the middle E5 carrying no marker at all (which
	//   is how MusicXML spells the span). It draws as a vertical spine with a right-pointing
	//   hook at each end, overhanging the outer two noteheads by half a staff space the way
	//   the wiggle does.
	testCase('non_arpeggiate.musicxml', 'non_arpeggiate.png'),

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
	// - M12: a top-stave-space note under its symbol — four E5 quarters under an "Em7"
	//   symbol. E5 sits in the top space, just under the symbol's baseline (not above the
	//   staff like M4), so it falls in the symbol's padding band: the padded collision box
	//   reaches down to the notehead and nudges the symbol up off it, instead of the
	//   baseline sitting tight against the note.
	// - M13: two symbols in one measure — an "Em" over a B4 half note, then a "G" over a
	//   second B4 half note. The second <harmony> sits between the two notes, so its symbol
	//   prints above the beat-3 note rather than being dropped or stacked on the first.
	// - M14: a symbol over a bracketed tuplet — a C5 triplet (two beamed eighths + an eighth
	//   rest, so the group brackets rather than riding a beam) + dotted-half rest, under a
	//   "B♭7" symbol. The stems and beam point down, so buildTuplets places the bracket
	//   BELOW the stave (Tuplet.LOCATION_BOTTOM, under the beam) and the symbol has the
	//   above-stave band to itself — the two never share a band, so nothing has to be
	//   resolved through CollisionDetector. Reproduced from
	//   LP-21-Jazz-I-G6-Day-1-04-Exercise-3 M3, where MuseScore draws it the same way.
	//   ponytail: an above-stave tuplet bracket still isn't a collision obstacle, so a
	//   stem-UP tuplet under a chord symbol would overprint. No fixture reaches that.
	testCase('harmony.musicxml', 'harmony.png'),

	// Treble stave, 4/4: a chord symbol over a note that carries a grace note. The grace
	// note's group gives the main note a bogus near-origin bounding box; the collision
	// pipeline builds obstacles from the notehead (noteTop), not that box — otherwise the
	// symbol flies to the top of the page and defeats the top crop, leaving a huge blank
	// margin above the system. The symbol also lifts a hair to clear the grace's stem tip.
	// - M1: a "C" symbol over a B4 quarter preceded by a slashed D5 grace.
	testCase('harmony_grace.musicxml', 'harmony_grace.png'),

	// The <kind> vocabulary, one kind per note: four measures of four C4 quarters, each with a
	// <harmony> above spelling the kind's conventional suffix (HARMONY_KIND_SUFFIX in
	// src/engraving/score-reader.ts) and a lyric below naming the kind, so the two can be read
	// against each other without opening the fixture. harmony.musicxml only exercises major,
	// dominant, minor and power, so this is what pins the rest of that table against a typo.
	// - M1: C, Cm, C+, Cdim (major, minor, augmented, diminished).
	// - M2: C7, Cmaj7, Cm7, Cdim7 (the sevenths).
	// - M3: C+7, Cm7♭5, CmMaj7, C6 — the half-diminished suffix carries a real flat sign, not
	//   a lowercase b.
	// - M4: Cm6, C9, Cmaj9, Cm9; the system ends after four measures, so the row is short.
	// ponytail: the 11ths/13ths, the sus/added rows and the function kinds (N, It, Fr, Ger,
	// ped, Tr) have HARMONY_KIND_SUFFIX entries but no measure here — lilypond_71f stops at the
	// ninths. So does <degree> (add9, ♭5), which harmonyText carries its own `ponytail:` note
	// about ignoring: a "C(add9)" prints as a bare "C", a WRONG symbol rather than a missing
	// one. Extend the fixture when a score needs them.
	testCase('harmony_kinds.musicxml', 'harmony_kinds.png'),

	// <figured-bass> — the stacked numerals a continuo player reads under the bass line. One
	// treble stave in common time holding six identical G4s, so only the figures vary; each
	// stack sits under the note that FOLLOWS its <figured-bass> element, centered on the
	// notehead, upright rather than italic, and builds downward one row per <figure>.
	// - Note 1: a bare "3" — a single unadorned figure.
	// - Note 3: ♯1 over ♭3 over ♮5 — three figures, each with a <prefix> accidental, printed
	//   in document order top to bottom (NOT sorted by numeral).
	// - Note 4: "(6)" — parentheses="yes" on the <figured-bass> wraps every figure of the
	//   stack, here just the one.
	// - Note 5: "5/" over "♭127/" — the <suffix>slash</suffix> form. lilypond_74a's "127" is
	//   deliberate nonsense, there to prove a multi-digit numeral isn't truncated.
	// Notes 2 and 6 carry no <figured-bass> and print nothing under them.
	// ponytail: a slash asks for a stroke THROUGH the numeral and prints as a trailing solidus
	// — see FIGURE_SIGN in score-reader.ts. <extend> (the dash carrying a figure across the
	// notes after it) is likewise unimplemented; this fixture writes none, and says so in its
	// own <miscellaneous-field>.
	// See also lilypond_46g-PickupMeasure-Chordnames-FiguredBass.xml.
	testCase('figured_bass.musicxml', 'figured_bass.png'),

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
	// - M10: Bm7 fret box plus an italic "(as taught)" words direction — the word draws at its
	//   normal above-stave spot and the box lifts to sit clear above it (boxes yield to text by
	//   rising, not by overlapping).
	// - M11: same Bm7 box but with a high D5/F♯5 chord on beat 1 that pushes the "(as taught)"
	//   text up — the box lifts further so it still clears the raised word.
	// - M12: same Bm7 box over four C6 quarters (two ledger lines above the staff) — the box
	//   lifts until it clears the high noteheads/ledger lines, using the same padded
	//   lift-clear treatment a chord symbol uses, instead of overlapping them.
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
		layout: { type: 'standard', referenceWidth: 500 },
	}),

	// Treble stave, 4/4, one measure at a narrow 500px width: a Bm7 fret box bound to the
	// LAST quarter, whose note sits right against the system's right edge. Anchored at that
	// note's x, the box's natural right edge overruns the canvas; it must nudge left so the
	// whole board — including the far-right muted "X" — stays inside the drawable region
	// instead of being clipped. Four B4 quarters so only the diagram's clamp is exercised.
	testCase('chord_diagram_edge.musicxml', 'chord_diagram_edge.png', {
		layout: { type: 'standard', referenceWidth: 500 },
	}),

	// Two treble parts, 4/4: a Voice part singing "sing"/"this" over a Guitar part that
	// carries a C-major fret box. The diagram belongs to the LOWER part, so it must sit in
	// the guitar's own headroom — below the voice's lyric line and above the guitar stave —
	// rather than climbing over the voice part the way an unbanded lift would. The system's
	// inter-part gap opens to hold it. The <harmony> is written twice, once per voice (the
	// guitar's voice 1 E4 halves and voice 2 G3 whole, split by a <backup>), the way Guitar
	// Pro repeats it; both copies sit on beat 1 and identical, so exactly ONE box draws.
	testCase('chord_diagram_lower_part.musicxml', 'chord_diagram_lower_part.png'),

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
	// Each grace curve bows underneath and lands on the BASE OF THE MAIN NOTE'S STEM
	// (SLUR_GRACE_ANCHOR), so a stem-down main note takes a deep bow reaching below the
	// stave while a stem-up one stops at its own notehead.
	// - M3: a grace note slurred to its main note — an 8th D5 grace bowing down to the C5
	//   quarter (stem down), so the arc drops past the stave to the stem's bottom tip.
	// - M4: the same, but the main note's stem faces the other way — an 8th D5 grace slurred
	//   under to an E4 quarter (stem up), whose stem base IS its notehead, so the arc stays
	//   shallow and tucks under the head instead of diving.
	// - M5: a placement override a grace slur ignores — an 8th D5 grace with placement="above",
	//   yet the slur still bows under to the C5 quarter (grace slurs always bow underneath).
	// - M6: a multi-grace slur — a beamed grace pair (E5, D5) with one arc spanning from the first
	//   grace under to the C5 quarter.
	// - M7: a hammer-on grace — an 8th C5 grace with a <hammer-on> to the D5 quarter, drawn as a
	//   slur curve bowing under from the grace to the main note (no "H" text — that's tab-only).
	// - M8: a pull-off grace — an 8th D5 grace with a <pull-off> to the C5 quarter, the mirror of
	//   M7, likewise drawn as a slur curve from the grace under to the main note.
	// - M9: a slide grace — an 8th E5 grace with a <slide> to the C5 quarter, drawn as a straight
	//   diagonal line slanting down from the grace notehead to the main notehead (no arrowhead, no label).
	// - M10: the mirror of M9 — an 8th A4 grace sliding UP to the C5 quarter, so the diagonal line
	//   slants up from the lower grace notehead to the main notehead.
	testCase('grace_notes.musicxml', 'grace_notes.png'),

	// Bass stave, 4/4: a grace note is placed against its own stave's clef, and its slur
	// bows under to the notehead rather than to whatever vexflow's stem metrics point at.
	// - M1: an 8th G3 grace slurred down into a B2 quarter. G3 sits on the TOP space, above
	//   its own main note on the 4th line; the curve leaves the grace notehead, dips below
	//   the stave and rises to the base of B2's stem. Against the default treble clef the
	//   grace would instead land on ledger lines below the stave, under the note it ornaments.
	// - M2: the same grace into a stem-down CHORD (B2+G#3+D#4, the top note on a ledger line).
	//   The bow sweeps under all three noteheads to the base of the chord's stem, staying
	//   concave and passing well clear of both sharps — not up to the chord's TOP note, which
	//   is what vexflow's own NEAR_HEAD metric would give (a straight diagonal across them).
	testCase('grace_bass_clef.musicxml', 'grace_bass_clef.png'),

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

	// Treble stave, common time: a CHORD as a grace note on a notation stave — the grace's
	// members stack as one small chord sharing a stem, each with its own slash. Both graces are
	// slashed eighths, and every main note is a quarter, so only the grace's and the main
	// note's shape vary. tab_grace_chord_align covers grace chords on a notation+tab pair, but
	// only as an alignment test; this is what pins the notation-only rendering.
	// - M1: a bare C5 quarter, then a D5/F5 grace chord ahead of a C5 quarter (grace chord to
	//   single note), then a B4/D5 grace chord ahead of an A4/C5 quarter chord (grace chord to
	//   chord). Every grace member is a third apart, so none of them needs the across-the-stem
	//   offset chord.musicxml documents for seconds — they stack straight up one side.
	// ponytail: lilypond_24b carries no <slur> on its graces, so the grace slur (which would
	// leave the chord's lowest member) is still unexercised.
	testCase('grace_chord.musicxml', 'grace_chord.png'),

	// Treble stave, 4/4: AFTER-graces — a grace cluster with no note left to lead, which
	// decorates the note it FOLLOWS and so prints to that note's RIGHT. grace_notes.musicxml is
	// entirely about the leading form. Two E5 half notes, so only the small notes around them
	// vary; every grace is a 16th at G5 or A5 (A5 on its own ledger line above the stave).
	// - M25: a plain E5 half note. Then three 16th graces — G5, A5, A5 — BEAMED into one
	//   cluster snug against the second E5 half note, which they lead. Then that half note.
	//   Then a G5/A5 pair, also beamed, drawn to the RIGHT of it: the measure ends there, so
	//   they have nothing to lead and belong to the note before them. Before this they were
	//   dropped entirely.
	// Matches MuseScore's engraving of the same file measure for measure (checked against
	// `vex render --muse`), including the three-note cluster: MusicXML marks the first of those
	// graces <grace steal-time-previous>, but an after-grace that still has a note in front of
	// it is engraved as a leading grace of that note, not split off onto the note behind it.
	// The clusters beam themselves — the middle one carries no <beam> markers at all — because
	// a run of small notes is beamed by convention, whatever the exporter wrote.
	// ponytail: no slur is drawn from a note out to its after-graces. The fixture carries no
	// <slur>, and vexflow's own grace slur runs the other way (host to LEADING grace).
	// See also lilypond_24c-GraceNote-MeasureEnd.xml (a grace as the very last thing in a
	// measure, which has nothing to attach to) and lilypond_24e-GraceNote-StaffChange.xml.
	testCase('grace_after.musicxml', 'grace_after.png'),

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
	// - M4: same texture as M2 but with NO <stem> elements (e.g. a Soundslice export):
	//   the voices still stem apart by default — V1 (dotted-half D5 + quarter C5) stems up
	//   even though auto-stemming would point those down, V2 (quarters G4, B4, A4 and a
	//   beamed A4/G4 eighth pair, beam below) stems down even though auto-stemming would
	//   point G4/A4 up.
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

	// Cross-staff notes — a voice whose notes change <staff> mid-beam, the defining gesture of
	// piano writing. One braced grand staff (treble over bass), common time, everything in
	// voice 2: each note draws on the staff its own <staff> names, not on the one the voice
	// opened with (ScoreReader.staffVoices projects a voice onto both staves rather than
	// pinning it to one). A cross-staff group is still ONE beam with one direction: the beam
	// in M1-M2 stems DOWN and sits below the bass staff, so the treble notes' stems run the
	// whole height of the gap to reach it.
	// - M1: two beamed groups of four eighths. The first alternates bass A3 / treble E4, so
	//   its stems alternate short-long-short-long down to the beam. The second is treble
	//   C5-E4 then bass A3-B4; B4 written on the BASS staff sits four ledger lines above it,
	//   level with the gap, and its stem is the shortest of the eight.
	// - M2: chords SPLIT across the staves, under one beam, over a treble whole rest (voice 1)
	//   and closing on a bass half rest. Beat 1 is a four-note chord entirely on the bass
	//   staff (C3-E3-G3-C4, so its C4 rides a ledger line above it) and beat 2 an all-treble
	//   C4-E4-G4; beats 3 and 4 are the split ones — beat 3 puts C3-E3-G3 on the bass and its
	//   C4 on the treble, beat 4 a lone G3 on the bass under a treble C4-E4-G4. A split chord
	//   draws as one notehead stack per staff at a shared onset, and BOTH halves join the
	//   beam, so neither grows a stray flag and the two stacks hang off one shared stem.
	// - M3: M2's four chords again, but with a second voice (voice 3, four C2 quarters on two
	//   ledger lines) underneath them on the bass staff — so the beam has nowhere to go below
	//   and the WHOLE group flips: every stem up, the beam parked above the TREBLE staff, and
	//   the bass chords' stems running the full height of the gap to reach it (the mirror of
	//   M2). Voice 3 keeps its own down stems below the bass staff, clear of the beam.
	// - M4: the mirror of which staff OWNS the beam. M1-M3's voice opens in the bass, so its
	//   beam is drawn with the bottom staff; here the voice opens in the treble (C5-A4) and
	//   drops to the bass (A3-F3), so the beam is drawn with the TOP staff — before the bass
	//   staff's own notes have drawn. Both bass noteheads still sit on the bass staff with
	//   stems reaching up to the one beam under them, and the treble pair's stems run the
	//   full height of the gap; nothing escapes above the treble staff. A half rest fills
	//   beats 3-4.
	// See also cross_stave_16ths_ghost_notes_simple.xml.
	testCase('cross_stave.musicxml', 'cross_stave.png'),

	// A different key signature on each staff of one part — normal for transposing scores
	// and for some contemporary piano writing. One braced two-stave part, 4/4, one whole
	// note per stave, each staff declaring its own <key number> and <clef number>.
	// - M1: the treble staff opens in C major, so it prints NO accidentals and its F4 whole
	//   note sits in the bottom space; the bass staff opens in D major and prints two sharps
	//   (F#, C#) between its clef and its time signature, over a B2 whole note on the second
	//   line from the bottom. Each key signature sits flush after its OWN clef, but the two
	//   4/4s line up in one vertical column and both whole notes start at the same x — the
	//   meter belongs to the measure, not to a stave, so the narrower opening is padded out
	//   to the wider one (alignBegModifiers).
	// See also lilypond_43c-MultiStaff-DifferentKeysAfterBackup.xml, where the second
	// staff's key arrives after a <backup> and so is easy to miss.
	testCase('staves_different_keys.musicxml', 'staves_different_keys.png'),

	// A <direction> carrying a <staff>, on a multi-staff part: one braced grand staff in
	// common time, four quarters per staff per measure. Every direction here is written
	// placement="below", so the routing is what decides where it lands — a staff-1 mark
	// prints in the gap BETWEEN the two staves, a staff-2 mark below the bottom one. This is
	// the same <staff> routing structure_tab_parts M2 covers for <words>, exercised on the
	// direction types that bind to a note (dynamics, wedge) plus a per-staff clef change.
	// - M1: treble C5-B4-A4-G4 over bass A2-B2-C3-D3. Three directions, all below:
	//   <ffff> on staff 1 under its first note, <p> on staff 1 under its fourth, and a
	//   crescendo <wedge> on staff 2 spanning its first three notes. The two dynamics sit
	//   between the staves and the hairpin under the bass staff — a staff-2 direction must
	//   not print over staff 1, and vice versa.
	// - M2: <clef number="2"> changes the LOWER staff to treble while staff 1 keeps its own,
	//   so only the bass staff redraws a clef (at the reduced mid-system size) and the new
	//   2-sharp key signature prints on both. Bass reads F#4-G4-A4-B4 in the new clef.
	testCase('staff_dynamics.musicxml', 'staff_dynamics.png'),

	// Three transposing parts (Bb trumpet, Eb horn, piano) each playing the same concert C
	// scale, so each is WRITTEN in its own key: three treble staves in common time, the top
	// at 2 sharps, the middle at 3 sharps, the bottom with no key signature. Each stave runs
	// eight ascending quarter notes across two measures, starting a step higher on each stave
	// down (D4, E4, C4), with no connector joining the parts. The three key signatures are
	// three different widths but all three common-time "C" symbols line up in one vertical
	// column, the narrower openings padded out to the widest (alignBegModifiers).
	// This case exists to LOCK IN that <transpose> does not move anything: MusicXML stores
	// written pitch, so the engraved page is already correct without reading the element, and
	// a future change must not start "helpfully" transposing. Where <transpose> does matter is
	// playback pitch (not a render concern) and a mid-score transposition change — see
	// transpose_change.musicxml below.
	testCase('transpose.musicxml', 'transpose.png'),

	// A <transpose> that changes mid-score — an instrument doubling change, here a clarinet
	// in Eb picking up a clarinet in Bb (lilypond_72c-TransposingInstruments-Change). One
	// treble stave in common time, one C4 whole note per measure on the ledger line below.
	// The transposition itself moves nothing (see transpose.musicxml above); what it changes
	// is the WRITTEN key, and that is the visible half of the feature.
	// - M1: opens at 1 sharp (F#) — clef, key signature, common-time C.
	// - M2: the new transposition puts the part in C major, so the change has no accidentals
	//   of its own to print. It is still drawn: a lone natural on the top line cancels the
	//   F#. Without the cancellation the measure would look like no change happened at all.
	// ponytail: the <part-name-display>/<part-abbreviation-display> in M2's <print> — the
	// half that relabels the stave "Clarinet in Bb" mid-score — is ignored; part labels are
	// read once off the <part-list>. See also lilypond_72b-TransposingInstruments-Full.xml
	// and concert_score_and_for_part.xml (the <for-part> concert-score form).
	testCase('transpose_change.musicxml', 'transpose_change.png'),

	// Sixteen identical C5 whole-note measures wrapping onto three systems (seven, eight,
	// then one — each whole note floors at its minimum width, and the first system gives up
	// a measure's worth of room to the clef and time signature) under the default layout.
	// The default 'system' measure numbering prints a "1", an "8" and a "16" above each
	// system's first measure. The lone M16 stays ragged at its natural width — the last
	// system is under minLastSystemFill, so it is not justified out to the page edge.
	testCase('system_break.musicxml', 'system_break.png'),

	// Four C5 whole-note measures, treble 4/4, that would all fit on one system — but
	// M3 carries a <print new-system="yes"/>, forcing a system break before it. So the
	// score wraps to two systems: M1-2 on top, M3-4 below (each re-stating the treble
	// clef; the time signature prints only on M1). Proves an explicit break overrides
	// width-based wrapping.
	testCase('print_new_system.musicxml', 'print_new_system.png'),

	// The same four measures with honorSystemBreaks off: the <print new-system="yes"/> on M3
	// is ignored and all four measures fit on one system.
	testCase('print_new_system.musicxml', 'ignore_new_system.png', {
		honorSystemBreaks: false,
	}),

	// The same sixteen C5 whole-note measures, but with panoramic layout: all sixteen sit
	// on a single uninterrupted system (no system break).
	testCase('system_break.musicxml', 'layout_panoramic.png', {
		layout: { type: 'panoramic' },
	}),

	// The same sixteen C5 whole-note measures wrapping the same three ways (7 + 8 + 1), but
	// with minLastSystemFill lowered to 0 so the last system ALWAYS justifies. The only
	// difference from system_break.png is the bottom system: its lone M16 is stretched out
	// to the full page width, its whole note left against the clef and its closing barline
	// flush with the right margin, instead of stopping at its natural width. The two full
	// systems above are unchanged. A one-measure system blown out to a whole page line is
	// what a 0 fill threshold asks for — the point of the case is that the threshold is
	// honoured, not that the result is good engraving.
	testCase('system_break.musicxml', 'last_system_stretch.png', {
		minLastSystemFill: 0,
	}),

	// A score that fits on a single system, rendered with stretchSingleSystem false. The
	// lone system's few measures fill well under minLastSystemFill of the page, so instead
	// of stretching to the full page width (the default — see aloof_measure_1.png) it stays
	// ragged at its natural width: the staff ends well short of the right page edge with
	// empty margin beyond it.
	testCase('aloof_measure_1.musicxml', 'stretch_single_system_off.png', {
		stretchSingleSystem: false,
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
		layout: { type: 'standard', referenceWidth: 660 },
	}),

	// One two-stave (braced) treble part, 4/4, one measure. Tests the vertical gap
	// *within* a part: staff 1 plays four C3 quarters (many ledger lines hanging below
	// its staff) while staff 2 plays four C7 quarters (many ledger lines rising above
	// its staff), so the two staves spill toward each other at the same beats — far
	// enough that the planned within-part gap can't hold them and has to widen. The
	// lower ledger lines/noteheads of staff 1 must stay clear of the upper ledger
	// lines/noteheads of staff 2 — nothing from either staff may touch the other.
	testCase('stave_spacing.musicxml', 'stave_spacing.png'),

	// Two two-stave (braced) treble parts, 4/4, one measure. Tests the vertical gap
	// *between* parts: the pair of staves that meet in the middle are the extreme ones —
	// P1's staff 2 plays four C3 quarters (many ledger lines below) and P2's staff 1
	// plays four C7 quarters (many ledger lines above), far enough that the planned
	// between-part gap can't hold them and has to widen. The outer staves hold a tame B4
	// whole note each, so only the inter-part boundary is stressed. P1's low ledger
	// lines must stay clear of P2's high ones, and each part's own two staves must
	// stay clear too.
	testCase('part_spacing.musicxml', 'part_spacing.png'),

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

	// ---------------------------------------------------------------------------------------
	// Whole real-world scores, engraved end to end at the default 900px reference width. Every
	// case above is hand-cut to prove one thing; these prove the opposite — that the whole-page
	// path holds up at realistic size. They are the broadest cases in the suite, so they sit
	// last, and they are NOT diagnostic: a diff here says something moved somewhere, not what.
	// Find the system that changed, then reproduce it in a focused fixture above before
	// touching src/. Comments stay one line — the score is the description.
	//
	// Excluded: Gounod's Méditation (365 measures, 92MP) and Lee Actor's Prelude to a Tragedy
	// (902 measures across 22 parts, 135MP). Both render, but diffing the latter needs ~1.6GB
	// of raw buffers.
	// ---------------------------------------------------------------------------------------

	// Chopin: one measure of piano, both staves in bass clef, 3 flats.
	testCase('score_chopin_prelude.musicxml', 'score_chopin_prelude.png'),

	// Brahms: 8 measures of solo violin double stops, with fingerings and circled string
	// numbers.
	testCase(
		'score_brahms_violin_concerto.musicxml',
		'score_brahms_violin_concerto.png',
	),

	// Fauré, "Après un rêve": 4 measures of voice over braced piano, with lyrics and hairpins.
	testCase(
		'score_faure_apres_un_reve.musicxml',
		'score_faure_apres_un_reve.png',
	),

	// Mozart, K. 387: 13 measures of string quartet — four parts, viola in alto C clef, pickup.
	testCase(
		'score_mozart_string_quartet.musicxml',
		'score_mozart_string_quartet.png',
	),

	// Debussy, "Mandoline": 12 measures of voice over piano in 6/8 — the densest annotation
	// stack here (lyrics, graces, arpeggios, an octave shift, hairpins, a mid-measure clef).
	testCase('score_debussy_mandoline.musicxml', 'score_debussy_mandoline.png'),

	// Beethoven, "An die ferne Geliebte": 15 measures of voice over piano, with pedal marks and
	// a mid-measure clef change on the lower piano stave.
	testCase(
		'score_beethoven_an_die_ferne_geliebte.musicxml',
		'score_beethoven_an_die_ferne_geliebte.png',
	),

	// 16 measures of solo guitar on a TAB stave with no notation stave above it.
	testCase('score_wanna_skip_class.musicxml', 'score_wanna_skip_class.png'),

	// Mozart, "An Chloe": 18 measures of voice over piano in cut common, with turn ornaments.
	testCase('score_mozart_an_chloe.musicxml', 'score_mozart_an_chloe.png'),

	// Bach, "Air": 19 measures of string quartet with repeats and numbered endings spanning all
	// four parts.
	testCase('score_bach_air.musicxml', 'score_bach_air.png'),

	// TODO: False positive — this baseline was created from the current render and shows a bug.
	// Mozart's grace notes slur from the piano's lower stave to its upper one, and vexml draws
	// that cross-staff slur as a tall narrow spike that shoots up through BOTH piano staves and
	// into the voice stave above (measure 3 of system 1, around x=670). A slur should hug its
	// notes, not span three staves as a vertical needle. Fix the cross-staff slur geometry, then
	// `vex test score_mozart_das_veilchen --update`.
	// Mozart, "Das Veilchen": 23 measures of voice over piano, with grace notes.
	testCase(
		'score_mozart_das_veilchen.musicxml',
		'score_mozart_das_veilchen.png',
	),

	// TODO: False positive — this baseline was created from the current render and shows a bug.
	// The piano's opening slur over-arcs: instead of hugging the right-hand figure it balloons
	// up across the empty voice stave above it (systems 1 and 2). Compare the arc height here
	// against slur.musicxml, which never leaves its own stave. Likely the same
	// long/steep-slur flattening the upstream slurs_long_steep_arc_flattening_chopin.xml case
	// covers. Fix, then `vex test score_schumann_dichterliebe --update`.
	// Schumann, "Dichterliebe": 27 measures of voice over piano, 3 sharps.
	testCase(
		'score_schumann_dichterliebe.musicxml',
		'score_schumann_dichterliebe.png',
	),

	// Austrian national anthem: 28 measures of voice over piano, with three stacked verses of
	// lyrics setting the measure widths.
	testCase('score_land_der_berge.musicxml', 'score_land_der_berge.png'),

	// "Amazing Grace": 33 measures of voice over guitar notation + TAB, with lyrics and chord
	// diagrams. A Singer treble stave sits above a two-stave A.Guitar part (treble notation +
	// 6-line TAB), in 3 sharps and 3/4. The bracket spans the guitar's two staves ONLY — the
	// Singer is a separate part and nothing groups them — and the barlines match it: they stop
	// between the Singer and the guitar, and run through the guitar's notation and TAB
	// together. Only the system's left line spans all three staves. MuseScore draws this score
	// the same way. The chord diagrams belong to the guitar, so
	// they hang in the gap between the two parts — under the Singer's lyrics, over the guitar's
	// notation stave — one box per chord change.
	// Note: chord roots print with a natural (A♮5, D♮) because the source writes an explicit
	// <root-alter>0</root-alter> on every harmony; see harmony.musicxml M6.
	// TODO: the FINAL measure crowds four chord changes into one bar and its last two boxes
	// still misplace — "A♮/C#" sits at its natural height where the tall chord's stems poke
	// up into it (a stem is not a lift-clear obstacle, only its notehead is), and "B♮m7"/
	// "A♮m7" overprint each other at the right edge because nudgeInsideX pulls the last box
	// back left over the one pushRightOf had just separated it from. Both are pre-existing
	// and independent of the notation/TAB and banding fixes; neither affects any other
	// system. Fix in the diagram placement pass in draw-pass.ts, then re-accept this
	// baseline.
	testCase('score_amazing_grace.musicxml', 'score_amazing_grace.png'),

	// "Green's Greenery": 61 measures of guitar notation + TAB, with repeats and endings. ONE
	// Steel Guitar part of two staves — a treble notation stave in 2 flats and 4/4 over the
	// 6-line TAB.
	testCase('score_greens_greenery.musicxml', 'score_greens_greenery.png'),

	// TODO: False positive — this baseline was created from the current render and shows a bug.
	// Measure 2 holds a genuine cross-staff beam (voice 2 begins on staff 1 at C4, then
	// continues on staff 2 for F3/G3/A3). vexml draws it as two long diagonal beams that slash
	// across the treble stave from measure 1 into measure 2, leaves three stems standing with no
	// noteheads shooting off the top of the image, and inflates the first system's height enough
	// to leave a 385px blank band beneath it — every other system here gaps by ~85-130px.
	// See the recent cross-staff beam work in engraving/. Fix, then
	// `vex test score_joplin_elite_syncopations --update`.
	// Joplin, "Elite Syncopations": 88 measures of piano, with repeats and numbered endings.
	testCase(
		'score_joplin_elite_syncopations.musicxml',
		'score_joplin_elite_syncopations.png',
	),
];

describe('render', () => {
	for (const t of TEST_CASES) {
		// Concurrent: each render borrows its own page from the pool (see setup.ts), so
		// bun runs up to POOL_SIZE of them in parallel across separate renderer processes.
		it.concurrent(t.screenshotFilename, async () => {
			const png = await render(t.musicXMLFilename, t.config);
			expect(png).toMatchScreenshot(t.screenshotFilename);
		});
	}
});
