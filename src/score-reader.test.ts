import { describe, expect, it } from 'bun:test';
import { ScoreReader } from './score-reader';
import { nth, parseMeasures } from './score-reader-harness';

describe('ScoreReader', () => {
	/*
	 * A <metronome>'s printed shape, which the barline_styles/tempo_beat_unit_dot screenshots
	 * pin visually but cannot pull apart: an augmentation dot is a SIBLING of the <beat-unit>
	 * it modifies, not a child, so "dotted quarter = half" and "quarter = dotted half" differ
	 * only in where the <beat-unit-dot/> sits in document order.
	 */
	const reader = new ScoreReader();
	const metronome = (inner: string, attrs = '') =>
		`<direction><direction-type><metronome ${attrs}>${inner}</metronome></direction-type></direction>`;
	const markOf = async (inner: string, attrs = '') =>
		reader.tempoOf(nth(await parseMeasures(metronome(inner, attrs)), 0));

	it('counts the <beat-unit-dot/> markers trailing a beat unit', async () => {
		const mark = await markOf(
			'<beat-unit>quarter</beat-unit><beat-unit-dot/><per-minute>100</per-minute>',
		);
		expect(mark).toMatchObject({ duration: 'quarter', dots: 1, bpm: 100 });
	});

	it('binds each dot to the unit it follows, not to the mark', async () => {
		const mark = await markOf(
			'<beat-unit>quarter</beat-unit><beat-unit-dot/><beat-unit>half</beat-unit>',
		);
		expect(mark).toMatchObject({
			duration: 'quarter',
			dots: 1,
			duration2: 'half',
			dots2: 0,
		});
	});

	it('reads a second <beat-unit> as the metric-modulation right-hand side', async () => {
		const mark = await markOf(
			'<beat-unit>quarter</beat-unit><beat-unit>half</beat-unit><beat-unit-dot/>',
		);
		expect(mark).toMatchObject({ duration2: 'half', dots2: 1 });
	});

	it('leaves duration2 null for the ordinary unit-equals-bpm form', async () => {
		const mark = await markOf(
			'<beat-unit>half</beat-unit><per-minute>60</per-minute>',
		);
		expect(mark).toMatchObject({ duration2: null, dots: 0, bpm: 60 });
	});

	it('reads the parentheses attribute', async () => {
		const plain = await markOf('<beat-unit>quarter</beat-unit>');
		const wrapped = await markOf(
			'<beat-unit>quarter</beat-unit>',
			'parentheses="yes"',
		);
		expect(plain?.parenthesis).toBe(false);
		expect(wrapped?.parenthesis).toBe(true);
	});

	/*
	 * Swing. The distinction this pins down is the one the notation hides: a <metronome> "two
	 * eighths = quarter-eighth triplet" figure tells a HUMAN to swing and carries no timing at
	 * all, so only a <sound><swing> makes playback actually swing.
	 */
	const swingOf = async (inner: string) =>
		reader.swingOf(
			nth(await parseMeasures(`<sound><swing>${inner}</swing></sound>`), 0),
		);

	it('reads the ratio, defaulting the swung unit to eighths', async () => {
		expect(await swingOf('<first>2</first><second>1</second>')).toEqual({
			first: 2,
			second: 1,
			unit: 0.5,
		});
	});

	it('reads a 16th <swing-type> as the finer unit', async () => {
		expect(
			await swingOf(
				'<first>2</first><second>1</second><swing-type>16th</swing-type>',
			),
		).toEqual({ first: 2, second: 1, unit: 0.25 });
	});

	it('reads <straight/> as an even ratio, so it cancels a carried swing', async () => {
		expect(await swingOf('<straight/>')).toMatchObject({
			first: 1,
			second: 1,
		});
	});

	it('is null with no <swing>, so the swing in force carries forward', async () => {
		const m = nth(await parseMeasures('<sound tempo="60"/>'), 0);
		expect(reader.swingOf(m)).toBeNull();
	});

	it('finds a <swing> nested in a <direction>, not just a bare measure child', async () => {
		const m = nth(
			await parseMeasures(
				'<direction><direction-type><words>Swing</words></direction-type>' +
					'<sound><swing><first>2</first><second>1</second></swing></sound></direction>',
			),
			0,
		);
		expect(reader.swingOf(m)).toMatchObject({ first: 2, second: 1 });
	});

	it('does not swing off the <metronome> figure alone — that is notation, not timing', async () => {
		const m = nth(
			await parseMeasures(
				'<direction><direction-type><metronome>' +
					'<metronome-note><metronome-type>eighth</metronome-type></metronome-note>' +
					'<metronome-relation>equals</metronome-relation>' +
					'<metronome-note><metronome-type>quarter</metronome-type></metronome-note>' +
					'</metronome></direction-type></direction>',
			),
			0,
		);
		expect(reader.swingOf(m)).toBeNull();
	});

	/*
	 * The <metronome-note> form: note GROUPS either side of a <metronome-relation>, which the
	 * <beat-unit> form cannot state. The tempo_beat_unit_dot screenshot pins how it draws; this
	 * pins what is read out of the markup, which the picture cannot show.
	 */
	const SWING =
		'<metronome-note><metronome-type>eighth</metronome-type>' +
		'<metronome-beam number="1">begin</metronome-beam></metronome-note>' +
		'<metronome-note><metronome-type>eighth</metronome-type>' +
		'<metronome-beam number="1">end</metronome-beam></metronome-note>' +
		'<metronome-relation>equals</metronome-relation>' +
		'<metronome-note><metronome-type>quarter</metronome-type>' +
		'<metronome-tuplet bracket="yes" type="start"><actual-notes>3</actual-notes>' +
		'<normal-notes>2</normal-notes></metronome-tuplet></metronome-note>' +
		'<metronome-note><metronome-type>eighth</metronome-type>' +
		'<metronome-tuplet bracket="yes" type="stop"><actual-notes>3</actual-notes>' +
		'<normal-notes>2</normal-notes></metronome-tuplet></metronome-note>';
	const modulationOf = async (inner: string, attrs = '') =>
		reader.modulationOf(
			nth(
				await parseMeasures(
					`<direction><direction-type><metronome ${attrs}>${inner}</metronome></direction-type></direction>`,
				),
				0,
			),
		);

	it('splits the notes at the <metronome-relation>', async () => {
		const mark = await modulationOf(SWING);
		expect(mark?.left.map((note) => note.type)).toEqual(['eighth', 'eighth']);
		expect(mark?.right.map((note) => note.type)).toEqual(['quarter', 'eighth']);
	});

	it('counts only the beams that carry on to the next note', async () => {
		// 'begin' continues the beam into the gap after it; 'end' closes it, so the second note
		// draws beamed but stretches no beam rightward.
		const mark = await modulationOf(SWING);
		expect(mark?.left.map((note) => note.beamsToNext)).toEqual([1, 0]);
		expect(mark?.left.every((note) => note.beamed)).toBe(true);
		// The right-hand notes carry no <metronome-beam>, so they keep their own flags.
		expect(mark?.right.some((note) => note.beamed)).toBe(false);
	});

	it('reads the tuplet span and its actual-notes', async () => {
		const mark = await modulationOf(SWING);
		expect(mark?.right.map((note) => note.tuplet)).toEqual([
			{ actual: 3, type: 'start' },
			{ actual: 3, type: 'stop' },
		]);
	});

	it('is null for the beat-unit form, which tempoOf reads instead', async () => {
		expect(
			await modulationOf(
				'<beat-unit>quarter</beat-unit><per-minute>60</per-minute>',
			),
		).toBeNull();
	});

	it('is null without a relation — one group equates to nothing', async () => {
		expect(
			await modulationOf(
				'<metronome-note><metronome-type>eighth</metronome-type></metronome-note>',
			),
		).toBeNull();
	});

	it('reads both marks of one <direction>, each through its own accessor', async () => {
		const m = nth(
			await parseMeasures(
				'<direction><direction-type><metronome><beat-unit>quarter</beat-unit>' +
					`<per-minute>60</per-minute></metronome></direction-type><direction-type><metronome>${SWING}</metronome></direction-type></direction>`,
			),
			0,
		);
		// The rate is no longer shadowed by the note-form metronome sitting next to it, and the
		// note form is no longer lost behind the rate: the two print side by side.
		expect(reader.tempoOf(m)).toMatchObject({ duration: 'quarter', bpm: 60 });
		expect(reader.modulationOf(m)?.left).toHaveLength(2);
	});

	it('reads the parentheses attribute', async () => {
		expect((await modulationOf(SWING, 'parentheses="yes"'))?.parenthesis).toBe(
			true,
		);
	});
});
