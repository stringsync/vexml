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

	// Same two labelled parts as structure_part_labels, but with the label font
	// overridden to a serif family (fonts.label). The two instrument names render in
	// serif instead of the default sans-serif, proving the label FontConfig option
	// flows through to the part labels (the only text vexml draws in the margin).
	testCase('structure_part_labels.musicxml', 'font_label.png', {
		showPartLabels: true,
		fonts: { label: { family: 'Times New Roman' } },
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

	// Treble stave with a 3-sharp key signature (F#, C#, G#).
	testCase('key_sharps.musicxml', 'key_sharps.png'),

	// Treble stave with a 2-flat key signature (Bb, Eb).
	testCase('key_flats.musicxml', 'key_flats.png'),

	// Treble stave with a numeric 3/4 time signature (stacked numerals).
	testCase('time_numeric.musicxml', 'time_numeric.png'),

	// Treble stave with the common-time (C) symbol.
	testCase('time_common.musicxml', 'time_common.png'),

	// Treble stave with the cut-time (¢) symbol.
	testCase('time_cut.musicxml', 'time_cut.png'),

	// Treble stave, 4/4: note durations on C5, increasing flag counts.
	// - M1: a whole note.
	// - M2: a half, quarter, eighth, sixteenth, then two thirty-seconds.
	testCase('note_durations.musicxml', 'note_durations.png'),

	// Treble stave, 4/4, all on C5: dotted-note variations.
	// - M1: dotted-quarter + eighth pairs (single dots).
	// - M2: double-dotted-quarter + sixteenth pairs (double dots).
	// - M3: four beamed dotted-eighth + sixteenth pairs (dots inside beams).
	testCase('dotted_notes.musicxml', 'dotted_notes.png'),

	// Treble stave, 4/4: the rest counterpart of note_durations.
	// - M1: a whole rest.
	// - M2: half, quarter, eighth, sixteenth, then two thirty-second rests.
	testCase('rest.musicxml', 'rest.png'),

	// Treble stave, 3/4: stem direction on G4/B4/D5.
	// - M1: no <stem>, so the default follows staff position (middle line B4) — low G4
	//   stems up, middle B4 and high D5 stem down.
	// - M2: the same three pitches with an explicit <stem> that overrides each default —
	//   G4 down, B4 up, D5 up.
	testCase('note_stem_direction.musicxml', 'note_stem_direction.png'),

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

	// One system, treble 4/4: a key change mid-system. Each measure holds one C5 whole
	// note.
	// - M1: opens the system with a treble clef, a 2-sharp key signature, and a 4/4 time
	//   signature.
	// - M2: changes the key to 4 sharps — only the new key signature is redrawn at the
	//   change (the clef and time signature are NOT repeated).
	// - M3: continues in 4 sharps with no key signature redrawn.
	testCase('key_change.musicxml', 'key_change.png'),

	// One system, treble: a time signature change mid-system.
	// - M1: opens the system with a treble clef and a 4/4 time signature; four C5 quarter
	//   notes.
	// - M2: changes the meter to 3/4 — only the new time signature is redrawn at the
	//   change (the clef is NOT repeated); three C5 quarter notes.
	// - M3: continues in 3/4 with no time signature redrawn; three C5 quarter notes.
	testCase('time_change.musicxml', 'time_change.png'),

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

	// Treble stave, 4/4: two voices sharing one stave across three measures of increasing
	// complexity, exercising <backup>/<forward> in different ways. V1 stems up, V2 stems
	// down. May wrap across systems.
	// - M1: V1 a mixed quarter/eighth line spanning the whole measure; V2 silent on beats 1
	//   and 4 via leading and trailing <forward> (no rests drawn). The silence is held open
	//   by invisible ghost tickables (src/stave-notes.ts), so V2 starts aligned on beat 2
	//   (G4 under V1's F5) and its last note (G4 on beat 3.5) keeps a full beat of space to
	//   its right before V1's final C5 on beat 4.
	// - M2: a full <backup> to the measure start — V1 a dotted half (D5, dot to its right)
	//   then a quarter (C5); V2 four quarters (G4, A4, B4, A4) filling every beat.
	// - M3 (most complex): mid-measure <forward> gaps in both voices. V1 a flagged
	//   dotted-quarter F5 + eighth E5, a <forward> skipping beat 3, then a quarter D5. V2 a
	//   quarter G4, a <forward> skipping beat 2, two beamed eighths (A4, G4), then a quarter
	//   F4. The dotted notes carry their dotted duration in vexflow's tick count
	//   (src/stave-notes.ts passes `dots` to the StaveNote), so V1's beat-3 note stays
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
	// each (default layout).
	testCase('system_break.musicxml', 'system_break.png'),

	// The same eight C5 whole-note measures, but with panoramic layout: all eight sit
	// on a single uninterrupted system (no system break).
	testCase('system_break.musicxml', 'layout_panoramic.png', {
		layout: { type: 'panoramic' },
	}),
];

for (const t of TEST_CASES) {
	test(t.screenshotFilename, async () => {
		const png = await render(t.musicXMLFilename, t.renderOptions);
		expect(png).toMatchScreenshot(t.screenshotFilename);
	});
}
