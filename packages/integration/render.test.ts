// vet-ignore-file compact-files: one corpus of render cases, one test per fixture; splitting it is a refactor of its own
import { describe, expect, it } from 'bun:test';
import * as path from 'node:path';
import { fileUrl } from '@vexml/renderer';
import { testing } from './setup';

/*
 * One hand-cut fixture per case, ordered by increasing rendering complexity; whole real-world
 * scores (score_*) come last.
 *
 * lilypond_* and OSMD names in the comments refer to the upstream corpora these fixtures were
 * cut from (the Unofficial MusicXML Test Suite and OpenSheetMusicDisplay's test files).
 *
 * A new case's first `vex test` run WILL pass (the screenshot becomes its own baseline): review
 * the image, then accept it with `vex test <name> --update`.
 *
 * A stave with no <clef> engraves as treble and a part with no <time> opens in 4/4, so many
 * minimal fixtures show both; only <senza-misura> gives a blank meter (time_senza_misura).
 */

describe('render', () => {
	// Concurrent: each render borrows its own tab from the pool (see pool.ts), so
	// bun runs up to POOL_SIZE of them in parallel across separate renderer processes.

	// A single empty stave; with no <clef> or <time>, it opens with the default treble clef and 4/4.
	it.concurrent('renders structure_single_stave.png', async () => {
		expect(
			await testing.render('structure_single_stave.musicxml'),
		).toMatchScreenshot('structure_single_stave.png');
	});

	// One part with two staves (grand staff) under a brace; the default clef and 4/4 apply per stave.
	it.concurrent('renders structure_grand_staff.png', async () => {
		expect(
			await testing.render('structure_grand_staff.musicxml'),
		).toMatchScreenshot('structure_grand_staff.png');
	});

	// Two ungrouped single-stave parts: no brace, and barlines do not join across the parts.
	it.concurrent('renders structure_two_parts.png', async () => {
		expect(
			await testing.render('structure_two_parts.musicxml'),
		).toMatchScreenshot('structure_two_parts.png');
	});

	// Mixed stave counts: a single-stave part over a braced two-stave part.
	// Barlines join within the braced part but stop at the boundary between parts.
	it.concurrent('renders structure_mixed_staves.png', async () => {
		expect(
			await testing.render('structure_mixed_staves.musicxml'),
		).toMatchScreenshot('structure_mixed_staves.png');
	});

	// The four <group-symbol> values on flat <part-group>s, with <group-barline> yes/no/absent.
	// vexflow has no squared bracket, so 'square' falls back to a bracket (see partGroups).
	it.concurrent('renders structure_part_group_symbols.png', async () => {
		expect(
			await testing.render('structure_part_group_symbols.musicxml', {
				showPartLabels: true,
			}),
		).toMatchScreenshot('structure_part_group_symbols.png');
	});

	// Nested <part-group>s: a line group around a bracket group, barlines joined per group.
	it.concurrent('renders structure_part_groups.png', async () => {
		expect(
			await testing.render('structure_part_groups.musicxml'),
		).toMatchScreenshot('structure_part_groups.png');
	});

	// A <part-group> bracket on the top part: vexml lifts measure 1's number clear of the curl.
	// The two measure numbers deliberately do not line up; measure 2 keeps vexflow's placement.
	it.concurrent('renders structure_part_group_bracket_top.png', async () => {
		expect(
			await testing.render('structure_part_group_bracket_top.musicxml', {
				measureNumbering: 'every',
			}),
		).toMatchScreenshot('structure_part_group_bracket_top.png');
	});

	// showHeader reads the page-one <credit>s (title, subtitle, lyricist, composer by halign).
	// The <work-title>, page-number credit and copyright footer are deliberately not printed.
	it.concurrent('renders header.png', async () => {
		expect(
			await testing.render('header.musicxml', { showHeader: true }),
		).toMatchScreenshot('header.png');
	});

	// Header with no credits falls back to <work-title>, <movement-title> and <creator>s.
	it.concurrent('renders header_catalog.png', async () => {
		expect(
			await testing.render('header_catalog.musicxml', { showHeader: true }),
		).toMatchScreenshot('header_catalog.png');
	});

	// Header extras: a "rights" credit as the footer and a <credit-symbol> drawn as a SMuFL glyph.
	it.concurrent('renders header_extras.png', async () => {
		expect(
			await testing.render('header_extras.musicxml', { showHeader: true }),
		).toMatchScreenshot('header_extras.png');
	});

	// header.musicxml at a 330px reference width: colliding left/right credits wrap to their own rows.
	it.concurrent('renders header_narrow.png', async () => {
		expect(
			await testing.render('header_narrow.musicxml', {
				showHeader: true,
				layout: { type: 'standard', referenceWidth: 330 },
			}),
		).toMatchScreenshot('header_narrow.png');
	});

	// Tab across separate parts: notation+TAB parts get a bracket; an all-tab score gets no brace.
	// Also a <staff>2 words direction on a two-stave TAB part, and a textless power <harmony> on tab.
	it.concurrent('renders structure_tab_parts.png', async () => {
		expect(
			await testing.render('structure_tab_parts.musicxml'),
		).toMatchScreenshot('structure_tab_parts.png');
	});

	it.concurrent('renders structure_notation_and_tab_parts.png', async () => {
		expect(
			await testing.render('structure_notation_and_tab_parts.musicxml'),
		).toMatchScreenshot('structure_notation_and_tab_parts.png');
	});

	// showPartLabels: part names centered on a single-stave part and on a braced two-stave part.
	it.concurrent('renders structure_part_labels.png', async () => {
		expect(
			await testing.render('structure_part_labels.musicxml', {
				showPartLabels: true,
			}),
		).toMatchScreenshot('structure_part_labels.png');
	});

	// Part names on the first system, abbreviations after; display-text, accidental-text, print-object="no".
	it.concurrent('renders structure_part_abbreviations.png', async () => {
		expect(
			await testing.render('structure_part_abbreviations.musicxml', {
				showPartLabels: true,
			}),
		).toMatchScreenshot('structure_part_abbreviations.png');
	});

	// fonts.text overrides the text font family (Times New Roman) used for part labels.
	it.concurrent('renders font_text.png', async () => {
		expect(
			await testing.render('structure_part_labels.musicxml', {
				showPartLabels: true,
				fonts: { text: { family: 'Times New Roman' } },
			}),
		).toMatchScreenshot('font_text.png');
	});

	// fonts.notation.color, fonts.text.color and backgroundColor recolor glyphs, labels and background.
	// Covers ledger lines, octave brackets and pedals, which vexflow otherwise paints gray/black.
	it.concurrent('renders colors.png', async () => {
		expect(
			await testing.render('colors.musicxml', {
				showPartLabels: true,
				backgroundColor: '#fce4ec',
				fonts: {
					notation: { family: 'Bravura', color: '#1d4ed8' },
					text: { family: 'Source Sans 3', color: '#c2410c' },
				},
			}),
		).toMatchScreenshot('colors.png');
	});

	// fonts.notation swaps the engraving font to Petaluma.
	// The woff2 is the face VexFlow 5.0.0 embeds, loaded by url since vexml no longer pulls VexFlow's fonts.
	it.concurrent('renders font_notation_petaluma.png', async () => {
		expect(
			await testing.render('font_notation_petaluma.musicxml', {
				fonts: {
					notation: {
						family: 'Petaluma',
						url: fileUrl(
							path.resolve(import.meta.dir, '__data__/Petaluma.woff2'),
						),
					},
				},
			}),
		).toMatchScreenshot('font_notation_petaluma.png');
	});

	// A treble (G) clef stave with the default 4/4 (the fixture declares neither).
	it.concurrent('renders clef_treble.png', async () => {
		expect(await testing.render('clef_treble.musicxml')).toMatchScreenshot(
			'clef_treble.png',
		);
	});

	// A treble clef with <clef-octave-change>-1 (treble-8vb), shifting noteheads up an octave.
	// Also two stemless-in-XML voices, which must not both auto-stem down.
	it.concurrent('renders clef_treble_octave.png', async () => {
		expect(
			await testing.render('clef_treble_octave.musicxml'),
		).toMatchScreenshot('clef_treble_octave.png');
	});

	// Grand staff with treble and bass clefs, default 4/4 (no <time>).
	it.concurrent('renders clef_treble_bass.png', async () => {
		expect(await testing.render('clef_treble_bass.musicxml')).toMatchScreenshot(
			'clef_treble_bass.png',
		);
	});

	// A lone 6-line TAB stave with its stacked "TAB" label and its own begin barline.
	it.concurrent('renders clef_tab_6_string.png', async () => {
		expect(
			await testing.render('clef_tab_6_string.musicxml'),
		).toMatchScreenshot('clef_tab_6_string.png');
	});

	// A lone 4-line TAB stave with its stacked "TAB" label and its own begin barline.
	it.concurrent('renders clef_tab_4_string.png', async () => {
		expect(
			await testing.render('clef_tab_4_string.musicxml'),
		).toMatchScreenshot('clef_tab_4_string.png');
	});

	// <tuning-alter>-1 on every <staff-tuning> (E-flat standard): frets derived from the tuning.
	it.concurrent('renders clef_tab_tuning_alter.png', async () => {
		expect(
			await testing.render('clef_tab_tuning_alter.musicxml'),
		).toMatchScreenshot('clef_tab_tuning_alter.png');
	});

	// A stave marked as tab only by <staff-tuning>s (clef is octave-down treble) still renders as TAB.
	// Also a <capo> on the tab staff, printed as "Capo 3".
	it.concurrent('renders staff_details_capo.png', async () => {
		expect(
			await testing.render('staff_details_capo.musicxml'),
		).toMatchScreenshot('staff_details_capo.png');
	});

	it.concurrent('renders clef_tab_staff_tuning.png', async () => {
		expect(
			await testing.render('clef_tab_staff_tuning.musicxml'),
		).toMatchScreenshot('clef_tab_staff_tuning.png');
	});

	// Notation over TAB gets a bracket by default; key and time print on the notation stave only.
	it.concurrent('renders clef_notation_and_tab.png', async () => {
		expect(
			await testing.render('clef_notation_and_tab.musicxml'),
		).toMatchScreenshot('clef_notation_and_tab.png');
	});

	// <staff-tuning>s on both staves (as Guitar Pro exports): tuning alone must not make a staff tab.
	// Only the staff that also declares <staff-lines> renders as TAB.
	it.concurrent('renders clef_notation_and_tab_tuned.png', async () => {
		expect(
			await testing.render('clef_notation_and_tab_tuned.musicxml'),
		).toMatchScreenshot('clef_notation_and_tab_tuned.png');
	});

	// Notation over TAB with an explicit <part-symbol>bracket</part-symbol>; frets map to pitches.
	it.concurrent('renders clef_notation_and_tab_bracket.png', async () => {
		expect(
			await testing.render('clef_notation_and_tab_bracket.musicxml'),
		).toMatchScreenshot('clef_notation_and_tab_bracket.png');
	});

	// A clef change every measure (treble, alto, tenor, bass, percussion, treble-8vb) on one C4.
	it.concurrent('renders clef_c.png', async () => {
		expect(await testing.render('clef_c.musicxml')).toMatchScreenshot(
			'clef_c.png',
		);
	});

	// A clef change inside a measure, drawn as a small inline clef; no reprint at the next barline.
	// Limit: the glyph rides voice 1 only and <backup> is not rewound (see lilypond_42b-MultiVoice-MidMeasureClefChange.xml).
	// See also in_measure_clefs.xml, clef_end_measure.xml, end_measure_clefs_staffentry_bbox.xml.
	it.concurrent('renders clef_mid_measure.png', async () => {
		expect(await testing.render('clef_mid_measure.musicxml')).toMatchScreenshot(
			'clef_mid_measure.png',
		);
	});

	// <unpitched> notes: <display-step>/<display-octave> set position, <notehead> sets the glyph.
	it.concurrent('renders percussion_display_step.png', async () => {
		expect(
			await testing.render('percussion_display_step.musicxml'),
		).toMatchScreenshot('percussion_display_step.png');
	});

	// Percussion clef on a 5-line and a 1-line (reduced) stave, from lilypond_73a-Percussion M1-2.
	// vexflow draws no ledger lines on a reduced stave (MuseScore does). See also drumset.xml, tutorial_percussion.xml.
	it.concurrent('renders clef_percussion.png', async () => {
		expect(await testing.render('clef_percussion.musicxml')).toMatchScreenshot(
			'clef_percussion.png',
		);
	});

	// <staff-lines> on non-tab staves: a 1-line part, and a part changing 5/4/2 lines per measure.
	// Mid-measure line-count changes are unsupported, so M3's change sits at the barline (unlike lilypond_14a).
	it.concurrent('renders line_detail.png', async () => {
		expect(await testing.render('line_detail.musicxml')).toMatchScreenshot(
			'line_detail.png',
		);
	});

	it.concurrent('renders clef_after_barline.png', async () => {
		expect(
			await testing.render('clef_after_barline.musicxml'),
		).toMatchScreenshot('clef_after_barline.png');
	});

	// Clef size attribute: full, cue and large on clef changes (cue ignores its <line> as the spec says).
	it.concurrent('renders clef_size.png', async () => {
		expect(await testing.render('clef_size.musicxml')).toMatchScreenshot(
			'clef_size.png',
		);
	});

	it.concurrent('renders staff_details_lines.png', async () => {
		expect(
			await testing.render('staff_details_lines.musicxml'),
		).toMatchScreenshot('staff_details_lines.png');
	});

	// <staff-size>: the first part shrinks to 60 percent from M2 (an ossia or cue staff).
	it.concurrent('renders staff_details_size.png', async () => {
		expect(
			await testing.render('staff_details_size.musicxml'),
		).toMatchScreenshot('staff_details_size.png');
	});

	// <staff-type>: ossia staff at 75 percent only where it holds notes; cue staff at 75 percent.
	it.concurrent('renders staff_type.png', async () => {
		expect(await testing.render('staff_type.musicxml')).toMatchScreenshot(
			'staff_type.png',
		);
	});

	// Key signatures and mid-system changes, with naturals cancelling a sharps/flats flip.
	// M4's G# minor must render via the 'G#m' vexflow spec; bare 'G#' is invalid and throws.
	it.concurrent('renders key.png', async () => {
		expect(await testing.render('key.musicxml')).toMatchScreenshot('key.png');
	});

	// Every <mode> under the same <fifths>2: the signature never changes; mode must not leak into the vexflow key spec.
	it.concurrent('renders key_modes.png', async () => {
		expect(await testing.render('key_modes.musicxml')).toMatchScreenshot(
			'key_modes.png',
		);
	});

	// Non-traditional keys: <key-step>/<key-alter>, <key-octave> pinning and <key-accidental>.
	// Limit: unpinned custom G♯ sits inside the stave, unlike <fifths>. See also lilypond_13d-KeySignatures-Microtones.xml.
	it.concurrent('renders key_non_traditional.png', async () => {
		expect(
			await testing.render('key_non_traditional.musicxml'),
		).toMatchScreenshot('key_non_traditional.png');
	});

	// Key changes on a grand staff with <cancel>, including location right and before-barline.
	it.concurrent('renders key_cancel.png', async () => {
		expect(await testing.render('key_cancel.musicxml')).toMatchScreenshot(
			'key_cancel.png',
		);
	});

	// Time signatures and mid-system meter changes: common, cut and numeric 3/4.
	it.concurrent('renders time.png', async () => {
		expect(await testing.render('time.musicxml')).toMatchScreenshot('time.png');
	});

	// Additive meters (3+2/8, 5+3+1/4): numerator terms are summed, not parsed with Number().
	// An underfull measure reserves the missing beat as blank space before the end barline.
	it.concurrent('renders time_compound.png', async () => {
		expect(await testing.render('time_compound.musicxml')).toMatchScreenshot(
			'time_compound.png',
		);
	});

	// <time> forms beyond vexflow's spec: note-glyph denominators, <interchangeable>, multiple pairs.
	it.concurrent('renders time_extended.png', async () => {
		expect(await testing.render('time_extended.musicxml')).toMatchScreenshot(
			'time_extended.png',
		);
	});

	// <time separator> values: none, horizontal, diagonal, vertical and adjacent.
	it.concurrent('renders time_separator.png', async () => {
		expect(await testing.render('time_separator.musicxml')).toMatchScreenshot(
			'time_separator.png',
		);
	});

	// <group-time/> on a <part-group> draws one large time signature across the group's staves.
	it.concurrent('renders time_group.png', async () => {
		expect(await testing.render('time_group.musicxml')).toMatchScreenshot(
			'time_group.png',
		);
	});

	// <time symbol="single-number"> prints the beat count alone.
	it.concurrent('renders time_single_number.png', async () => {
		expect(
			await testing.render('time_single_number.musicxml'),
		).toMatchScreenshot('time_single_number.png');
	});

	// <senza-misura> prints no time signature, unlike an omitted <time>, which assumes 4/4.
	it.concurrent('renders time_senza_misura.png', async () => {
		expect(
			await testing.render('time_senza_misura.musicxml'),
		).toMatchScreenshot('time_senza_misura.png');
	});

	// Single notes: durations, default stem direction, explicit <stem>, and <stem>none</stem>.
	it.concurrent('renders note.png', async () => {
		expect(await testing.render('note.musicxml')).toMatchScreenshot('note.png');
	});

	// Logarithmic spacing: measure width tracks note count, not ticks; trailing system unjustified.
	it.concurrent('renders note_density.png', async () => {
		expect(await testing.render('note_density.musicxml')).toMatchScreenshot(
			'note_density.png',
		);
	});

	// Dotted notes: single dots, double dots, and dots inside beams.
	it.concurrent('renders dotted_notes.png', async () => {
		expect(await testing.render('dotted_notes.musicxml')).toMatchScreenshot(
			'dotted_notes.png',
		);
	});

	// Rest durations, a typeless Finale spacer rest filling the bar, and two voices' rests offset apart.
	it.concurrent('renders rest.png', async () => {
		expect(await testing.render('rest.musicxml')).toMatchScreenshot('rest.png');
	});

	// Rests with no <type>: <rest measure="yes"/> and bar-filling rests draw whole; a one-beat rest a quarter.
	it.concurrent('renders rest_measure_typeless.png', async () => {
		expect(
			await testing.render('rest_measure_typeless.musicxml'),
		).toMatchScreenshot('rest_measure_typeless.png');
	});

	// Rests positioned by <display-step>/<display-octave>; rests take no ledger lines.
	// See also rest_positioning_*.xml for the realistic two-voice version.
	it.concurrent('renders rest_pitched.png', async () => {
		expect(await testing.render('rest_pitched.musicxml')).toMatchScreenshot(
			'rest_pitched.png',
		);
	});

	// <multiple-rest> collapses resting bars into one measure; measureNumbering 'every' shows the skip.
	// A <multiple-rest>1 stays a whole-rest bar; runs collapse only when every part and staff agree.
	// See also multiple_rest_measures.xml, auto_multirest.xml, measure_numbers_xml_starting_at_3_with_multirest.xml.
	it.concurrent('renders rest_multi_measure.png', async () => {
		expect(
			await testing.render('rest_multi_measure.musicxml', {
				measureNumbering: 'every',
			}),
		).toMatchScreenshot('rest_multi_measure.png');
	});

	// <multiple-rest use-symbols="yes"> draws old-style rest symbols; use-symbols="no" for comparison.
	it.concurrent('renders rest_multi_measure_symbols.png', async () => {
		expect(
			await testing.render('rest_multi_measure_symbols.musicxml', {
				measureNumbering: 'every',
			}),
		).toMatchScreenshot('rest_multi_measure_symbols.png');
	});

	// <measure-style> signs: one- and two-bar <measure-repeat>, <beat-repeat>, and <slash> notation.
	it.concurrent('renders measure_style.png', async () => {
		expect(await testing.render('measure_style.musicxml')).toMatchScreenshot(
			'measure_style.png',
		);
	});

	// Every accidental form: standard, quarter-tone, cautionary/editorial, Gould arrows, Persian,
	// Turkish slash and comma, SMuFL "other", and accidental parentheses/bracket attributes.
	it.concurrent('renders accidentals.png', async () => {
		expect(await testing.render('accidentals.musicxml')).toMatchScreenshot(
			'accidentals.png',
		);
	});

	// <divisions> changing mid-measure rescales <duration>; the rhythm must stay evenly spaced.
	it.concurrent('renders divisions_change.png', async () => {
		expect(await testing.render('divisions_change.musicxml')).toMatchScreenshot(
			'divisions_change.png',
		);
	});

	// <note print-object="no">: hidden notes and rests keep their ticks; their lyrics still print.
	// Limit: hiding reads the chord's lead note; print-object on <staff>/<measure> is ignored.
	it.concurrent('renders invisible_notes.png', async () => {
		expect(await testing.render('invisible_notes.musicxml')).toMatchScreenshot(
			'invisible_notes.png',
		);
	});

	// print-dot, print-leger, print-lyric, <notations>/<ending> print-object and <staff-details> print-object.
	it.concurrent('renders print_object.png', async () => {
		expect(await testing.render('print_object.musicxml')).toMatchScreenshot(
			'print_object.png',
		);
	});

	// print-object="no" on <key>, <time> and <clef>, then a visible key change.
	it.concurrent('renders print_object_signatures.png', async () => {
		expect(
			await testing.render('print_object_signatures.musicxml'),
		).toMatchScreenshot('print_object_signatures.png');
	});

	// Editorial marks on notes: <level> parentheses and bracket, and <footnote> text.
	it.concurrent('renders editorial_marks.png', async () => {
		expect(await testing.render('editorial_marks.musicxml')).toMatchScreenshot(
			'editorial_marks.png',
		);
	});

	// MusicXML color attributes on <note>, <notehead> and <stem> (color.xml M1-2), not the colors.png config.
	// Limit: <beam color> and <lyric color> are ignored. See also auto_custom_coloring_entchen.xml.
	it.concurrent('renders note_color.png', async () => {
		expect(await testing.render('note_color.musicxml')).toMatchScreenshot(
			'note_color.png',
		);
	});

	// <metronome> marks, lifted clear of high notes and stacked above a chord symbol.
	it.concurrent('renders tempo.png', async () => {
		expect(await testing.render('tempo.musicxml')).toMatchScreenshot(
			'tempo.png',
		);
	});

	// <metronome> variants: <beat-unit-dot>, unit = unit, parentheses, <metronome-note> and <metronome-dot>.
	// Limit: playback reads the bpm as quarter-note bpm and ignores the swing figure.
	it.concurrent('renders tempo_beat_unit_dot.png', async () => {
		expect(
			await testing.render('tempo_beat_unit_dot.musicxml'),
		).toMatchScreenshot('tempo_beat_unit_dot.png');
	});

	// <beat-unit-tied>, <metronome-arrows>, <metronome-tied>, and justify on a metronome mark.
	it.concurrent('renders tempo_metronome_extras.png', async () => {
		expect(
			await testing.render('tempo_metronome_extras.musicxml'),
		).toMatchScreenshot('tempo_metronome_extras.png');
	});

	// <words> directions: placement above/below, lifted clear of notes, slurs and tuplet numbers.
	// Also end-of-bar and over-rest anchoring, and <other-direction> as SMuFL glyph or text.
	it.concurrent('renders words.png', async () => {
		expect(await testing.render('words.musicxml')).toMatchScreenshot(
			'words.png',
		);
	});

	// Text formatting on <words>, <rehearsal> and <dynamics>: style, weight, size, underline,
	// every enclosure shape, justify and halign, one attribute per measure.
	it.concurrent('renders text_formatting.png', async () => {
		expect(await testing.render('text_formatting.musicxml')).toMatchScreenshot(
			'text_formatting.png',
		);
	});

	// documentFonts: text takes its document's font-family, word-font and lyric-font faces.
	// The mono face is pinned because Chromium resolves generic monospace inconsistently.
	it.concurrent('renders text_font_family.png', async () => {
		expect(
			await testing.render('text_font_family.musicxml', {
				documentFonts: true,
			}),
		).toMatchScreenshot('text_font_family.png');
	});

	// <score-timewise> input is regrouped as partwise and renders like a partwise score.
	it.concurrent('renders score_timewise.png', async () => {
		expect(await testing.render('score_timewise.musicxml')).toMatchScreenshot(
			'score_timewise.png',
		);
	});

	// Lyric and dynamic font-size read relative to <defaults> lyric-font and music-font sizes.
	it.concurrent('renders text_lyric_music_font.png', async () => {
		expect(
			await testing.render('text_lyric_music_font.musicxml'),
		).toMatchScreenshot('text_lyric_music_font.png');
	});

	// <attributes><directive>, direction directive="yes", and <offset> shifting words and chords.
	it.concurrent('renders directives_offsets.png', async () => {
		expect(
			await testing.render('directives_offsets.musicxml'),
		).toMatchScreenshot('directives_offsets.png');
	});

	// The full <dynamics> vocabulary as SMuFL glyphs, plus <other-dynamics> text fallback.
	// A repeated level prints once; accents like sfz always print.
	it.concurrent('renders dynamics.png', async () => {
		expect(await testing.render('dynamics.musicxml')).toMatchScreenshot(
			'dynamics.png',
		);
	});

	// <wedge> hairpins: placement, clearing slurs, ledger lines and words, and spread widths.
	it.concurrent('renders wedges.png', async () => {
		expect(await testing.render('wedges.musicxml')).toMatchScreenshot(
			'wedges.png',
		);
	});

	// A hairpin between grand-staff staves shares the gap with a tie (Schubert, Der Lindenbaum m. 79).
	it.concurrent('renders wedges_grand_staff.png', async () => {
		expect(
			await testing.render('wedges_grand_staff.musicxml'),
		).toMatchScreenshot('wedges_grand_staff.png');
	});

	// <octave-shift> 8va/8vb/15ma/15mb: label prints and covered notes draw shifted (lilypond_33d-Spanners-OctaveShifts M1).
	// TODO: shifts with no note in their measure are dropped; spans across systems don't split.
	// See also octave_shift_simple_piano.xml.
	it.concurrent('renders octave_shift.png', async () => {
		expect(await testing.render('octave_shift.musicxml')).toMatchScreenshot(
			'octave_shift.png',
		);
	});

	// An <octave-shift> on the treble staff leaves the bass staff's notes unshifted.
	it.concurrent('renders octave_shift_grand_staff.png', async () => {
		expect(
			await testing.render('octave_shift_grand_staff.musicxml'),
		).toMatchScreenshot('octave_shift_grand_staff.png');
	});

	// <bracket> line-end/line-type variants and <dashes>, alone and trailing "cresc." (lilypond_33a-Spanners M10-15).
	// TODO: line-end="arrow" draws as "down", wavy falls back to solid, wrapped spans are dropped.
	it.concurrent('renders direction_lines.png', async () => {
		expect(await testing.render('direction_lines.musicxml')).toMatchScreenshot(
			'direction_lines.png',
		);
	});

	// Symbol-style directions: damp, damp-all, eyeglasses, string-mute, staff-divide, principal-voice, <symbol>.
	it.concurrent('renders direction_symbols.png', async () => {
		expect(
			await testing.render('direction_symbols.musicxml'),
		).toMatchScreenshot('direction_symbols.png');
	});

	// <percussion> pictograms, <other-percussion>, <accordion-registration> and <scordatura> directions.
	it.concurrent('renders direction_pictograms.png', async () => {
		expect(
			await testing.render('direction_pictograms.musicxml'),
		).toMatchScreenshot('direction_pictograms.png');
	});

	// <segno> and <coda> drawn as SMuFL glyphs at the measure's left edge, stacked clear of text.
	// Engraving only: D.C./D.S. playback is deliberately out of scope; sign placement/offset is ignored.
	// See also stave_repetitions_coda_etc_positioning.xml.
	it.concurrent('renders navigation.png', async () => {
		expect(await testing.render('navigation.musicxml')).toMatchScreenshot(
			'navigation.png',
		);
	});

	// <lyric> basics: hyphenated syllables, gaps, multiple verses, varied pitches, below-stave marks.
	it.concurrent('renders lyrics.png', async () => {
		expect(await testing.render('lyrics.musicxml')).toMatchScreenshot(
			'lyrics.png',
		);
	});

	// Melismas: <lyric><extend/> draws an extender line; a syllable without <extend/> draws none.
	// TODO: extenders stop at the stave's end rather than crossing barlines or system breaks.
	it.concurrent('renders lyrics_melisma.png', async () => {
		expect(await testing.render('lyrics_melisma.musicxml')).toMatchScreenshot(
			'lyrics_melisma.png',
		);
	});

	// <lyric justify>: left, center, right, and the centered default.
	it.concurrent('renders lyrics_justify.png', async () => {
		expect(await testing.render('lyrics_justify.musicxml')).toMatchScreenshot(
			'lyrics_justify.png',
		);
	});

	// <elision>: several syllables on one note; an empty <elision/> prints as a space.
	it.concurrent('renders lyrics_elision.png', async () => {
		expect(await testing.render('lyrics_elision.musicxml')).toMatchScreenshot(
			'lyrics_elision.png',
		);
	});

	// <humming/> and <laughing/> lyrics; <end-line/> and <end-paragraph/> change nothing.
	it.concurrent('renders lyrics_sounds.png', async () => {
		expect(await testing.render('lyrics_sounds.musicxml')).toMatchScreenshot(
			'lyrics_sounds.png',
		);
	});

	// Lyrics under two voices: each voice's verse rows offset below rows earlier voices used.
	// See also lilypond_61c-Lyrics-Pianostaff.xml and lilypond_61e-Lyrics-Chords.xml.
	it.concurrent('renders lyrics_two_voices.png', async () => {
		expect(
			await testing.render('lyrics_two_voices.musicxml'),
		).toMatchScreenshot('lyrics_two_voices.png');
	});

	// <rehearsal> marks: boxed above the measure number, lifted over high notes, widened for long labels.
	it.concurrent('renders rehearsal.png', async () => {
		expect(await testing.render('rehearsal.musicxml')).toMatchScreenshot(
			'rehearsal.png',
		);
	});

	// <harp-pedals> diagrams: all centered, raised/lowered, placed below, and partially specified.
	it.concurrent('renders harp_pedals.png', async () => {
		expect(await testing.render('harp_pedals.musicxml')).toMatchScreenshot(
			'harp_pedals.png',
		);
	});

	// Two whole-note measures split by a barline.
	it.concurrent('renders measures_two.png', async () => {
		expect(await testing.render('measures_two.musicxml')).toMatchScreenshot(
			'measures_two.png',
		);
	});

	// Multi-stave barlines drawn by stave connectors, with a final thin-thick end barline.
	it.concurrent('renders measures_end_barline.png', async () => {
		expect(
			await testing.render('measures_end_barline.musicxml'),
		).toMatchScreenshot('measures_end_barline.png');
	});

	// An explicit right <barline> with <bar-style>light-light</bar-style>.
	it.concurrent('renders measures_light_light.png', async () => {
		expect(
			await testing.render('measures_light_light.musicxml'),
		).toMatchScreenshot('measures_light_light.png');
	});

	// The whole non-repeat <bar-style> vocabulary, one style per measure. See also bar_lines.xml.
	// TODO: multi-stave connectors only support light-light and light-heavy, not dotted/dashed/heavy.
	it.concurrent('renders barline_styles.png', async () => {
		expect(await testing.render('barline_styles.musicxml')).toMatchScreenshot(
			'barline_styles.png',
		);
	});

	// <barline location="middle">: a dotted divider mid-measure, spaced like a note, not splitting numbering.
	// TODO: rides the first voice only; a multi-voice measure could place it early.
	it.concurrent('renders barline_mid_measure.png', async () => {
		expect(
			await testing.render('barline_mid_measure.musicxml'),
		).toMatchScreenshot('barline_mid_measure.png');
	});

	// <measure implicit="yes">: pickups and split measures sized to their music, unnumbered, unpadded.
	// See implicit_pickup_measure_width.xml, pickup_measure_double_rhythm.xml, lilypond_46f-IncompleteMeasures.xml,
	// and lilypond_46e-PickupMeasure-SecondVoiceStartsLater.xml.
	it.concurrent('renders pickup_measure.png', async () => {
		expect(await testing.render('pickup_measure.musicxml')).toMatchScreenshot(
			'pickup_measure.png',
		);
	});

	// Repeat barlines and volta brackets: back-to-back repeats, multi-ending blocks, discontinue.
	// Brackets clear chord symbols, high notes, accidentals and slurs at one shared height per system.
	it.concurrent('renders repeats.png', async () => {
		expect(await testing.render('repeats.musicxml')).toMatchScreenshot(
			'repeats.png',
		);
	});

	// Repeat barlines across a notation stave and a TAB stave: aligned, unbroken, dots per stave.
	it.concurrent('renders repeats_notation_and_tab.png', async () => {
		expect(
			await testing.render('repeats_notation_and_tab.musicxml'),
		).toMatchScreenshot('repeats_notation_and_tab.png');
	});

	// <repeat direction="backward" times="5"> prints a "5x" label; times="2" or none prints none.
	it.concurrent('renders repeats_multiple_times.png', async () => {
		expect(
			await testing.render('repeats_multiple_times.musicxml'),
		).toMatchScreenshot('repeats_multiple_times.png');
	});

	// One measure opening and closing its own repeat.
	it.concurrent('renders repeats_single_measure.png', async () => {
		expect(
			await testing.render('repeats_single_measure.musicxml'),
		).toMatchScreenshot('repeats_single_measure.png');
	});

	// <repeat winged> variants and <ending> end-length and text-x.
	it.concurrent('renders repeats_geometry.png', async () => {
		expect(await testing.render('repeats_geometry.musicxml')).toMatchScreenshot(
			'repeats_geometry.png',
		);
	});

	// A repeat block nested inside another, each with its own two endings.
	// See also lilypond_45e-Repeats-Nested-Alternatives.xml.
	it.concurrent('renders repeats_nested.png', async () => {
		expect(await testing.render('repeats_nested.musicxml')).toMatchScreenshot(
			'repeats_nested.png',
		);
	});

	// config.gaps: a labeled, filled leading edge gap and a plain mid gap, skipped by measure numbering.
	it.concurrent('renders measures_gap.png', async () => {
		expect(
			await testing.render('measures_two.musicxml', {
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
		).toMatchScreenshot('measures_gap.png');
	});

	// config.gaps: a leading labeled gap with fill and border before a grand staff, open toward the brace.
	it.concurrent('renders measures_gap_grand_staff.png', async () => {
		expect(
			await testing.render('clef_treble_bass.musicxml', {
				gaps: [
					{
						beforeMeasureIndex: 0,
						durationMs: 3000,
						label: 'Intro',
						minWidth: 150,
						style: { fill: '#f2f2f2', border: '#d9d9d9' },
					},
				],
			}),
		).toMatchScreenshot('measures_gap_grand_staff.png');
	});

	// Beam variations: slopes, flat beams on non-monotonic runs and chords, rests within beams, partial beams.
	it.concurrent('renders beam_variations.png', async () => {
		expect(await testing.render('beam_variations.musicxml')).toMatchScreenshot(
			'beam_variations.png',
		);
	});

	// Quarter-note chords: triad, second, cluster, and a chord with a second on top.
	it.concurrent('renders chord.png', async () => {
		expect(await testing.render('chord.musicxml')).toMatchScreenshot(
			'chord.png',
		);
	});

	// Ledger lines on every natural pitch from F3 to E6.
	it.concurrent('renders ledger_lines.png', async () => {
		expect(await testing.render('ledger_lines.musicxml')).toMatchScreenshot(
			'ledger_lines.png',
		);
	});

	// Ties on single notes: within a measure, split across a system break, and tied-note accidental suppression.
	it.concurrent('renders tie.png', async () => {
		expect(await testing.render('tie.musicxml')).toMatchScreenshot('tie.png');
	});

	// A three-note tie chain whose middle note lists <tied start> before <tied stop>.
	// mdom before 0.2.4 mis-paired this into one long arc.
	it.concurrent('renders tie_chain.png', async () => {
		expect(await testing.render('tie_chain.musicxml')).toMatchScreenshot(
			'tie_chain.png',
		);
	});

	// Tied stem-up triad: bottom tie bows under, upper two bow over.
	it.concurrent('renders tie_chord_triad.png', async () => {
		expect(await testing.render('tie_chord_triad.musicxml')).toMatchScreenshot(
			'tie_chord_triad.png',
		);
	});

	// Tied two-note chord: lower tie bows under, upper bows over.
	it.concurrent('renders tie_chord_dyad.png', async () => {
		expect(await testing.render('tie_chord_dyad.musicxml')).toMatchScreenshot(
			'tie_chord_dyad.png',
		);
	});

	// Tied four-note chord across an octave: two ties under, two over.
	it.concurrent('renders tie_chord_octave.png', async () => {
		expect(await testing.render('tie_chord_octave.musicxml')).toMatchScreenshot(
			'tie_chord_octave.png',
		);
	});

	// Tied second with offset noteheads: lower bows under, upper over.
	it.concurrent('renders tie_chord_second.png', async () => {
		expect(await testing.render('tie_chord_second.musicxml')).toMatchScreenshot(
			'tie_chord_second.png',
		);
	});

	// Tied cluster of stacked seconds: lower half under, upper half over.
	it.concurrent('renders tie_chord_cluster.png', async () => {
		expect(
			await testing.render('tie_chord_cluster.musicxml'),
		).toMatchScreenshot('tie_chord_cluster.png');
	});

	// A tied chord split across a system break, detected by stave row rather than x.
	// referenceWidth 360 forces the break between M1 and M2.
	it.concurrent('renders tie_system_break.png', async () => {
		expect(
			await testing.render('tie_system_break.musicxml', {
				layout: { type: 'standard', referenceWidth: 360 },
			}),
		).toMatchScreenshot('tie_system_break.png');
	});

	// A slur with no placement over stem-down notes bows above.
	it.concurrent('renders slur_default.png', async () => {
		expect(await testing.render('slur_default.musicxml')).toMatchScreenshot(
			'slur_default.png',
		);
	});

	// A stem-up slur with no placement bows above, clear of the other voice's rest.
	it.concurrent('renders slur_over_rest.png', async () => {
		expect(await testing.render('slur_over_rest.musicxml')).toMatchScreenshot(
			'slur_over_rest.png',
		);
	});

	// A slur with explicit placement="above".
	it.concurrent('renders slur_above.png', async () => {
		expect(await testing.render('slur_above.musicxml')).toMatchScreenshot(
			'slur_above.png',
		);
	});

	// A slur over stem-up notes bows below.
	it.concurrent('renders slur_stem_up.png', async () => {
		expect(await testing.render('slur_stem_up.musicxml')).toMatchScreenshot(
			'slur_stem_up.png',
		);
	});

	// Slurs whose ends have opposing stem directions, with and without explicit placement.
	it.concurrent('renders slur_mixed_stems.png', async () => {
		expect(await testing.render('slur_mixed_stems.musicxml')).toMatchScreenshot(
			'slur_mixed_stems.png',
		);
	});

	// A slur across a wide downward leap.
	it.concurrent('renders slur_leap.png', async () => {
		expect(await testing.render('slur_leap.musicxml')).toMatchScreenshot(
			'slur_leap.png',
		);
	});

	// Slurs over beamed runs: clearing near-end high notes and flattening at the depth ceiling.
	it.concurrent('renders slur_beamed.png', async () => {
		expect(await testing.render('slur_beamed.musicxml')).toMatchScreenshot(
			'slur_beamed.png',
		);
	});

	// Slurs over staccatos, accents and tenutos on the slur's side clear the articulations.
	it.concurrent('renders slur_articulations.png', async () => {
		expect(
			await testing.render('slur_articulations.musicxml'),
		).toMatchScreenshot('slur_articulations.png');
	});

	// Two independent slurs in one measure using distinct slur numbers.
	it.concurrent('renders slur_multiple.png', async () => {
		expect(await testing.render('slur_multiple.musicxml')).toMatchScreenshot(
			'slur_multiple.png',
		);
	});

	// Slurs written on a chord's non-lead note.
	it.concurrent('renders slur_chords.png', async () => {
		expect(await testing.render('slur_chords.musicxml')).toMatchScreenshot(
			'slur_chords.png',
		);
	});

	// Chained overlapping slurs with distinct numbers; notes carry both a stop and a start.
	it.concurrent('renders slur_chained.png', async () => {
		expect(await testing.render('slur_chained.musicxml')).toMatchScreenshot(
			'slur_chained.png',
		);
	});

	// A slur split across a system break into two partial arcs.
	// referenceWidth 350 forces the break between M1 and M2.
	it.concurrent('renders slur_system_break.png', async () => {
		expect(
			await testing.render('slur_system_break.musicxml', {
				layout: { type: 'standard', referenceWidth: 350 },
			}),
		).toMatchScreenshot('slur_system_break.png');
	});

	// A slur spanning a whole measure before a system break continues to the system's right edge.
	// referenceWidth 520 puts two measures on each system.
	it.concurrent('renders slur_system_break_long.png', async () => {
		expect(
			await testing.render('slur_system_break_long.musicxml', {
				layout: { type: 'standard', referenceWidth: 520 },
			}),
		).toMatchScreenshot('slur_system_break_long.png');
	});

	// A staff-1 hairpin in a measure whose first note is on staff 2 still draws on staff 1.
	it.concurrent('renders hairpin_other_staff_first.png', async () => {
		expect(
			await testing.render('hairpin_other_staff_first.musicxml'),
		).toMatchScreenshot('hairpin_other_staff_first.png');
	});

	// A crescendo spanning a whole measure before a system break continues to the system's right edge.
	// referenceWidth 520 puts two measures on each system.
	it.concurrent('renders hairpin_system_break_long.png', async () => {
		expect(
			await testing.render('hairpin_system_break_long.musicxml', {
				layout: { type: 'standard', referenceWidth: 520 },
			}),
		).toMatchScreenshot('hairpin_system_break_long.png');
	});

	// <slur line-type>: solid, dashed, dotted, and wavy (falls back to solid).
	it.concurrent('renders slur_line_types.png', async () => {
		expect(await testing.render('slur_line_types.musicxml')).toMatchScreenshot(
			'slur_line_types.png',
		);
	});

	// Spanner line types and orientations: dashed/dotted ties, slurs, glissando, slide, crescendo.
	// Also <tied orientation>, <slur orientation>, and hairpins from or to nothing.
	it.concurrent('renders spanner_line_types.png', async () => {
		expect(
			await testing.render('spanner_line_types.musicxml'),
		).toMatchScreenshot('spanner_line_types.png');
	});

	// <slur> with no placement takes its side from the sign of bezier-y; explicit placement wins.
	it.concurrent('renders slur_bezier_side.png', async () => {
		expect(await testing.render('slur_bezier_side.musicxml')).toMatchScreenshot(
			'slur_bezier_side.png',
		);
	});

	// Number-1 slurs paired across a <backup>: stop before start in document order, and nested voices.
	// A stop claims the start from its own voice; unplaced slurs go on each voice's stem side.
	it.concurrent('renders slur_backup_voices.png', async () => {
		expect(
			await testing.render('slur_backup_voices.musicxml'),
		).toMatchScreenshot('slur_backup_voices.png');
	});

	// Cross-stave slurs: placement is overridden to bow above (see crossStave in slur-builder.ts).
	// Reduced from Schumann's 'Dichterliebe' mm. 4-5; plus a ghost-stave fallback and an omitted
	// slur when every bow is blocked by other voices.
	it.concurrent('renders slur_cross_stave_ghost.png', async () => {
		expect(
			await testing.render('slur_cross_stave_ghost.musicxml'),
		).toMatchScreenshot('slur_cross_stave_ghost.png');
	});

	it.concurrent('renders slur_cross_stave.png', async () => {
		expect(await testing.render('slur_cross_stave.musicxml')).toMatchScreenshot(
			'slur_cross_stave.png',
		);
	});

	// <pedal> variants: text vs bracket line, change, sign+line, abbreviated, sostenuto, discontinue/resume.
	// Text pedals over low notes drop below them instead of printing through.
	it.concurrent('renders pedal.png', async () => {
		expect(await testing.render('pedal.musicxml')).toMatchScreenshot(
			'pedal.png',
		);
	});

	// TAB hammer-ons/pull-offs from <slur>s or <technical> markers, drawn as plain arcs without H/P labels.
	// Covers chords, slur+slide overlap, a slur spanning techniques, and a stray Guitar Pro slur start.
	it.concurrent('renders tab_hammer_pull.png', async () => {
		expect(await testing.render('tab_hammer_pull.musicxml')).toMatchScreenshot(
			'tab_hammer_pull.png',
		);
	});

	// tab_hammer_pull at a width that breaks between M3 and M4, splitting the pull-off tie across systems.
	// The width is load-bearing: at 320 and up M3 and M4 share a system and nothing splits.
	it.concurrent('renders tab_hammer_pull_wrap.png', async () => {
		expect(
			await testing.render('tab_hammer_pull.musicxml', {
				layout: { type: 'standard', referenceWidth: 300 },
			}),
		).toMatchScreenshot('tab_hammer_pull_wrap.png');
	});

	// TAB ties vs slurs: a tied (held) fret is dropped, a slurred fret change prints.
	// A fully held beat keeps a ghost note so the tab stays aligned (see vexflowTabTickables).
	it.concurrent('renders tab_tie.png', async () => {
		expect(await testing.render('tab_tie.musicxml')).toMatchScreenshot(
			'tab_tie.png',
		);
	});

	// TAB grace notes: single, paired, and slurred to the main note.
	it.concurrent('renders tab_grace.png', async () => {
		expect(await testing.render('tab_grace.musicxml')).toMatchScreenshot(
			'tab_grace.png',
		);
	});

	// Notation+TAB parts: a TAB grace fret aligns under its grace notehead, not dragged by an accidental.
	it.concurrent('renders tab_grace_notation_align.png', async () => {
		expect(
			await testing.render('tab_grace_notation_align.musicxml'),
		).toMatchScreenshot('tab_grace_notation_align.png');
	});

	// Like tab_grace_notation_align with grace CHORDS before main chords that carry their own accidentals.
	// Guards against the main chord's accidental dragging the grace frets right (old shared modLeftPx).
	it.concurrent('renders tab_grace_chord_align.png', async () => {
		expect(
			await testing.render('tab_grace_chord_align.musicxml'),
		).toMatchScreenshot('tab_grace_chord_align.png');
	});

	// TAB <slide>s up and down, drawn as tilted lines; 'sl.' labels off by default (showTabSlideText).
	it.concurrent('renders tab_slide.png', async () => {
		expect(await testing.render('tab_slide.musicxml')).toMatchScreenshot(
			'tab_slide.png',
		);
	});

	// tab_slide with showTabSlideText: true, printing the 'sl.' labels.
	it.concurrent('renders tab_slide_text.png', async () => {
		expect(
			await testing.render('tab_slide.musicxml', {
				showTabSlideText: true,
			}),
		).toMatchScreenshot('tab_slide_text.png');
	});

	// The same slides on a notation stave and a TAB stave; the TAB string line is erased under each slide.
	it.concurrent('renders tab_slide_notation.png', async () => {
		expect(
			await testing.render('tab_slide_notation.musicxml'),
		).toMatchScreenshot('tab_slide_notation.png');
	});

	// <glissando> start/stop pairs, one crossing a barline, and a lone stop drawn as a glissando into a note.
	it.concurrent('renders glissando.png', async () => {
		expect(await testing.render('glissando.musicxml')).toMatchScreenshot(
			'glissando.png',
		);
	});

	// Unpaired <slide type="stop"> (slide into a note) on notation and TAB staves.
	it.concurrent('renders slide_in.png', async () => {
		expect(await testing.render('slide_in.musicxml')).toMatchScreenshot(
			'slide_in.png',
		);
	});

	// Unpaired <slide type="start"> (slide out of a note) on notation and TAB staves; mirror of slide_in.
	it.concurrent('renders slide_out.png', async () => {
		expect(await testing.render('slide_out.musicxml')).toMatchScreenshot(
			'slide_out.png',
		);
	});

	// TAB <bend>s: whole/half step, bend-and-release, angled shape, pre-bend, whammy bar, <with-bar/>.
	// A words direction over a bend clears the arrow and its label.
	it.concurrent('renders tab_bend.png', async () => {
		expect(await testing.render('tab_bend.musicxml')).toMatchScreenshot(
			'tab_bend.png',
		);
	});

	// TAB vibrato runs to the next note or the bar's end, whichever comes first.
	it.concurrent('renders tab_vibrato.png', async () => {
		expect(await testing.render('tab_vibrato.musicxml')).toMatchScreenshot(
			'tab_vibrato.png',
		);
	});

	// TAB <other-technical> text annotations (P.M., x), and a words direction clearing a slur's arc.
	it.concurrent('renders tab_annotation.png', async () => {
		expect(await testing.render('tab_annotation.musicxml')).toMatchScreenshot(
			'tab_annotation.png',
		);
	});

	// Words directions on a TAB part centered on their note column, with varied text widths.
	// On a first note the word gets leading room (leadingWordsPad); at a system start behind a repeat
	// it is bounded to the note area. Unjustified last system (see system_break).
	it.concurrent('renders tab_words_align.png', async () => {
		expect(await testing.render('tab_words_align.musicxml')).toMatchScreenshot(
			'tab_words_align.png',
		);
	});

	// TAB chords of varied density, a grace before a chord, and string/fret derived from <staff-tuning>
	// for pitch-only notes (highest string that reaches it; see derivePosition in voice-translator.ts).
	it.concurrent('renders tab_chord.png', async () => {
		expect(await testing.render('tab_chord.musicxml')).toMatchScreenshot(
			'tab_chord.png',
		);
	});

	// TAB natural <harmonic>s: the fret wrapped in <> (notes.ts tabPositions), on single notes and chords.
	// styleFrets bolds the digit but leaves the brackets unbolded on purpose.
	it.concurrent('renders tab_harmonic.png', async () => {
		expect(await testing.render('tab_harmonic.musicxml')).toMatchScreenshot(
			'tab_harmonic.png',
		);
	});

	// <notehead>x</notehead> on notation and TAB: string placement, beaming, chords, mixed with normal heads.
	// X noteheads suppress printed accidentals (notes.ts addAccidentals).
	it.concurrent('renders notehead_x.png', async () => {
		expect(await testing.render('notehead_x.musicxml')).toMatchScreenshot(
			'notehead_x.png',
		);
	});

	// <notehead parentheses="yes">: notation heads and TAB frets wrapped in parentheses, single and chord.
	it.concurrent('renders notehead_text.png', async () => {
		expect(await testing.render('notehead_text.musicxml')).toMatchScreenshot(
			'notehead_text.png',
		);
	});

	it.concurrent('renders notehead_parentheses.png', async () => {
		expect(
			await testing.render('notehead_parentheses.musicxml'),
		).toMatchScreenshot('notehead_parentheses.png');
	});

	// <notehead>slash</notehead> at quarter, half and whole durations (filled vs open).
	it.concurrent('renders notehead_slash.png', async () => {
		expect(await testing.render('notehead_slash.musicxml')).toMatchScreenshot(
			'notehead_slash.png',
		);
	});

	// Diamond, triangle and circle-x <notehead> shapes, filled and open, via vexflow key-suffix codes.
	it.concurrent('renders notehead_shapes.png', async () => {
		expect(await testing.render('notehead_shapes.musicxml')).toMatchScreenshot(
			'notehead_shapes.png',
		);
	});

	// Slash, triangle, diamond and square <notehead>s with filled="no" overriding the default fill.
	// ponytail: 'cross' and 'none' still draw an oval (vexflow codes neither); see also
	// notehead_shapes.xml and lilypond_22b-Staff-Notestyles.xml.
	it.concurrent('renders notehead_shapes_extended.png', async () => {
		expect(
			await testing.render('notehead_shapes_extended.musicxml'),
		).toMatchScreenshot('notehead_shapes_extended.png');
	});

	// Notation+TAB: a rest keeps the staves aligned, the TAB reserving its beat as blank space.
	it.concurrent('renders tab_notation_rest.png', async () => {
		expect(
			await testing.render('tab_notation_rest.musicxml'),
		).toMatchScreenshot('tab_notation_rest.png');
	});

	// Notation+TAB with dotted, double-dotted and triplet rhythms; TAB frets stay under their noteheads,
	// including a triplet opening on a tied-into (omitted) fret, from the jazz corpus m. 25.
	it.concurrent('renders tab_notation_durations.png', async () => {
		expect(
			await testing.render('tab_notation_durations.musicxml'),
		).toMatchScreenshot('tab_notation_durations.png');
	});

	// config.gaps before the first and after the last measure, drawn as labeled boxes outside the staves.
	it.concurrent('renders measures_gap_edges.png', async () => {
		const style = { fill: '#f2f2f2', border: '#d9d9d9' };
		expect(
			await testing.render('tab_notation_durations.musicxml', {
				gaps: [
					{
						beforeMeasureIndex: 0,
						durationMs: 26000,
						label: '0:26',
						minWidth: 100,
						style,
					},
					{
						beforeMeasureIndex: 4,
						durationMs: 4000,
						label: '50:36',
						minWidth: 100,
						style,
					},
				],
			}),
		).toMatchScreenshot('measures_gap_edges.png');
	});

	// tab_notation_durations with tabStemPlacement: 'below' (TAB rhythm stems and flags, no beams).
	it.concurrent('renders tab_notation_durations_stems_below.png', async () => {
		expect(
			await testing.render('tab_notation_durations.musicxml', {
				tabStemPlacement: 'below',
			}),
		).toMatchScreenshot('tab_notation_durations_stems_below.png');
	});

	// tab_notation_durations with tabStemPlacement: 'above'.
	it.concurrent('renders tab_notation_durations_stems_above.png', async () => {
		expect(
			await testing.render('tab_notation_durations.musicxml', {
				tabStemPlacement: 'above',
			}),
		).toMatchScreenshot('tab_notation_durations_stems_above.png');
	});

	// tab_notation_durations with showNotation: false: TAB stave alone, no bracket, own begin barline.
	it.concurrent('renders tab_notation_durations_no_notation.png', async () => {
		expect(
			await testing.render('tab_notation_durations.musicxml', {
				showNotation: false,
			}),
		).toMatchScreenshot('tab_notation_durations_no_notation.png');
	});

	// tab_notation_durations with showTabs: false: notation stave alone, no bracket, standard barlines.
	it.concurrent('renders tab_notation_durations_no_tab.png', async () => {
		expect(
			await testing.render('tab_notation_durations.musicxml', {
				showTabs: false,
			}),
		).toMatchScreenshot('tab_notation_durations_no_tab.png');
	});

	// Beamed and bracketed triplets and a sextuplet, marks on the beam side.
	// Prints the count alone ('6', not vexflow's '6:4'): MusicXML defaults to show-number="actual".
	it.concurrent('renders tuplet_triplet.png', async () => {
		expect(await testing.render('tuplet_triplet.musicxml')).toMatchScreenshot(
			'tuplet_triplet.png',
		);
	});

	// Nested <tuplet>s (a 5 inside a 3), the outer bracket offset by TUPLET_NESTING_EXTRA_GAP.
	// OSMD engraves the same nesting; MuseScore flattens it off <time-modification>, its own reading.
	it.concurrent('renders tuplet_nested.png', async () => {
		expect(await testing.render('tuplet_nested.musicxml')).toMatchScreenshot(
			'tuplet_nested.png',
		);
	});

	// <tuplet> display attributes (show-number, <tuplet-actual>/<tuplet-normal>) vs <time-modification>.
	// ponytail: show-type is ignored. See also lilypond_23b-Tuplets-Styles.xml,
	// lilypond_23f-Tuplets-DurationButNoBracket.xml and tuplet_placement.xml.
	it.concurrent('renders tuplet_display.png', async () => {
		expect(await testing.render('tuplet_display.musicxml')).toMatchScreenshot(
			'tuplet_display.png',
		);
	});

	// Staccato, accent, tenuto, staccatissimo placed by stem direction, beams, and a second voice.
	it.concurrent('renders articulations.png', async () => {
		expect(await testing.render('articulations.musicxml')).toMatchScreenshot(
			'articulations.png',
		);
	});

	// The rest of <articulations>, plus <other-articulation> and <other-notation> (lilypond_32a-Notations M3-6).
	// ponytail: explicit placement is ignored, side comes from the stem; see
	// articulation_staccato_placement_above.xml and articulation_staccato_placement_below.xml.
	it.concurrent('renders articulations_extended.png', async () => {
		expect(
			await testing.render('articulations_extended.musicxml'),
		).toMatchScreenshot('articulations_extended.png');
	});

	// <soft-accent> on notes with stems down and up, placed opposite the stem.
	it.concurrent('renders soft_accent.png', async () => {
		expect(await testing.render('soft_accent.musicxml')).toMatchScreenshot(
			'soft_accent.png',
		);
	});

	// <ornaments> vocabulary: trills, turns, mordents, long/compound mordents, <accidental-mark>, <other-ornament>.
	// Source: lilypond_32a-Notations M7-10; see also ornaments.xml, lilypond_33f-Trill-EndingOnGraceNote.xml.
	// ponytail: <accidental-mark> placement is ignored (first above, second below).
	it.concurrent('renders ornaments.png', async () => {
		expect(await testing.render('ornaments.musicxml')).toMatchScreenshot(
			'ornaments.png',
		);
	});

	// Single-note <tremolo> slashes on one-note tuplets, printing unbracketed tuplet numerals.
	// Start/stop tremolos are in beam_tremolo_extras.png.
	it.concurrent('renders tremolo.png', async () => {
		expect(await testing.render('tremolo.musicxml')).toMatchScreenshot(
			'tremolo.png',
		);
	});

	// <beam fan="accel"/"rit"> and two-note <tremolo type="start"/"stop">.
	// beam@repeater is deprecated in MusicXML 3.0 and ignored.
	it.concurrent('renders beam_tremolo_extras.png', async () => {
		expect(
			await testing.render('beam_tremolo_extras.musicxml'),
		).toMatchScreenshot('beam_tremolo_extras.png');
	});

	// <technical> marks on a notation stave: bowing, harmonics, fingering, pluck, tongue, harmon-mute,
	// hole, arrow, handbell, tap, open and more; beam-side marks clear the beam (see StaveArticulation).
	// The tab side of <technical> is in tab_bend, tab_hammer_pull, tab_harmonic and tab_annotation.
	it.concurrent('renders technical_marks.png', async () => {
		expect(await testing.render('technical_marks.musicxml')).toMatchScreenshot(
			'technical_marks.png',
		);
	});

	// <fingering> on grand-staff chords, stacked in chord order above and below (placement="below").
	it.concurrent('renders fingering.png', async () => {
		expect(await testing.render('fingering.musicxml')).toMatchScreenshot(
			'fingering.png',
		);
	});

	// <technical><string> rings stacked outside any <fingering>, regardless of document order, incl. chords.
	// The low chord pins the draw-pass column build (DrawPass.pinTechnicals) over vexflow's stacking.
	it.concurrent('renders string_numbers.png', async () => {
		expect(await testing.render('string_numbers.musicxml')).toMatchScreenshot(
			'string_numbers.png',
		);
	});

	// <fermata> shapes, upright and inverted, side set by type not stem, plus <barline> fermatas.
	it.concurrent('renders fermata.png', async () => {
		expect(await testing.render('fermata.musicxml')).toMatchScreenshot(
			'fermata.png',
		);
	});

	// <fermata>s on rests, whole-measure and quarter, upright and inverted.
	it.concurrent('renders rest-fermata.png', async () => {
		expect(await testing.render('rest-fermata.musicxml')).toMatchScreenshot(
			'rest-fermata.png',
		);
	});

	// Cue notes from <cue/> and <type size="cue">: single, beamed, dotted and chord.
	it.concurrent('renders cue_notes.png', async () => {
		expect(await testing.render('cue_notes.musicxml')).toMatchScreenshot(
			'cue_notes.png',
		);
	});

	// <arpeggiate unbroken="yes"> joins both grand-staff hands into one roll; plain stays per stave.
	it.concurrent('renders arpeggio_unbroken.png', async () => {
		expect(
			await testing.render('arpeggio_unbroken.musicxml'),
		).toMatchScreenshot('arpeggio_unbroken.png');
	});

	// <arpeggiate> undirected, direction="up" and direction="down" on a chord.
	it.concurrent('renders arpeggio.png', async () => {
		expect(await testing.render('arpeggio.musicxml')).toMatchScreenshot(
			'arpeggio.png',
		);
	});

	// <non-arpeggiate> bottom/top bracket on a chord, with arpeggiated chords as the control.
	it.concurrent('renders non_arpeggiate.png', async () => {
		expect(await testing.render('non_arpeggiate.musicxml')).toMatchScreenshot(
			'non_arpeggiate.png',
		);
	});

	// <harmony> chord symbols: alters, slash bass, <degree>s, <inversion>, <bass-separator>, stack-degrees,
	// use-symbols, and lifting clear of high notes, staccatos, ties and a tuplet (from
	// LP-21-Jazz-I-G6-Day-1-04-Exercise-3 M3). ponytail: above-stave tuplet brackets aren't obstacles.
	it.concurrent('renders harmony.png', async () => {
		expect(await testing.render('harmony.musicxml')).toMatchScreenshot(
			'harmony.png',
		);
	});

	// A chord symbol over a note with a grace: collision uses the notehead, not the grace's bogus bbox.
	it.concurrent('renders harmony_grace.png', async () => {
		expect(await testing.render('harmony_grace.musicxml')).toMatchScreenshot(
			'harmony_grace.png',
		);
	});

	// The <kind> vocabulary through the ninths, pinning HARMONY_KIND_SUFFIX (score-reader.ts) against typos.
	// ponytail: 11ths/13ths, sus/added and function kinds have no measure; lilypond_71f stops at ninths.
	it.concurrent('renders harmony_kinds.png', async () => {
		expect(await testing.render('harmony_kinds.musicxml')).toMatchScreenshot(
			'harmony_kinds.png',
		);
	});

	// Roman numeral analysis from <harmony><numeral> and deprecated <function>, hung below the stave:
	// inversions, qualities, <numeral-alter>, <numeral-key>, placement="above", clearing ledgers and lyrics.
	it.concurrent('renders harmony_analysis.png', async () => {
		expect(await testing.render('harmony_analysis.musicxml')).toMatchScreenshot(
			'harmony_analysis.png',
		);
	});

	// <figured-bass>: single figures, prefixed stacks in document order, parentheses, slash suffix (lilypond_74a).
	// ponytail: slash prints as a trailing solidus (FIGURE_SIGN), <extend> is unimplemented.
	// See also lilypond_46g-PickupMeasure-Chordnames-FiguredBass.xml.
	it.concurrent('renders figured_bass.png', async () => {
		expect(await testing.render('figured_bass.musicxml')).toMatchScreenshot(
			'figured_bass.png',
		);
	});

	// <harmony><frame> fret boxes: first-fret, barre, compact boxes without <first-fret> ('Bumpin' on Wes'),
	// lifting clear of words and high notes, print-frame="no", unplayed="" and <frame-frets>.
	it.concurrent('renders chord_diagram.png', async () => {
		expect(await testing.render('chord_diagram.musicxml')).toMatchScreenshot(
			'chord_diagram.png',
		);
	});

	// Adjacent fret boxes across a barline at a narrow width are nudged apart, also after both lift
	// clear of high notes (from Bass-LP-05-Fretboard M15).
	it.concurrent('renders chord_diagram_adjacent.png', async () => {
		expect(
			await testing.render('chord_diagram_adjacent.musicxml', {
				layout: { type: 'standard', referenceWidth: 500 },
			}),
		).toMatchScreenshot('chord_diagram_adjacent.png');
	});

	// chord_diagram_adjacent at 420px: a pair against the right margin packs leftward side by side
	// instead of both clamping to one x.
	it.concurrent('renders chord_diagram_adjacent_squeezed.png', async () => {
		expect(
			await testing.render('chord_diagram_adjacent.musicxml', {
				layout: { type: 'standard', referenceWidth: 420 },
			}),
		).toMatchScreenshot('chord_diagram_adjacent_squeezed.png');
	});

	// A fret box on the last note against the system's right edge is clamped inside the canvas.
	it.concurrent('renders chord_diagram_edge.png', async () => {
		expect(
			await testing.render('chord_diagram_edge.musicxml', {
				layout: { type: 'standard', referenceWidth: 500 },
			}),
		).toMatchScreenshot('chord_diagram_edge.png');
	});

	// A fret box on the lower of two parts stays in that part's headroom, widening the inter-part gap.
	// The <harmony> is duplicated per voice, as Guitar Pro writes it, yet draws once.
	it.concurrent('renders chord_diagram_lower_part.png', async () => {
		expect(
			await testing.render('chord_diagram_lower_part.musicxml'),
		).toMatchScreenshot('chord_diagram_lower_part.png');
	});

	// <harmonic><natural/> as diamond noteheads on single notes and chords; tab counterpart is tab_harmonic.
	it.concurrent('renders harmonic.png', async () => {
		expect(await testing.render('harmonic.musicxml')).toMatchScreenshot(
			'harmonic.png',
		);
	});

	// Grace notes: slashed/unslashed, beamed, accidentals, slurs to the main stem base (SLUR_GRACE_ANCHOR),
	// hammer-on/pull-off/slide graces, and playback-override and time-making graces.
	// Grace slurs always bow underneath, ignoring placement="above".
	it.concurrent('renders grace_notes.png', async () => {
		expect(await testing.render('grace_notes.musicxml')).toMatchScreenshot(
			'grace_notes.png',
		);
	});

	// A grace note on a bass stave uses its own clef, and its slur bows under to the stem base,
	// including into a stem-down chord (not vexflow's NEAR_HEAD top-note metric).
	it.concurrent('renders grace_bass_clef.png', async () => {
		expect(await testing.render('grace_bass_clef.musicxml')).toMatchScreenshot(
			'grace_bass_clef.png',
		);
	});

	// A grace on the bass stave leading a treble note of the same voice while the bass holds a measure rest.
	it.concurrent('renders grace_cross_staff_rest.png', async () => {
		expect(
			await testing.render('grace_cross_staff_rest.musicxml'),
		).toMatchScreenshot('grace_cross_staff_rest.png');
	});

	// Grace notes on notation + TAB: a measure with graces widens to fit them without squeezing its notes.
	// A grace after a dotted note skips its lead clearance so the dots stay snug.
	it.concurrent('renders grace_spacing.png', async () => {
		expect(await testing.render('grace_spacing.musicxml')).toMatchScreenshot(
			'grace_spacing.png',
		);
	});

	// A chord as a grace note on a notation-only stave, leading a single note and a chord.
	// ponytail: lilypond_24b carries no <slur> on its graces, so the grace-chord slur is unexercised.
	it.concurrent('renders grace_chord.png', async () => {
		expect(await testing.render('grace_chord.musicxml')).toMatchScreenshot(
			'grace_chord.png',
		);
	});

	// After-graces: a grace cluster at measure end decorates the note it follows; leading graces beam too.
	// A <grace steal-time-previous> with a note after it still leads that note, as MuseScore does.
	// ponytail: no slur to after-graces. See also lilypond_24c-GraceNote-MeasureEnd.xml, lilypond_24e-GraceNote-StaffChange.xml.
	it.concurrent('renders grace_after.png', async () => {
		expect(await testing.render('grace_after.musicxml')).toMatchScreenshot(
			'grace_after.png',
		);
	});

	// Two voices on one stave via <backup>/<forward>: gaps, dotted durations, missing <stem>s.
	// M5: <chord/> members without their own <voice> belong to the voice of the note they stack on.
	it.concurrent('renders two_voices.png', async () => {
		expect(await testing.render('two_voices.musicxml')).toMatchScreenshot(
			'two_voices.png',
		);
	});

	// Four voices (SATB) split two per stave on a grand staff, plus visible source rests in a chord texture.
	it.concurrent('renders voices_grand_staff.png', async () => {
		expect(
			await testing.render('voices_grand_staff.musicxml'),
		).toMatchScreenshot('voices_grand_staff.png');
	});

	// Cross-staff notes: a voice whose notes change <staff> mid-beam, including split chords and flipped beams.
	// See also cross_stave_16ths_ghost_notes_simple.xml.
	it.concurrent('renders cross_stave.png', async () => {
		expect(await testing.render('cross_stave.musicxml')).toMatchScreenshot(
			'cross_stave.png',
		);
	});

	// A cross-staff tuplet voice (Schubert, Der Lindenbaum m. 51) spaced evenly, no wider than single-staff.
	it.concurrent('renders tuplet_cross_stave.png', async () => {
		expect(
			await testing.render('tuplet_cross_stave.musicxml'),
		).toMatchScreenshot('tuplet_cross_stave.png');
	});

	// tuplet_cross_stave at referenceWidth 720: the measure fits the page instead of overflowing it.
	it.concurrent('renders tuplet_cross_stave_narrow.png', async () => {
		expect(
			await testing.render('tuplet_cross_stave.musicxml', {
				layout: { type: 'standard', referenceWidth: 720 },
			}),
		).toMatchScreenshot('tuplet_cross_stave_narrow.png');
	});

	// Voice over piano with lyrics and piano tuplet brackets (incl. cross-staff) sharing the gap between.
	it.concurrent('renders lyrics_voice_and_piano.png', async () => {
		expect(
			await testing.render('lyrics_voice_and_piano.musicxml'),
		).toMatchScreenshot('lyrics_voice_and_piano.png');
	});

	// A different <key number> per staff of one part; the time signatures still align across staves.
	// See also lilypond_43c-MultiStaff-DifferentKeysAfterBackup.xml.
	it.concurrent('renders staves_different_keys.png', async () => {
		expect(
			await testing.render('staves_different_keys.musicxml'),
		).toMatchScreenshot('staves_different_keys.png');
	});

	// <direction> <staff> routing on a grand staff: dynamics and wedges land by their staff; per-staff clef change.
	it.concurrent('renders staff_dynamics.png', async () => {
		expect(await testing.render('staff_dynamics.musicxml')).toMatchScreenshot(
			'staff_dynamics.png',
		);
	});

	// Debussy's Mandoline m.37: a dynamic beside a long cross-staff stem moves sideways to clear it.
	it.concurrent('renders dynamics_cross_stave.png', async () => {
		expect(
			await testing.render('dynamics_cross_stave.musicxml'),
		).toMatchScreenshot('dynamics_cross_stave.png');
	});

	// Transposing parts: <transpose> must not move written pitch; this locks in that nothing transposes.
	it.concurrent('renders transpose.png', async () => {
		expect(await testing.render('transpose.musicxml')).toMatchScreenshot(
			'transpose.png',
		);
	});

	// A mid-score <transpose> change (lilypond_72c-TransposingInstruments-Change) shows the new written key.
	// ponytail: mid-score <part-name-display> in <print> is ignored. See also lilypond_72b-TransposingInstruments-Full.xml.
	it.concurrent('renders transpose_change.png', async () => {
		expect(await testing.render('transpose_change.musicxml')).toMatchScreenshot(
			'transpose_change.png',
		);
	});

	// Default width-based wrapping: 'system' measure numbering, and a ragged under-filled last system.
	it.concurrent('renders system_break.png', async () => {
		expect(await testing.render('system_break.musicxml')).toMatchScreenshot(
			'system_break.png',
		);
	});

	// <print new-system="yes"> forces a system break, overriding width-based wrapping.
	it.concurrent('renders print_new_system.png', async () => {
		expect(await testing.render('print_new_system.musicxml')).toMatchScreenshot(
			'print_new_system.png',
		);
	});

	// honorSystemBreaks false: the <print new-system="yes"> is ignored.
	it.concurrent('renders ignore_new_system.png', async () => {
		expect(
			await testing.render('print_new_system.musicxml', {
				layout: { type: 'standard', honorSystemBreaks: false },
			}),
		).toMatchScreenshot('ignore_new_system.png');
	});

	// documentLayout 'follow': slur and tie Bézier control points from the document, incl. continuations and breaks.
	it.concurrent('renders document_curves.png', async () => {
		expect(
			await testing.render('document_curves.musicxml', {
				layout: { type: 'standard', documentLayout: 'follow' },
			}),
		).toMatchScreenshot('document_curves.png');
	});

	// The same curves without document layout: authored control data and offsets have no effect.
	it.concurrent('renders document_curves_ignore.png', async () => {
		expect(await testing.render('document_curves.musicxml')).toMatchScreenshot(
			'document_curves_ignore.png',
		);
	});

	// A document page without <page-margins> keeps the default side margins.
	it.concurrent('renders document_layout_no_margins.png', async () => {
		expect(
			await testing.render('document_layout_no_margins.musicxml', {
				layout: { type: 'standard', documentLayout: 'follow' },
			}),
		).toMatchScreenshot('document_layout_no_margins.png');
	});

	// documentLayout 'follow': page size, margins, <system-margins> and <print> staff/system distances.
	it.concurrent('renders document_layout.png', async () => {
		expect(
			await testing.render('document_layout.musicxml', {
				layout: { type: 'standard', documentLayout: 'follow' },
			}),
		).toMatchScreenshot('document_layout.png');
	});

	// documentLayout 'strict': document distances, positions, lyric baselines, slur beziers and widths kept exactly,
	// even where the grand staff collides.
	it.concurrent('renders document_layout_strict.png', async () => {
		expect(
			await testing.render('score_mozart_das_veilchen.musicxml', {
				layout: { type: 'standard', documentLayout: 'strict' },
			}),
		).toMatchScreenshot('document_layout_strict.png');
	});

	// Paged document layout: page size, first-system offset and <print new-page="yes">.
	it.concurrent('renders document_layout_paged.png', async () => {
		expect(
			await testing.render('document_layout.musicxml', {
				layout: { type: 'paged', documentLayout: 'follow' },
				backgroundColor: '#ffffff',
			}),
		).toMatchScreenshot('document_layout_paged.png');
	});

	// <print new-page="yes" blank-page="2"> inserts two blank pages; a plain new-page inserts none.
	it.concurrent('renders blank_page.png', async () => {
		expect(
			await testing.render('blank_page.musicxml', {
				layout: { type: 'paged', documentLayout: 'follow' },
				backgroundColor: '#ffffff',
			}),
		).toMatchScreenshot('blank_page.png');
	});

	// A <page-layout> inside <print new-page> overrides the <defaults> page for that page (paged only).
	it.concurrent('renders document_layout_print_page.png', async () => {
		expect(
			await testing.render('document_layout_print_page.musicxml', {
				layout: { type: 'paged', documentLayout: 'follow' },
				backgroundColor: '#ffffff',
			}),
		).toMatchScreenshot('document_layout_print_page.png');
	});

	// Mirrored odd/even <page-margins> in paged document layout.
	it.concurrent('renders document_layout_even_margins.png', async () => {
		expect(
			await testing.render('document_layout_even_margins.musicxml', {
				layout: { type: 'paged', documentLayout: 'follow' },
				backgroundColor: '#ffffff',
			}),
		).toMatchScreenshot('document_layout_even_margins.png');
	});

	// <defaults><appearance> line widths, distances and tip styles applied to every line-drawn element.
	it.concurrent('renders defaults_appearance.png', async () => {
		expect(
			await testing.render('defaults_appearance.musicxml', {
				layout: { type: 'standard', documentLayout: 'follow' },
			}),
		).toMatchScreenshot('defaults_appearance.png');
	});

	// <appearance> beam distance: stems still reach the beams, cross-staff and flat.
	it.concurrent('renders beam_distance_stems.png', async () => {
		expect(
			await testing.render('beam_distance_stems.musicxml', {
				layout: { type: 'standard', documentLayout: 'follow' },
			}),
		).toMatchScreenshot('beam_distance_stems.png');
	});

	// <defaults><appearance> glyph choices: clef variants, Z-shaped quarter rests and ottava labels.
	it.concurrent('renders defaults_appearance_glyphs.png', async () => {
		expect(
			await testing.render('defaults_appearance_glyphs.musicxml', {
				layout: { type: 'standard', documentLayout: 'follow' },
			}),
		).toMatchScreenshot('defaults_appearance_glyphs.png');
	});

	// documentLayout 'follow': marks placed by default-y/relative-x/-y, lifting clear of collisions.
	it.concurrent('renders document_positions.png', async () => {
		expect(
			await testing.render('document_positions.musicxml', {
				layout: { type: 'standard', documentLayout: 'follow' },
			}),
		).toMatchScreenshot('document_positions.png');
	});

	// Document lyric baselines shared across measures, with per-lyric offsets; follow mode pushes them clear.
	it.concurrent('renders document_lyric_positions.png', async () => {
		expect(
			await testing.render('document_lyric_positions.musicxml', {
				layout: { type: 'standard', documentLayout: 'follow' },
			}),
		).toMatchScreenshot('document_lyric_positions.png');
	});

	// documentLayout 'strict' keeps the document lyric baselines exactly, even near ledger notes.
	it.concurrent('renders document_lyric_positions_strict.png', async () => {
		expect(
			await testing.render('document_lyric_positions.musicxml', {
				layout: { type: 'standard', documentLayout: 'strict' },
			}),
		).toMatchScreenshot('document_lyric_positions_strict.png');
	});

	// documentLayout 'strict': every placed mark stays on its default-y, even through notes.
	it.concurrent('renders document_positions_strict.png', async () => {
		expect(
			await testing.render('document_positions.musicxml', {
				layout: { type: 'standard', documentLayout: 'strict' },
			}),
		).toMatchScreenshot('document_positions_strict.png');
	});

	// Panoramic layout: every measure on one unbroken system.
	it.concurrent('renders layout_panoramic.png', async () => {
		expect(
			await testing.render('system_break.musicxml', {
				layout: { type: 'panoramic' },
			}),
		).toMatchScreenshot('layout_panoramic.png');
	});

	// A forced engraved line wider than the reference width under overflow 'wrap' (default): it breaks to fit.
	// Fixture is An Chloe's M1-5.
	it.concurrent('renders overflow_wrap.png', async () => {
		expect(
			await testing.render('overflow_forced_line.musicxml'),
		).toMatchScreenshot('overflow_wrap.png');
	});

	// overflow 'allow': the forced line stays on one system at its minimum, and the page grows to fit.
	it.concurrent('renders overflow_allow.png', async () => {
		expect(
			await testing.render('overflow_forced_line.musicxml', {
				layout: { type: 'standard', overflow: 'allow' },
			}),
		).toMatchScreenshot('overflow_allow.png');
	});

	// overflow 'widen': the reference width grows so the forced line fits at its ideal spacing.
	it.concurrent('renders overflow_widen.png', async () => {
		expect(
			await testing.render('overflow_forced_line.musicxml', {
				layout: { type: 'standard', overflow: 'widen' },
			}),
		).toMatchScreenshot('overflow_widen.png');
	});

	// minLastSystemFill 0: the last system always justifies to the page width.
	// A one-measure line stretched to full width is the expected result, not a bug.
	it.concurrent('renders last_system_stretch.png', async () => {
		expect(
			await testing.render('system_break.musicxml', {
				minLastSystemFill: 0,
			}),
		).toMatchScreenshot('last_system_stretch.png');
	});

	// stretchSingleSystem false: a lone under-filled system stays ragged at its natural width.
	it.concurrent('renders stretch_single_system_off.png', async () => {
		expect(
			await testing.render('aloof_measure_1.musicxml', {
				stretchSingleSystem: false,
			}),
		).toMatchScreenshot('stretch_single_system_off.png');
	});

	// measureNumbering 'every': a number above every measure.
	it.concurrent('renders measure_numbering_every.png', async () => {
		expect(
			await testing.render('system_break.musicxml', {
				measureNumbering: 'every',
			}),
		).toMatchScreenshot('measure_numbering_every.png');
	});

	// measureNumbering 'none': no measure numbers.
	it.concurrent('renders measure_numbering_none.png', async () => {
		expect(
			await testing.render('system_break.musicxml', {
				measureNumbering: 'none',
			}),
		).toMatchScreenshot('measure_numbering_none.png');
	});

	// measureNumbering 'every-2': every 2nd measure plus each system start (M10 shows the union).
	it.concurrent('renders measure_numbering_every_2.png', async () => {
		expect(
			await testing.render('system_break.musicxml', {
				measureNumbering: 'every-2',
			}),
		).toMatchScreenshot('measure_numbering_every_2.png');
	});

	// measureNumbering 'every-3': every 3rd measure plus each system start.
	it.concurrent('renders measure_numbering_every_3.png', async () => {
		expect(
			await testing.render('system_break.musicxml', {
				measureNumbering: 'every-3',
			}),
		).toMatchScreenshot('measure_numbering_every_3.png');
	});

	// <print><measure-numbering> under the 'document' default: system, only-bottom, also-bottom, staff attributes.
	it.concurrent('renders measure_numbering.png', async () => {
		expect(
			await testing.render('measure_numbering.musicxml'),
		).toMatchScreenshot('measure_numbering.png');
	});

	// Vertical spacing between systems: low ledger notes above high ledger notes must not clash.
	it.concurrent('renders system_spacing.png', async () => {
		expect(
			await testing.render('system_spacing.musicxml', {
				layout: { type: 'standard', referenceWidth: 660 },
			}),
		).toMatchScreenshot('system_spacing.png');
	});

	// Within-part stave gap widens so ledger-line extremes on adjacent staves don't collide.
	it.concurrent('renders stave_spacing.png', async () => {
		expect(await testing.render('stave_spacing.musicxml')).toMatchScreenshot(
			'stave_spacing.png',
		);
	});

	// Stave gap measured per x column and per system: interleaved extremes stay close, stacked ones open.
	it.concurrent('renders stave_spacing_dynamic.png', async () => {
		expect(
			await testing.render('stave_spacing_dynamic.musicxml'),
		).toMatchScreenshot('stave_spacing_dynamic.png');
	});

	// Between-part gap widens so ledger-line extremes on adjacent parts' staves don't collide.
	it.concurrent('renders part_spacing.png', async () => {
		expect(await testing.render('part_spacing.musicxml')).toMatchScreenshot(
			'part_spacing.png',
		);
	});

	// A single measure extracted from 'aloof' for focused testing.
	it.concurrent('renders aloof_measure_1.png', async () => {
		expect(await testing.render('aloof_measure_1.musicxml')).toMatchScreenshot(
			'aloof_measure_1.png',
		);
	});
	// Notation + TAB: tied chord notes omit held frets in the tab; fret-changing slurs draw as hammer/pull arcs.
	it.concurrent('renders aloof_measure_2.png', async () => {
		expect(await testing.render('aloof_measure_2.musicxml')).toMatchScreenshot(
			'aloof_measure_2.png',
		);
	});
	it.concurrent('renders aloof_measure_7.png', async () => {
		expect(await testing.render('aloof_measure_7.musicxml')).toMatchScreenshot(
			'aloof_measure_7.png',
		);
	});
	it.concurrent('renders aloof_measure_14.png', async () => {
		expect(await testing.render('aloof_measure_14.musicxml')).toMatchScreenshot(
			'aloof_measure_14.png',
		);
	});
	it.concurrent('renders aloof_measure_15.png', async () => {
		expect(await testing.render('aloof_measure_15.musicxml')).toMatchScreenshot(
			'aloof_measure_15.png',
		);
	});

	// ---------------------------------------------------------------------------------------
	// Whole real-world scores, engraved end to end at the default 900px reference width. Every
	// case above is hand-cut to prove one thing; these prove the opposite: that the whole-page
	// path holds up at realistic size. They are the broadest cases in the suite, so they sit
	// last, and they are NOT diagnostic: a diff here says something moved somewhere, not what.
	// Find the system that changed, then reproduce it in a focused fixture above before
	// touching vexml. Comments stay one line: the score is the description.
	//
	// Excluded: Gounod's Méditation (365 measures, 92MP) and Lee Actor's Prelude to a Tragedy
	// (902 measures across 22 parts, 135MP). Both render, but diffing the latter needs ~1.6GB
	// of raw buffers.
	// ---------------------------------------------------------------------------------------

	// Chopin prelude: one measure of piano, both staves in bass clef, 3 flats.
	it.concurrent('renders score_chopin_prelude.png', async () => {
		expect(
			await testing.render('score_chopin_prelude.musicxml'),
		).toMatchScreenshot('score_chopin_prelude.png');
	});

	// Brahms violin concerto: solo violin double stops with fingerings and circled string numbers.
	it.concurrent('renders score_brahms_violin_concerto.png', async () => {
		expect(
			await testing.render('score_brahms_violin_concerto.musicxml'),
		).toMatchScreenshot('score_brahms_violin_concerto.png');
	});

	// Fauré, "Après un rêve": voice over braced piano with lyrics and hairpins.
	it.concurrent('renders score_faure_apres_un_reve.png', async () => {
		expect(
			await testing.render('score_faure_apres_un_reve.musicxml'),
		).toMatchScreenshot('score_faure_apres_un_reve.png');
	});

	// Mozart K. 387: string quartet with viola in alto C clef and a pickup.
	it.concurrent('renders score_mozart_string_quartet.png', async () => {
		expect(
			await testing.render('score_mozart_string_quartet.musicxml'),
		).toMatchScreenshot('score_mozart_string_quartet.png');
	});

	// Debussy, "Mandoline": voice over piano in 6/8, the densest annotation stack here.
	// M1: the bass grace slur bows above, clear of sfp and the piano hairpin.
	it.concurrent('renders score_debussy_mandoline.png', async () => {
		expect(
			await testing.render('score_debussy_mandoline.musicxml'),
		).toMatchScreenshot('score_debussy_mandoline.png');
	});

	// Beethoven, "An die ferne Geliebte": voice over piano with pedal marks and a mid-measure clef change.
	it.concurrent('renders score_beethoven_an_die_ferne_geliebte.png', async () => {
		expect(
			await testing.render('score_beethoven_an_die_ferne_geliebte.musicxml'),
		).toMatchScreenshot('score_beethoven_an_die_ferne_geliebte.png');
	});

	// Solo guitar on a TAB stave with no notation stave above it.
	it.concurrent('renders score_wanna_skip_class.png', async () => {
		expect(
			await testing.render('score_wanna_skip_class.musicxml'),
		).toMatchScreenshot('score_wanna_skip_class.png');
	});

	// Mozart, "An Chloe": voice over piano in cut common, with turn ornaments.
	it.concurrent('renders score_mozart_an_chloe.png', async () => {
		expect(
			await testing.render('score_mozart_an_chloe.musicxml'),
		).toMatchScreenshot('score_mozart_an_chloe.png');
	});

	// Schubert, "Gute Nacht": 137 measures of voice and piano; the render-speed benchmark score.
	it.concurrent('renders score_schubert_gute_nacht.png', async () => {
		expect(
			await testing.render('score_schubert_gute_nacht.musicxml'),
		).toMatchScreenshot('score_schubert_gute_nacht.png');
	});

	// Bach, "Air": string quartet with repeats and numbered endings spanning all four parts.
	it.concurrent('renders score_bach_air.png', async () => {
		expect(await testing.render('score_bach_air.musicxml')).toMatchScreenshot(
			'score_bach_air.png',
		);
	});

	// Mozart, "Das Veilchen": voice over piano with graces; engraved lines too wide for 900px wrap in two.
	// Slurs that would cross the verse open the voice-piano gap only where they reach (recordStaveSpill).
	it.concurrent('renders score_mozart_das_veilchen.png', async () => {
		expect(
			await testing.render('score_mozart_das_veilchen.musicxml'),
		).toMatchScreenshot('score_mozart_das_veilchen.png');
	});

	// Austrian national anthem: voice over piano, three stacked lyric verses setting measure widths.
	it.concurrent('renders score_land_der_berge.png', async () => {
		expect(
			await testing.render('score_land_der_berge.musicxml'),
		).toMatchScreenshot('score_land_der_berge.png');
	});

	// "Amazing Grace": voice over guitar notation + TAB, lyrics and chord diagrams; bracket/barlines per part.
	// Chord roots stay plain despite explicit <root-alter>0</root-alter>; see harmony.musicxml M6.
	// TODO: final measure's "A/C#" overlaps stems, which are not lift-clear obstacles.
	it.concurrent('renders score_amazing_grace.png', async () => {
		expect(
			await testing.render('score_amazing_grace.musicxml'),
		).toMatchScreenshot('score_amazing_grace.png');
	});
});
