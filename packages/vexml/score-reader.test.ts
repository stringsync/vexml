import { describe, expect, it } from 'bun:test';
import { DefaultScoreParser } from './default-score-parser';
import { DynamicGlyphs } from './dynamic-glyphs';
import { ScoreReader } from './score-reader';

describe('ScoreReader', () => {
	/*
	 * A <metronome>'s printed shape, which the barline_styles/tempo_beat_unit_dot screenshots
	 * pin visually but cannot pull apart: an augmentation dot is a SIBLING of the <beat-unit>
	 * it modifies, not a child, so "dotted quarter = half" and "quarter = dotted half" differ
	 * only in where the <beat-unit-dot/> sits in document order.
	 */
	const reader = new ScoreReader(new DynamicGlyphs());
	const metronome = (inner: string, attrs = '') =>
		`<direction><direction-type><metronome ${attrs}>${inner}</metronome></direction-type></direction>`;
	const markOf = async (inner: string, attrs = '') =>
		reader.tempoOf(await measureOf(metronome(inner, attrs)));

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
		reader.swingOf(await measureOf(`<sound><swing>${inner}</swing></sound>`));

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
		const m = await measureOf('<sound tempo="60"/>');
		expect(reader.swingOf(m)).toBeNull();
	});

	it('finds a <swing> nested in a <direction>, not just a bare measure child', async () => {
		const m = await measureOf(
			'<direction><direction-type><words>Swing</words></direction-type>' +
				'<sound><swing><first>2</first><second>1</second></swing></sound></direction>',
		);
		expect(reader.swingOf(m)).toMatchObject({ first: 2, second: 1 });
	});

	it('does not swing off the <metronome> figure alone: that is notation, not timing', async () => {
		const m = await measureOf(
			'<direction><direction-type><metronome>' +
				'<metronome-note><metronome-type>eighth</metronome-type></metronome-note>' +
				'<metronome-relation>equals</metronome-relation>' +
				'<metronome-note><metronome-type>quarter</metronome-type></metronome-note>' +
				'</metronome></direction-type></direction>',
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
			await measureOf(
				`<direction><direction-type><metronome ${attrs}>${inner}</metronome></direction-type></direction>`,
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

	it('is null without a relation: one group equates to nothing', async () => {
		expect(
			await modulationOf(
				'<metronome-note><metronome-type>eighth</metronome-type></metronome-note>',
			),
		).toBeNull();
	});

	it('reads both marks of one <direction>, each through its own accessor', async () => {
		const m = await measureOf(
			'<direction><direction-type><metronome><beat-unit>quarter</beat-unit>' +
				`<per-minute>60</per-minute></metronome></direction-type><direction-type><metronome>${SWING}</metronome></direction-type></direction>`,
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
	it('reads forward and backward repeats off the measure edges', async () => {
		const result = await repeatsOf(scoreOf(FORWARD, BACKWARD));
		expect(result.map((r) => [r.repeatBegin, r.repeatEnd])).toEqual([
			[true, false],
			[false, true],
		]);
	});

	it('reads a backward repeat count', async () => {
		const result = await repeatsOf(
			scoreOf(
				'<barline location="right"><repeat direction="backward" times="3"/></barline>',
			),
		);
		expect(result[0]?.repeatTimes).toBe(3);
	});

	it('reports no ending on a measure outside a volta', async () => {
		const result = await repeatsOf(scoreOf(FORWARD, BACKWARD));
		expect(result.map((r) => r.ending)).toEqual([null, null]);
	});

	it('marks a one-measure ending as both first and last', async () => {
		const result = await repeatsOf(
			scoreOf(start('1') + stop('1', 'stop') + BACKWARD, ''),
		);
		expect(result[0]?.ending).toEqual({
			number: '1',
			first: true,
			last: true,
			open: false,
			hidden: false,
		});
		expect(result[1]?.ending).toBeNull();
	});

	it('spans a multi-measure ending marked only at its edges', async () => {
		// The standard encoding: `start` on the run's first measure, `stop` on its last.
		const result = await repeatsOf(
			scoreOf(start('1'), '', stop('1', 'stop') + BACKWARD, ''),
		);
		expect(result.map((r) => r.ending)).toEqual([
			{ number: '1', first: true, last: false, open: false, hidden: false },
			{ number: '1', first: false, last: false, open: false, hidden: false },
			{ number: '1', first: false, last: true, open: false, hidden: false },
			null,
		]);
	});

	it('spans a multi-measure ending whose bounds are restated every measure', async () => {
		// Some exporters repeat `start`/`stop` on every measure of the run; a `stop` the next
		// measure reopens with the same number is that restatement, not a second ending.
		const result = await repeatsOf(
			scoreOf(
				start('1') + stop('1', 'stop'),
				start('1') + stop('1', 'stop') + BACKWARD,
				'',
			),
		);
		expect(result.map((r) => r.ending)).toEqual([
			{ number: '1', first: true, last: false, open: false, hidden: false },
			{ number: '1', first: false, last: true, open: false, hidden: false },
			null,
		]);
	});

	it('leaves an ending with no backward repeat open on the right', async () => {
		// A final ending has nothing jumping back from it, so its bracket runs on into the
		// music with no down hook, even though exporters still write `type="stop"` on it.
		const result = await repeatsOf(
			scoreOf(
				start('1') + stop('1', 'stop') + BACKWARD,
				start('2') + stop('2', 'stop'),
				'',
			),
		);
		expect(result.map((r) => r.ending?.open)).toEqual([false, true, undefined]);
	});

	it('closes an ending that runs to the end of the score', async () => {
		// Nothing follows it, so there is no music for the bracket to run on into.
		const result = await repeatsOf(
			scoreOf(
				start('1') + stop('1', 'stop') + BACKWARD,
				start('2') + stop('2', 'stop'),
			),
		);
		expect(result.map((r) => r.ending?.open)).toEqual([false, false]);
	});

	it('starts a new ending when the next run has a different number', async () => {
		const result = await repeatsOf(
			scoreOf(start('1') + stop('1', 'stop'), start('2') + stop('2', 'stop')),
		);
		expect(result.map((r) => [r.ending?.number, r.ending?.first])).toEqual([
			['1', true],
			['2', true],
		]);
	});

	it('leaves a discontinue ending open on the right', async () => {
		const result = await repeatsOf(
			scoreOf(start('2') + stop('2', 'discontinue')),
		);
		expect(result[0]?.ending).toEqual({
			number: '2',
			first: true,
			last: true,
			open: true,
			hidden: false,
		});
	});

	it('closes the bar with words written after its last note, binding them to no note', async () => {
		const reader = new ScoreReader(new DynamicGlyphs());
		const words = (text: string) =>
			`<direction><direction-type><words>${text}</words></direction-type></direction>`;
		const measure = await measureOf(words('Andante'), words('D.S. al Coda'));
		const [opening, closing] = reader.wordsOf(measure);
		expect(opening).toMatchObject({
			text: 'Andante',
			opensBar: true,
			closesBar: false,
		});
		expect(opening?.lead).not.toBeNull();
		expect(closing).toMatchObject({
			text: 'D.S. al Coda',
			lead: null,
			opensBar: false,
			closesBar: true,
		});
	});

	it('reads the formatting a words direction asks for', async () => {
		const reader = new ScoreReader(new DynamicGlyphs());
		const measure = await measureOf(
			'<direction><direction-type>' +
				'<words>plain</words>' +
				'<words font-style="italic" font-weight="bold" font-size="15" underline="2" ' +
				'enclosure="hexagon" justify="right">formatted</words>' +
				'<words font-size="x-large" enclosure="star" halign="center" justify="right">named</words>' +
				'</direction-type></direction>',
		);
		expect(reader.wordsOf(measure).map((w) => w.format)).toEqual([
			{
				italic: null,
				bold: null,
				scale: 1,
				enclosure: null,
				underline: 0,
				align: null,
			},
			// 15pt against the 10pt default text size.
			{
				italic: true,
				bold: true,
				scale: 1.5,
				enclosure: 'hexagon',
				underline: 2,
				align: 'right',
			},
			// An unknown shape draws none, and halign wins over justify.
			{
				italic: null,
				bold: null,
				scale: 1.5,
				enclosure: null,
				underline: 0,
				align: 'center',
			},
		]);
	});

	it('reads a rehearsal mark with no enclosure as asking for none', async () => {
		const reader = new ScoreReader(new DynamicGlyphs());
		const measure = await measureOf(
			'<direction><direction-type><rehearsal enclosure="none">A</rehearsal>' +
				'<rehearsal>B</rehearsal></direction-type></direction>',
		);
		expect(
			reader.rehearsalsOf(measure).map((r) => [r.text, r.format.enclosure]),
		).toEqual([
			['A', 'none'],
			['B', null],
		]);
	});

	it('reads each barline fermata with its edge, shape and side', async () => {
		const mdoc = await new DefaultScoreParser().parse(
			scoreOf(
				'<barline location="left"><fermata/></barline>' +
					'<barline location="right"><bar-style>light-heavy</bar-style>' +
					'<fermata type="upright">square</fermata>' +
					'<fermata type="inverted">angled</fermata></barline>',
			),
		);
		const [measure] = mdoc.score.parts[0]?.measures ?? [];
		if (!measure) {
			throw new Error('fixture parsed no measures');
		}
		expect(
			new ScoreReader(new DynamicGlyphs()).barlineFermatasOf(measure),
		).toEqual([
			{ location: 'left', shape: 'normal', inverted: false },
			{ location: 'right', shape: 'square', inverted: false },
			{ location: 'right', shape: 'angled', inverted: true },
		]);
	});

	/*
	 * The chord symbol a <harmony> prints, past the root and kind the harmony.png screenshot
	 * pins: degrees, inversions and bass separators each change only the string.
	 */
	const harmonyOf = async (inner: string, attrs = '') =>
		reader.harmoniesOf(
			await measureOf(
				`<harmony ${attrs}><root><root-step>C</root-step></root>${inner}</harmony>`,
			),
		)[0];
	const textOf = async (inner: string) => (await harmonyOf(inner))?.text;
	const degree = (value: number, alter: number, type: string, attrs = '') =>
		`<degree ${attrs}><degree-value>${value}</degree-value><degree-alter>${alter}</degree-alter><degree-type>${type}</degree-type></degree>`;

	it('prints an added, altered and subtracted degree after the kind', async () => {
		expect(await textOf(`<kind>major</kind>${degree(9, 0, 'add')}`)).toBe(
			'Cadd9',
		);
		expect(await textOf(`<kind>dominant</kind>${degree(5, -1, 'alter')}`)).toBe(
			'C7♭5',
		);
		expect(
			await textOf(`<kind>dominant</kind>${degree(3, 0, 'subtract')}`),
		).toBe('C7no3');
	});

	it('skips a degree the kind text already spells', async () => {
		expect(
			await textOf(
				`<kind text="7(♭9)">dominant</kind>${degree(9, -1, 'add', 'print-object="no"')}`,
			),
		).toBe('C7(♭9)');
	});

	it('wraps the degrees in parentheses when the kind asks', async () => {
		expect(
			await textOf(
				`<kind parentheses-degrees="yes">dominant</kind>${degree(9, -1, 'alter')}${degree(11, 1, 'add')}`,
			),
		).toBe('C7(♭9,add♯11)');
	});

	it('reads a degree-type text and plus-minus signs', async () => {
		expect(
			await textOf(
				'<kind>dominant</kind><degree><degree-value>5</degree-value><degree-alter plus-minus="yes">1</degree-alter><degree-type text="">alter</degree-type></degree>',
			),
		).toBe('C7+5');
	});

	it('spells an inversion bass from the kind', async () => {
		expect(await textOf('<kind>major</kind><inversion>1</inversion>')).toBe(
			'C/E',
		);
		expect(await textOf('<kind>minor</kind><inversion>1</inversion>')).toBe(
			'Cm/E♭',
		);
		expect(await textOf('<kind>dominant</kind><inversion>3</inversion>')).toBe(
			'C7/B♭',
		);
		expect(await textOf('<kind>major</kind><inversion>0</inversion>')).toBe(
			'C',
		);
	});

	it('prints an inversion text as given', async () => {
		expect(
			await textOf('<kind>major</kind><inversion text="E">1</inversion>'),
		).toBe('C/E');
	});

	it('puts the bass-separator between the chord and the bass', async () => {
		const bass = (separator: string) =>
			`<kind>major</kind><bass>${separator}<bass-step>G</bass-step></bass>`;
		expect(await textOf(bass(''))).toBe('C/G');
		expect(await textOf(bass('<bass-separator> over </bass-separator>'))).toBe(
			'C over G',
		);
		expect(await textOf(bass('<bass-separator/>'))).toBe('CG');
	});

	it('stacks the degrees between the kind and the bass', async () => {
		const harmony = await harmonyOf(
			`<kind stack-degrees="yes" parentheses-degrees="yes">dominant</kind>${degree(9, -1, 'alter')}${degree(13, -1, 'alter')}<bass><bass-step>E</bass-step></bass>`,
		);
		expect(harmony?.symbol).toEqual({
			text: 'C7(♭9,♭13)/E',
			head: 'C7(',
			stack: ['♭9', '♭13'],
			tail: ')/E',
			hang: false,
		});
	});

	it('keeps inline degrees in the head', async () => {
		const harmony = await harmonyOf(
			`<kind>dominant</kind>${degree(9, -1, 'alter')}<bass><bass-step>E</bass-step></bass>`,
		);
		expect(harmony?.symbol).toEqual({
			text: 'C7♭9/E',
			head: 'C7♭9/E',
			stack: [],
			tail: '',
			hang: false,
		});
	});

	/*
	 * The Roman numeral analysis a <harmony> with a <numeral> or <function> prints, below the
	 * stave unless its placement says otherwise. harmony_analysis.png pins the layout.
	 */
	const analysisOf = async (inner: string, attrs = '') =>
		reader.harmoniesOf(
			await measureOf(`<harmony ${attrs}>${inner}</harmony>`),
		)[0];
	const numeral = (root: number, kind: string, extra = '') =>
		`<numeral><numeral-root>${root}</numeral-root>${extra}</numeral>${kind}`;

	it('cases a numeral by its kind and adds the quality sign', async () => {
		const textOf = async (root: number, kind: string) =>
			(await analysisOf(numeral(root, `<kind>${kind}</kind>`)))?.text;
		expect(await textOf(1, 'major')).toBe('I');
		expect(await textOf(2, 'minor')).toBe('ii');
		expect(await textOf(7, 'diminished')).toBe('vii°');
		expect(await textOf(3, 'augmented')).toBe('III+');
		expect(await textOf(7, 'half-diminished')).toBe('viiø7');
		expect(await textOf(4, 'major-seventh')).toBe('IVM7');
	});

	it('stacks the inversion figures after the numeral, hung from its top', async () => {
		const symbolOf = async (kind: string, inversion: number) =>
			(
				await analysisOf(
					numeral(5, `<kind>${kind}</kind><inversion>${inversion}</inversion>`),
				)
			)?.symbol;
		expect(await symbolOf('major', 1)).toEqual({
			text: 'V6',
			head: 'V',
			stack: ['6'],
			tail: '',
			hang: true,
		});
		expect((await symbolOf('major', 2))?.stack).toEqual(['4', '6']);
		expect((await symbolOf('dominant', 0))?.stack).toEqual(['7']);
		expect((await symbolOf('dominant', 1))?.stack).toEqual(['5', '6']);
		expect((await symbolOf('dominant', 2))?.stack).toEqual(['3', '4']);
		expect((await symbolOf('dominant', 3))?.stack).toEqual(['2', '4']);
	});

	it('prints the numeral-root and inversion text as given', async () => {
		const harmony = await analysisOf(
			'<numeral><numeral-root text="IV">4</numeral-root></numeral><kind text="">major</kind><inversion text="6">1</inversion>',
		);
		expect(harmony?.text).toBe('IV6');
	});

	it('lets a kind text spell a root-position seventh', async () => {
		const harmony = await analysisOf(
			numeral(5, '<kind text="7">dominant</kind>'),
		);
		expect(harmony?.text).toBe('V7');
		expect(harmony?.symbol.stack).toEqual([]);
	});

	it('puts the numeral-alter on the side its location names', async () => {
		const textOf = async (alter: string) =>
			(await analysisOf(numeral(6, '<kind>major</kind>', alter)))?.text;
		expect(await textOf('<numeral-alter>-1</numeral-alter>')).toBe('♭VI');
		expect(
			await textOf('<numeral-alter location="right">1</numeral-alter>'),
		).toBe('VI♯');
		expect(
			await textOf('<numeral-alter print-object="no">1</numeral-alter>'),
		).toBe('VI');
	});

	it('names the numeral-key ahead of the numeral', async () => {
		const key = (fifths: number, mode: string, attrs = '') =>
			`<numeral-key ${attrs}><numeral-fifths>${fifths}</numeral-fifths><numeral-mode>${mode}</numeral-mode></numeral-key>`;
		const textOf = async (extra: string) =>
			(await analysisOf(numeral(1, '<kind>major</kind>', extra)))?.text;
		expect(await textOf(key(1, 'major'))).toBe('G: I');
		expect(await textOf(key(-3, 'harmonic minor'))).toBe('c: I');
		expect(await textOf(key(2, 'major', 'print-object="no"'))).toBe('I');
	});

	it('prints a function as written', async () => {
		const harmony = await analysisOf(
			'<function>D</function><kind>dominant</kind>',
		);
		expect(harmony?.text).toBe('D7');
	});

	it('places analysis below and chord symbols above, unless placement says', async () => {
		const below = numeral(1, '<kind>major</kind>');
		expect((await analysisOf(below))?.placement).toBe('below');
		expect((await analysisOf(below, 'placement="above"'))?.placement).toBe(
			'above',
		);
		expect((await harmonyOf('<kind>major</kind>'))?.placement).toBe('above');
		expect(
			(await harmonyOf('<kind>major</kind>', 'placement="below"'))?.placement,
		).toBe('below');
	});

	it('draws the kind as its symbol under use-symbols', async () => {
		const kind = (value: string) =>
			`<kind use-symbols="yes" text="maj7">${value}</kind>`;
		expect(await textOf(kind('major-seventh'))).toBe('C△7');
		expect(await textOf(kind('minor-seventh'))).toBe('C-7');
		expect(await textOf(kind('half-diminished'))).toBe('Cø7');
		expect(await textOf(kind('diminished'))).toBe('C°');
		expect(await textOf(kind('augmented'))).toBe('C+');
		expect(await textOf('<kind use-symbols="yes">dominant</kind>')).toBe('C7');
	});

	it('puts a degree-value symbol before its value', async () => {
		expect(
			await textOf(
				`<kind use-symbols="yes">major-minor</kind>${degree(7, 0, 'alter').replace('<degree-value>', '<degree-value symbol="major">')}`,
			),
		).toBe('C-△7');
		expect(
			await textOf(
				'<kind>major</kind><degree><degree-value symbol="diminished" text="">5</degree-value><degree-alter>0</degree-alter><degree-type>alter</degree-type></degree>',
			),
		).toBe('C°');
	});

	const frame =
		'<frame unplayed=""><frame-strings>6</frame-strings><frame-frets>5</frame-frets><frame-note><string>1</string><fret>0</fret></frame-note></frame>';

	it('reads the frame-frets rows and unplayed text', async () => {
		const harmony = await harmonyOf(`<kind>major</kind>${frame}`);
		expect(harmony?.frame).toMatchObject({ fretCount: 5, unplayed: '' });
	});

	it('hides the frame when print-frame is no', async () => {
		const harmony = await harmonyOf(
			`<kind>major</kind>${frame}`,
			'print-frame="no"',
		);
		expect(harmony?.frame).toBeNull();
		expect(harmony?.text).toBe('C');
	});

	it('reads the header from the page-one credits, dropping the footers', async () => {
		const header = await headerOf(
			'<defaults><page-layout><page-height>1000</page-height><page-width>900</page-width></page-layout></defaults>' +
				'<credit page="1"><credit-words default-x="450" default-y="900" justify="center">Air</credit-words>' +
				'<credit-words> \n</credit-words><credit-words>from Suite No. 3</credit-words></credit>' +
				'<credit page="1"><credit-words default-x="850" default-y="850" halign="right" justify="center">J. S. Bach</credit-words></credit>' +
				'<credit page="1"><credit-words default-x="50" default-y="850">Anon.</credit-words></credit>' +
				'<credit page="1"><credit-words default-x="50" default-y="950">2</credit-words></credit>' +
				'<credit page="1"><credit-words default-x="450" default-y="40" justify="center">Copyright</credit-words></credit>' +
				'<credit page="2"><credit-words default-x="450" default-y="900" justify="center">Page two</credit-words></credit>',
			'<work><work-title>Catalog title</work-title></work>',
		);
		expect(header).toEqual({
			title: 'Air',
			subtitles: ['from Suite No. 3'],
			left: ['Anon.'],
			right: ['J. S. Bach'],
			symbols: [],
			footer: [],
		});
	});

	it('places a credit by its credit-type over its alignment', async () => {
		const header = await headerOf(
			'<credit><credit-type>composer</credit-type><credit-words justify="left">Brahms</credit-words></credit>' +
				'<credit><credit-type>rights</credit-type><credit-words>Public domain</credit-words></credit>' +
				'<credit><credit-type>subtitle</credit-type><credit-words>Op. 77</credit-words></credit>' +
				'<credit><credit-type>title</credit-type><credit-words>Concerto</credit-words></credit>',
		);
		expect(header).toEqual({
			title: 'Concerto',
			subtitles: ['Op. 77'],
			left: [],
			right: ['Brahms'],
			symbols: [],
			footer: ['Public domain'],
		});
	});

	it('falls back to the work and movement titles and the creators when there are no credits', async () => {
		const header = await headerOf(
			'<work><work-title>Suite No. 3</work-title></work>' +
				'<movement-title>Air</movement-title>' +
				'<identification><creator type="composer">J. S. Bach</creator>' +
				'<creator type="lyricist"/><creator type="poet">Anon.</creator></identification>',
		);
		expect(header).toEqual({
			title: 'Suite No. 3',
			subtitles: ['Air'],
			left: ['Anon.'],
			right: ['J. S. Bach'],
			symbols: [],
			footer: [],
		});
	});

	it('numbers the catalog fallback and reads identification rights and credit symbols', async () => {
		const catalog = await headerOf(
			'<work><work-number>BWV 1068</work-number><work-title>Suite No. 3</work-title></work>' +
				'<movement-number>2</movement-number><movement-title>Air</movement-title>' +
				'<identification><rights>(c) 2026\nAll rights reserved</rights></identification>',
		);
		expect(catalog).toEqual({
			title: 'Suite No. 3',
			subtitles: ['BWV 1068', '2. Air'],
			left: [],
			right: [],
			symbols: [],
			footer: ['(c) 2026', 'All rights reserved'],
		});
		const credit = await headerOf(
			'<credit><credit-type>title</credit-type><credit-words>Song</credit-words></credit>' +
				'<credit><credit-symbol>segno</credit-symbol></credit>',
		);
		expect(credit?.symbols).toEqual(['\uE047']);
	});

	it('reads no header from a score that names nothing', async () => {
		expect(await headerOf('')).toBeNull();
	});

	describe('measureStyleOf', () => {
		it('counts each measure of a two-bar repeat pattern until the stop', async () => {
			const measures = await styledMeasures([
				STYLE('<measure-repeat type="start">2</measure-repeat>'),
				'',
				'',
				'',
				STYLE('<measure-repeat type="stop"/>'),
			]);
			const reader = new ScoreReader(new DynamicGlyphs());
			expect(measures.map((m) => reader.measureStyleOf(m, '1'))).toEqual([
				{ kind: 'measure-repeat', count: 2, slashes: 1, bar: 0 },
				{ kind: 'measure-repeat', count: 2, slashes: 1, bar: 1 },
				{ kind: 'measure-repeat', count: 2, slashes: 1, bar: 0 },
				{ kind: 'measure-repeat', count: 2, slashes: 1, bar: 1 },
				null,
			]);
		});

		it('draws the notes of a measure a beat repeat only partly covers', async () => {
			const measures = await styledMeasures([
				`${QUARTER.repeat(2)}${STYLE('<beat-repeat type="start"/>')}`,
				'',
			]);
			const reader = new ScoreReader(new DynamicGlyphs());
			expect(reader.measureStyleOf(measures[0] as never, '1')).toBeNull();
			expect(reader.measureStyleOf(measures[1] as never, '1')).toMatchObject({
				kind: 'beat-repeat',
				beats: [0, 1, 2, 3],
			});
		});

		it('slashes a compound meter on its dotted-quarter beats', async () => {
			const measures = await styledMeasures(
				[STYLE('<slash type="start"/>')],
				'<beats>6</beats><beat-type>8</beat-type>',
				'<note><pitch><step>C</step><octave>4</octave></pitch><duration>6</duration><type>half</type><dot/></note>',
			);
			const reader = new ScoreReader(new DynamicGlyphs());
			expect(reader.measureStyleOf(measures[0] as never, '1')).toMatchObject({
				kind: 'beat-slash',
				unit: 1.5,
				beats: [0, 1.5],
			});
		});
	});

	describe('noteStyleOf', () => {
		it('hides the notes a beat repeat starting mid-measure covers, one sign per beat', async () => {
			const [measure] = await styledMeasures([
				`${QUARTER.repeat(2)}${STYLE('<beat-repeat type="start"/>')}`,
			]);
			const reader = new ScoreReader(new DynamicGlyphs());
			expect(
				measure?.notes.map((note) => {
					const { hidden, sign } = reader.noteStyleOf(note);
					return [hidden, sign?.kind ?? null];
				}),
			).toEqual([
				[false, null],
				[false, null],
				[true, 'beat-repeat'],
				[true, 'beat-repeat'],
			]);
		});

		it('leaves a voice named by <except-voice> drawn', async () => {
			const [measure] = await styledMeasures([
				STYLE('<slash type="start"><except-voice>2</except-voice></slash>'),
			]);
			const reader = new ScoreReader(new DynamicGlyphs());
			const [first] = measure?.notes ?? [];
			expect(reader.measureStyleOf(measure as never, '1')).toBeNull();
			expect(reader.noteStyleOf(first as never).hidden).toBe(true);
			expect(first?.voice).toBe('1');
		});
	});

	describe('bendOf', () => {
		const bendOf = async (bend: string) => {
			const measure = await measureOf(
				`<note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><notations><technical><string>3</string><fret>7</fret>${bend}</technical></notations></note>`,
			);
			const [note] = measure.notes;
			return new ScoreReader(new DynamicGlyphs()).bendOf(note as never);
		};

		it('reads a plain bend as curved, with no pre-bend or bar', async () => {
			expect(await bendOf('<bend><bend-alter>2</bend-alter></bend>')).toEqual({
				semitones: 2,
				release: false,
				preBend: false,
				shape: 'curved',
				bar: null,
			});
		});

		it('reads the pre-bend, the angled shape and the bar text', async () => {
			expect(
				await bendOf(
					'<bend shape="angled"><bend-alter>-1</bend-alter><pre-bend/><with-bar> dip </with-bar></bend>',
				),
			).toMatchObject({
				semitones: -1,
				preBend: true,
				shape: 'angled',
				bar: 'dip',
			});
		});

		it('reads an empty <with-bar/> as an empty bar, not a missing one', async () => {
			expect(
				await bendOf('<bend><bend-alter>-2</bend-alter><with-bar/></bend>'),
			).toMatchObject({ bar: '' });
		});

		it('is null for a note with no bend', async () => {
			expect(await bendOf('')).toBeNull();
		});
	});

	it('rhythm-slashes the notes from where a <slash use-stems="yes"> starts', async () => {
		const [measure] = await styledMeasures([
			`${QUARTER.repeat(2)}${STYLE('<slash type="start" use-stems="yes"/>')}`,
		]);
		const reader = new ScoreReader(new DynamicGlyphs());
		expect(measure?.notes.map((note) => reader.isRhythmSlashed(note))).toEqual([
			false,
			false,
			true,
			true,
		]);
	});
});

/* A one-part score whose measures carry exactly the given <barline>s (and a note, so the
 * measure is well-formed). Each entry is the raw inner XML of that measure's barlines. */
function scoreOf(...barlines: string[]): string {
	const measures = barlines
		.map(
			(b, i) => `<measure number="${i + 1}">
			${b}
			<note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
		</measure>`,
		)
		.join('');
	return `<?xml version="1.0"?>
<score-partwise version="4.0">
	<part-list><score-part id="P1"><part-name>Music</part-name></score-part></part-list>
	<part id="P1">${measures}</part>
</score-partwise>`;
}

/* A one-part 4/4 measure of quarter notes, prefixed with the directions under test: what the
 * tempo, swing and modulation readers are asked about. */
async function measureOf(prefix: string, suffix = '') {
	const mdoc = await new DefaultScoreParser().parse(`<?xml version="1.0"?>
<score-partwise version="4.0">
	<part-list><score-part id="P1"><part-name>Music</part-name></score-part></part-list>
	<part id="P1"><measure number="1">
		<attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
		${prefix}
		${'<note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>'.repeat(4)}
		${suffix}
	</measure></part>
</score-partwise>`);
	const [measure] = mdoc.score.parts[0]?.measures ?? [];
	if (!measure) {
		throw new Error('fixture parsed no measures');
	}
	return measure;
}

/* The header of a one-part score: `work` holds its <work> and <identification>, and `credits`
 * its <defaults> and <credit>s, in the schema order ahead of the part-list. */
async function headerOf(credits: string, work = '') {
	const mdoc = await new DefaultScoreParser().parse(`<?xml version="1.0"?>
<score-partwise version="4.0">
	${work}
	${credits}
	<part-list><score-part id="P1"><part-name>Music</part-name></score-part></part-list>
	<part id="P1"><measure number="1"/></part>
</score-partwise>`);
	return new ScoreReader(new DynamicGlyphs()).headerOf(mdoc.score);
}

async function repeatsOf(xml: string) {
	const mdoc = await new DefaultScoreParser().parse(xml);
	return new ScoreReader(new DynamicGlyphs()).measureRepeats(
		mdoc.score.parts[0]?.measures ?? [],
	);
}

const FORWARD =
	'<barline location="left"><repeat direction="forward"/></barline>';
const BACKWARD =
	'<barline location="right"><repeat direction="backward"/></barline>';
const start = (n: string) =>
	`<barline location="left"><ending number="${n}" type="start"/></barline>`;
const stop = (n: string, type: string) =>
	`<barline location="right"><ending number="${n}" type="${type}"/></barline>`;

const QUARTER =
	'<note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>';
const STYLE = (inner: string) =>
	`<attributes><measure-style>${inner}</measure-style></attributes>`;

/* One-part measures, each its own `<measure-style>` markup placed among quarter notes: the
 * prefix's notes first, then whatever of the bar they leave filled with quarters. */
async function styledMeasures(
	prefixes: string[],
	time = '<beats>4</beats><beat-type>4</beat-type>',
	fill?: string,
) {
	const body = prefixes
		.map((prefix, i) => {
			const attrs =
				i === 0
					? `<attributes><divisions>${fill ? 2 : 1}</divisions><time>${time}</time></attributes>`
					: '';
			const written = (prefix.match(/<note>/g) ?? []).length;
			const notes = fill ?? QUARTER.repeat(4 - written);
			return `<measure number="${i + 1}">${attrs}${prefix}${notes}</measure>`;
		})
		.join('');
	const mdoc = await new DefaultScoreParser().parse(`<?xml version="1.0"?>
<score-partwise version="4.0">
	<part-list><score-part id="P1"><part-name>Music</part-name></score-part></part-list>
	<part id="P1">${body}</part>
</score-partwise>`);
	return mdoc.score.parts[0]?.measures ?? [];
}
