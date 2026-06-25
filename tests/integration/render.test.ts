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

	// A 6-line tablature stave with a stacked "TAB" label at the left.
	testCase('clef_tab_6_string.musicxml', 'clef_tab_6_string.png'),

	// A 4-line tablature stave with a stacked "TAB" label at the left.
	testCase('clef_tab_4_string.musicxml', 'clef_tab_4_string.png'),

	// A treble notation stave above a 6-line TAB stave, joined by a brace.
	testCase('clef_notation_and_tab.musicxml', 'clef_notation_and_tab.png'),

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

	// Treble stave, 4/4, all on C5: dotted-note variations.
	// - M1: dotted-quarter + eighth pairs (single dots).
	// - M2: double-dotted-quarter + sixteenth pairs (double dots).
	// - M3: four beamed dotted-eighth + sixteenth pairs (dots inside beams).
	testCase('dotted_notes.musicxml', 'dotted_notes.png'),

	// Treble stave, 4/4: the rest counterpart of note.musicxml's durations (M1-M2).
	// - M1: a whole rest.
	// - M2: half, quarter, eighth, sixteenth, then two thirty-second rests.
	testCase('rest.musicxml', 'rest.png'),

	// Treble stave, 4/4: four C5 quarter notes at one staff position — sharp, flat,
	// natural, then no accidental — so only the accidental glyph varies.
	testCase('accidentals.musicxml', 'accidentals.png'),

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

	// Beam variations across seven 4/4 measures. Wraps across systems.
	// - M1: simple beamed eighths in a small range.
	// - M2: beamed eighths leaping a wide range (steep beams, ledger lines above on
	//   D6/E6 and below on C4/D4).
	// - M3: two double-beamed sixteenth groups then a half rest.
	// - M4: one beat of triple-beamed 32nds then half + quarter rests.
	// - M5: mixed eighth+sixteenth beats with partial secondary beams.
	// - M6: a beamed eighth group spanning an internal eighth rest.
	// - M7: beamed eighths in a low range (below the middle line) so the auto stem
	//   direction flips up.
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

	// Treble stave, 4/4, on C5: ties.
	// - M1: two half notes tied within the measure.
	// - M2-3: a whole note tied across the barline into the next whole note (the tie arc
	//   spans the barline).
	testCase('tie.musicxml', 'tie.png'),

	// Slurs, with the quarter-note measures grouped first. Wraps across systems.
	// - M1: four quarters, slur below (default).
	// - M2: four quarters, slur above.
	// - M3: four quarters carrying two separate two-note slurs.
	// - M4: eight beamed eighths under one slur.
	// - M5: two half notes slurred across a wide leap.
	// - M6: one slur over a descending line D5, C5, A4, G4 that crosses the middle line,
	//   so the first two notes are stem-down and the last two stem-up and the slur stays
	//   clear of both noteheads and the stem-up stem tips.
	// - M7: one slur over a zig-zag line C5, G4, D5, A4 straddling the middle line, so
	//   the stems alternate down-up-down-up under the slur.
	// - M8: one slur beneath an ascending low line E4, F4, G4, A4 (all stem-up), the
	//   slur bowing below the noteheads.
	// - M9: three chained slurs over E4, G4, E5, C5 — a slur below the first pair, a slur
	//   above the last pair, and a third slur bridging note 2 to note 3.
	testCase('slur.musicxml', 'slur.png'),

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

	// 6-line TAB stave: an advanced companion to tab_hammer_pull showcasing grace
	// notes plus slides, bends, vibrato, and text annotations. No <time>, so no time
	// signature is drawn. Each technique reads straight from <notations>.
	// - M1: grace notes (small fret numbers just left of their main note) — a single
	//   grace (fret 7) before a fret-5 half note, then a grace pair (frets 7, 9) before
	//   another fret-5 half note, all on string 3.
	// - M2: slides — a slide up (string 3, fret 5 -> 7) then a slide down (fret 9 -> 7),
	//   each a diagonal TabSlide line tilted by the fret motion. The "sl." labels are off
	//   by default (showTabSlideText). Four quarter notes.
	// - M3: bends — a whole-step bend labelled "full" on string 3 fret 7, then a
	//   half-step bend labelled "½" on string 2 fret 5; each an upward arrow + label.
	// - M4: a bend-and-release on string 3 fret 7 (whole note) — an up-then-down arrow.
	// - M5: vibrato on string 3 fret 7 (whole note) — a wavy line trailing the fret.
	// - M6: a natural harmonic drawn as its fret in angle brackets ("<12>"), then text
	//   annotations above the frets — a palm mute "P.M." and a dead note "x" (both fret 7),
	//   then a plain fret-5 note.
	testCase('tab_techniques.musicxml', 'tab_techniques.png'),

	// Same fixture with showTabSlideText: true — the "sl." labels print above the M2
	// slide lines.
	testCase('tab_techniques.musicxml', 'tab_techniques_slide_text.png', {
		showTabSlideText: true,
	}),

	// Tuplets on C5.
	// - M1: a beamed eighth-note triplet ("3"), a bracketed quarter-note triplet ("3"),
	//   then a plain quarter.
	// - M2: a beamed sixteenth-note sextuplet ("6"), a beamed eighth-note triplet ("3"),
	//   then a half note.
	testCase('tuplet_triplet.musicxml', 'tuplet_triplet.png'),

	// Treble stave, 4/4: four C5 quarter notes at one staff position — staccato (dot),
	// accent (>), tenuto (—), then staccatissimo (wedge) — so only the articulation
	// varies.
	testCase('articulations.musicxml', 'articulations.png'),

	// Treble stave, 4/4: natural harmonics drawn as diamond noteheads (from
	// <harmonic><natural/>) — an open diamond for the half note, then filled diamonds for
	// the two quarters (the diamond fill follows duration). All on E5 so only the notehead
	// varies. The tab counterpart (angle-bracketed fret) lives in tab_techniques M6.
	testCase('harmonic.musicxml', 'harmonic.png'),

	// Treble stave, 4/4: grace notes (small notes that steal no beat, drawn just left of
	// the main note they ornament). Every main note is a plain C5 quarter so only the
	// grace varies.
	// - M1: a C5 quarter preceded by an unslashed 16th D5 (appoggiatura); a slashed 16th
	//   D5 (acciaccatura, with a stroke through its flag); a beamed pair of 16ths (E5, D5)
	//   sharing one grace beam; then an unslashed 8th D5 (single flag).
	// - M2: grace notes carrying printed accidentals — a sharp D#5 grace, then a flat Db5
	//   grace, each before a C5 quarter; a half rest fills the rest of the bar.
	testCase('grace_notes.musicxml', 'grace_notes.png'),

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

	// Eight identical C5 whole-note measures wrapping onto two systems of four measures
	// each (default layout). The default 'system' measure numbering prints a "1" above
	// the top system's first measure and a "5" above the bottom system's first measure.
	testCase('system_break.musicxml', 'system_break.png'),

	// The same eight C5 whole-note measures, but with panoramic layout: all eight sit
	// on a single uninterrupted system (no system break).
	testCase('system_break.musicxml', 'layout_panoramic.png', {
		layout: { type: 'panoramic' },
	}),

	// The eight C5 whole-note measures (two systems of four), with a measure number
	// printed above the left edge of every measure (measureNumbering 'every'):
	// "1 2 3 4" across the top system, "5 6 7 8" across the bottom.
	testCase('system_break.musicxml', 'measure_numbering_every.png', {
		measureNumbering: 'every',
	}),

	// The same two systems with measure numbering turned off (measureNumbering
	// 'none'): no measure numbers anywhere, opting out of the 'system' default.
	testCase('system_break.musicxml', 'measure_numbering_none.png', {
		measureNumbering: 'none',
	}),

	// The same two systems with measureNumbering 'every-2': every 2nd measure plus
	// every system start. Numbered measures are the odd ones 1, 3, 5, 7 (every 2nd,
	// 0-based) — 1 and 3 on the top system, 5 and 7 on the bottom. Both system starts
	// (1, 5) already fall on the every-2 cadence, so here the union adds nothing beyond
	// it.
	testCase('system_break.musicxml', 'measure_numbering_every_2.png', {
		measureNumbering: 'every-2',
	}),

	// The same two systems with measureNumbering 'every-3': every 3rd measure plus
	// every system start. Numbered measures are 1, 4, 7 (every 3rd) and 5 (the second
	// system's start, which is not a multiple of 3) — so 1 and 4 on the top system, 5
	// and 7 on the bottom. This is the case that proves the "plus every system start"
	// union: measure 5 is numbered only because it begins a system.
	testCase('system_break.musicxml', 'measure_numbering_every_3.png', {
		measureNumbering: 'every-3',
	}),
];

for (const t of TEST_CASES) {
	test(t.screenshotFilename, async () => {
		const png = await render(t.musicXMLFilename, t.config);
		expect(png).toMatchScreenshot(t.screenshotFilename);
	});
}
