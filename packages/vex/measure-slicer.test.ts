import { describe, expect, it } from 'bun:test';
import {
	MDOMParser,
	MDocument,
	type Measure,
	MusicXMLSerializer,
} from '@stringsync/mdom';
import { MeasureSlicer, parseMeasureSpec } from './measure-slicer';

describe('MeasureSlicer', () => {
	it.each([
		'standalone',
		'raw',
	] as const)('selects exactly three source columns across movement resets with %s policy', (policy) => {
		const xml = new MeasureSlicer('8,6-7,6', policy, 'position').slice(
			twoMovements(),
		);
		const parts = new MDOMParser().parseFromString(xml).score.parts;
		expect(
			parts.map((p) =>
				p.measures.map((m) => [
					m.number,
					m.notes[0]?.pitch?.step,
					m.notes[0]?.pitch?.octave,
				]),
			),
		).toEqual([
			[
				['X1', 'F', 4],
				['77', 'G', 4],
				['78', 'A', 4],
			],
			[
				['X1', 'F', 3],
				['77', 'G', 3],
				['78', 'A', 3],
			],
		]);
		expect(
			parts.map((part) => [
				part.measures[0]?.getKey()?.fifths,
				part.measures[0]?.getTime()?.beats,
				part.measures[0]?.getClef()?.sign,
			]),
		).toEqual([
			[-2, '3', 'G'],
			[-2, '3', 'F'],
		]);
	});

	it('counts pickups and nonnumeric labels without renumbering them', () => {
		const xml = new MeasureSlicer('05-6', 'standalone', 'position').slice(
			twoMovements(),
		);
		expect(measuresOf(xml).map((m) => m.number)).toEqual(['0', 'X1']);
	});

	it('keeps every occurrence when selecting printed labels by default', () => {
		const xml = slice(twoMovements(), 'X1,0,77-78');
		expect(measuresOf(xml).map((m) => m.number)).toEqual([
			'0',
			'X1',
			'77',
			'78',
			'0',
			'X1',
			'77',
			'78',
		]);
	});

	it.each([
		'0',
		'-1',
		'X1',
		'1.5',
		'1,,2',
		'3-2',
		'9007199254740992',
		'1-9007199254740992',
	])('rejects invalid positional selection %s', (spec) => {
		expect(() => new MeasureSlicer(spec, 'standalone', 'position')).toThrow();
	});

	it('rejects a selection containing an out-of-bounds position', () => {
		expect(() =>
			new MeasureSlicer('6,9', 'standalone', 'position').slice(twoMovements()),
		).toThrow('position 9');
	});

	it('rejects unequal part lengths rather than silently selecting different columns', () => {
		const doc = new MDOMParser().parseFromString(twoMovements());
		doc.score.parts[1]?.measures.at(-1)?.remove();
		const source = new MusicXMLSerializer().serializeToString(doc);
		expect(() =>
			new MeasureSlicer('2', 'standalone', 'position').slice(source),
		).toThrow('same measure count');
	});

	it.each([
		'1',
		'2',
		'3',
		'1,3',
		'1-3',
	])('linearizes open, closed, and nested repeats for selection %s', (spec) => {
		const source = rawScoreOf(
			'<attributes><divisions>1</divisions></attributes><barline location="left"><repeat direction="forward"/></barline>',
			'<barline location="left"><repeat direction="forward"/></barline><barline><repeat direction="backward" times="3"/></barline>',
			'<barline><repeat direction="backward"/></barline>',
		);
		const xml = slice(source, spec);
		expect(countOf(xml, 'repeat')).toBe(0);
		expect(
			measuresOf(xml).flatMap((m) =>
				m.notes.map((n) => [n.pitch?.step, n.duration]),
			),
		).toEqual(
			measuresOf(source)
				.filter((m) => parseMeasureSpec(spec).has(m.number))
				.flatMap((m) => m.notes.map((n) => [n.pitch?.step, n.duration])),
		);
	});

	it.each([
		'1',
		'2',
		'3',
		'1,3',
		'1-3',
	])('removes first and second endings without dropping their notes for %s', (spec) => {
		const source = rawScoreOf(
			'<barline location="left"><repeat direction="forward"/></barline>',
			'<barline location="left"><ending number="1" type="start"/></barline><barline><ending number="1" type="stop"/><repeat direction="backward"/></barline>',
			'<barline location="left"><ending number="2" type="start"/></barline><barline><ending number="2" type="discontinue"/></barline>',
		);
		const xml = slice(source, spec);
		expect(countOf(xml, 'ending')).toBe(0);
		expect(countOf(xml, 'repeat')).toBe(0);
		expect(countOf(xml, 'note')).toBe(parseMeasureSpec(spec).size);
	});

	it.each([
		['D.C. al Fine', 'dacapo="yes"', '2'],
		['D.S. al Coda', 'dalsegno="s"', '2'],
		['Fine', 'fine="yes"', '2'],
		['To Coda', 'tocoda="c"', '2'],
		['Da Capo', 'dacapo="yes"', '2'],
		['Dal Segno al Fine', 'dalsegno="s"', '2'],
		['D.C. al Fine', 'dacapo="yes"', '1-3'],
		['D.S. al Coda', 'dalsegno="s"', '1-3'],
		['Fine', 'fine="yes"', '1-3'],
		['To Coda', 'tocoda="c"', '1-3'],
		['Da Capo', 'dacapo="yes"', '1-3'],
		['Dal Segno al Fine', 'dalsegno="s"', '1-3'],
	])('removes %s (%s) in selection %s', (words, attr, spec) => {
		const source = rawScoreOf(
			'<direction><direction-type><segno/></direction-type><sound segno="s"/></direction>',
			`<direction><direction-type><words>${words}</words></direction-type><sound ${attr}/></direction>`,
			'<direction><direction-type><coda/></direction-type><sound coda="c"/></direction>',
		);
		const xml = slice(source, spec);
		expect(countOf(xml, 'direction')).toBe(0);
		expect(countOf(xml, 'sound')).toBe(0);
	});

	it('keeps tempo, dynamics, bar styles and unrelated words while removing implicit repeats', () => {
		const xml = slice(
			rawScoreOf(
				'<direction><direction-type><words>D.C.</words></direction-type><sound dacapo="yes" tempo="96"/></direction>' +
					'<direction><direction-type><words>Allegro con brio</words></direction-type><direction-type><dynamics><p/></dynamics></direction-type></direction>' +
					'<sound forward-repeat="yes" time-only="2" dynamics="80"/>' +
					'<barline><bar-style>light-heavy</bar-style><segno/><coda/><repeat direction="backward"/></barline>',
			),
			'1',
		);
		expect(xml).toContain('tempo="96"');
		expect(xml).toContain('dynamics="80"');
		expect(xml).toContain('Allegro con brio');
		expect(xml).toContain('<p/>');
		expect(xml).toContain('<bar-style>light-heavy</bar-style>');
		expect(xml).not.toMatch(
			/dacapo|forward-repeat|time-only|<segno|<coda|<repeat/,
		);
	});

	it('raw preserves detached repeat, ending and navigation markup', () => {
		const xml = new MeasureSlicer('2', 'raw').slice(
			rawScoreOf(
				'',
				'<direction><direction-type><words>D.S. al Fine</words></direction-type><sound dalsegno="lost"/></direction>' +
					'<barline><ending number="1" type="stop"/><repeat direction="backward"/></barline>',
			),
		);
		expect(xml).toContain('dalsegno="lost"');
		expect(xml).toContain('D.S. al Fine');
		expect(countOf(xml, 'ending')).toBe(1);
		expect(countOf(xml, 'repeat')).toBe(1);
	});

	it('preserves distinct pitches, rests and durations in every retained part', () => {
		const source = `<score-partwise version="4.0">
<part-list><score-part id="P1"><part-name>One</part-name></score-part><score-part id="P2"><part-name>Two</part-name></score-part></part-list>
<part id="P1">
<measure number="1"><attributes>${DIVISIONS}</attributes>${NOTE}</measure>
<measure number="2"><note><pitch><step>D</step><alter>1</alter><octave>5</octave></pitch><duration>2</duration><type>half</type></note><barline><repeat direction="backward"/></barline></measure>
<measure number="3"><note><rest/><duration>4</duration><type>whole</type></note></measure>
</part>
<part id="P2">
<measure number="1"><attributes>${DIVISIONS}</attributes>${NOTE}</measure>
<measure number="2"><note><pitch><step>F</step><octave>3</octave></pitch><duration>1</duration><type>quarter</type></note><sound dacapo="yes"/></measure>
<measure number="3">${NOTE}</measure>
</part></score-partwise>`;
		const xml = slice(source, '2-3');
		const doc = new MDOMParser().parseFromString(xml);
		expect(
			doc.score.parts.map((p) =>
				p.measures.map((m) => [
					m.number,
					m.notes.map((n) => [
						n.pitch?.step ?? null,
						n.pitch?.alter ?? null,
						n.pitch?.octave ?? null,
						n.duration,
					]),
				]),
			),
		).toEqual([
			[
				['2', [['D', 1, 5, 2]]],
				['3', [[null, null, null, 4]]],
			],
			[
				['2', [['F', 0, 3, 1]]],
				['3', [['C', 0, 4, 1]]],
			],
		]);
		expect(xml).not.toMatch(/<repeat|dacapo/);
	});

	it('keeps only the requested measures, in document order', () => {
		const xml = slice(scoreOf(OPENING, NONE, NONE, NONE, NONE), '1,3-4');
		expect(measuresOf(xml).map((m) => m.number)).toEqual(['1', '3', '4']);
	});

	it('hoists the signatures in effect into the opening measure', () => {
		const xml = slice(scoreOf(OPENING, NONE, NONE), '3');
		const measure = firstMeasureOf(xml);
		expect(measure.getKey()?.fifths).toBe(3);
		expect(measure.getTime()?.beats).toBe('4');
		expect(measure.getClef()?.sign).toBe('G');
	});

	it('hoists the nearest signature, not the earliest', () => {
		const xml = slice(scoreOf(OPENING, FLATS, NONE), '3');
		expect(firstMeasureOf(xml).getKey()?.fifths).toBe(-2);
	});

	it('leaves the opening measure its own signatures', () => {
		const xml = slice(scoreOf(OPENING, NONE, FLATS), '3');
		expect(firstMeasureOf(xml).getKey()?.fifths).toBe(-2);
		expect(countOf(xml, 'key')).toBe(1);
	});

	it('hoists into a measure that declares no attributes at all', () => {
		const xml = slice(scoreOf(OPENING, NONE), '2');
		const measure = firstMeasureOf(xml);
		expect(measure.getKey()?.fifths).toBe(3);
		expect(measure.getTime()?.beats).toBe('4');
		expect(measure.getClef()?.sign).toBe('G');
		expect(measure.notes).toHaveLength(1);
	});

	it('carries every signature in effect, each exactly once', () => {
		const xml = slice(scoreOf(OPENING, NONE, NONE), '3');
		const measure = firstMeasureOf(xml);
		expect(measure.getKey()?.fifths).toBe(3);
		expect(measure.getTime()?.beats).toBe('4');
		expect(measure.getClef()?.sign).toBe('G');
		// Schema child order inside <attributes> is mdom's invariant to hold, not vexml's
		// to check: the slice only has to name each signature once.
		expect(
			['divisions', 'key', 'time', 'clef'].map((tag) => countOf(xml, tag)),
		).toEqual([1, 1, 1, 1]);
	});

	it('throws when a part has no matching measures', () => {
		expect(() => slice(scoreOf(NONE, NONE), '9')).toThrow();
	});

	it('rejects a malformed spec at construction', () => {
		expect(() => new MeasureSlicer('1,,2')).toThrow();
	});

	it('hoists a per-staff clef for each staff', () => {
		const xml = slice(
			rawScoreOf(
				`<attributes>${DIVISIONS}<staves>2</staves>` +
					'<clef number="1"><sign>G</sign><line>2</line></clef>' +
					'<clef number="2"><sign>F</sign><line>4</line></clef></attributes>',
				'',
			),
			'2',
		);
		const measure = firstMeasureOf(xml);
		expect(measure.staveCount).toBe(2);
		expect(measure.getClef('1')?.sign).toBe('G');
		expect(measure.getClef('2')?.sign).toBe('F');
	});

	it('stops at a numberless key, which already covers every staff', () => {
		const xml = slice(
			rawScoreOf(
				`<attributes>${DIVISIONS}<staves>2</staves><key number="2"><fifths>3</fifths></key></attributes>`,
				'<attributes><key><fifths>-2</fifths></key></attributes>',
				'',
			),
			'3',
		);
		expect(firstMeasureOf(xml).getKey()?.fifths).toBe(-2);
		expect(countOf(xml, 'key')).toBe(1);
	});

	it('does not let a mid-measure change suppress what the measure inherits', () => {
		const xml = slice(
			`<?xml version="1.0"?>
<score-partwise version="4.0">
	<part-list><score-part id="P1"><part-name>Music</part-name></score-part></part-list>
	<part id="P1">
		<measure number="1">
			<attributes>${DIVISIONS}<key><fifths>3</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>
			${NOTE}
		</measure>
		<measure number="2">
			${NOTE}
			<attributes><key><fifths>-2</fifths></key></attributes>
			${NOTE}
		</measure>
	</part>
</score-partwise>`,
			'2',
		);
		const measure = firstMeasureOf(xml);
		// Opens in 3 sharps (inherited), then changes to 2 flats mid-measure: both survive.
		expect(measure.getKey()?.fifths).toBe(3);
		expect(countOf(xml, 'key')).toBe(2);
	});

	it('expands a mix of singles and ranges', () => {
		expect([...parseMeasureSpec('1,3-5,8')]).toEqual(['1', '3', '4', '5', '8']);
	});

	it('tolerates whitespace and duplicates', () => {
		expect([...parseMeasureSpec(' 2 , 1-3 ')]).toEqual(['2', '1', '3']);
	});

	it('keeps a non-numeric label literal', () => {
		expect([...parseMeasureSpec('X1')]).toEqual(['X1']);
	});

	it('rejects an empty measure', () => {
		expect(() => parseMeasureSpec('1,,2')).toThrow();
	});

	it('rejects a descending range', () => {
		expect(() => parseMeasureSpec('5-3')).toThrow();
	});
});

/* A one-part score whose measures carry exactly the given signatures (and a note, so the
 * measure is well-formed). NONE means the measure declares none. Signatures go in before
 * the note so they land in the measure's LEADING <attributes>: mdom appends the block where
 * the write cursor is, and after a note that would be a mid-measure change instead. */
function scoreOf(...signatures: Array<(measure: Measure) => void>): string {
	const doc = MDocument.empty();
	const part = doc.score.addPart({ id: 'P1', name: 'Music' });
	for (const declareSignatures of signatures) {
		const measure = part.addMeasure();
		declareSignatures(measure);
		measure
			.getOrCreateVoice('1')
			.addNote({ step: 'C', octave: 4, type: 'quarter' });
	}
	return new MusicXMLSerializer().serializeToString(doc);
}

const NONE = () => {};
const TREBLE = (m: Measure) => void m.setClef({ sign: 'G', line: 2 });
const COMMON = (m: Measure) => void m.setTime({ beats: 4, beatType: 4 });
const SHARPS = (m: Measure) => void m.setKey({ fifths: 3 });
const FLATS = (m: Measure) => void m.setKey({ fifths: -2 });
const OPENING = (m: Measure) => {
	SHARPS(m);
	COMMON(m);
	TREBLE(m);
};

function measuresOf(xml: string) {
	const [part] = new MDOMParser().parseFromString(xml).score.parts;
	if (!part) {
		throw new Error('sliced score has no parts');
	}
	return part.measures;
}

function firstMeasureOf(xml: string) {
	const [measure] = measuresOf(xml);
	if (!measure) {
		throw new Error('sliced part has no measures');
	}
	return measure;
}

/* Occurrences of `<tag` in the serialized slice: how a duplicated signature shows up.
 * String-counted rather than walked: what the CLI writes out is the artifact under test. */
function countOf(xml: string, tag: string): number {
	return xml.split(`<${tag}`).length - 1;
}

function slice(xml: string, spec: string): string {
	return new MeasureSlicer(spec).slice(xml);
}

/* The hand-written markup cases above are hand-written MusicXML rather than built through mdom's writers:
 * <staves>, a per-staff <key>, and an <attributes> change sitting between two notes. Each is
 * a markup shape the slicer has to carry, so the fixture states it literally. */
const DIVISIONS = '<divisions>1</divisions>';
const NOTE =
	'<note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>';

/* Both movements reset their printed labels; each part has distinct registers. */
function twoMovements(): string {
	const parts = [4, 3]
		.map((octave, index) => {
			const measures = ['0', 'X1', '77', '78', '0', 'X1', '77', '78']
				.map((label, i) => {
					const attributes =
						i === 0 || i === 4
							? `<attributes>${DIVISIONS}<key><fifths>${i === 0 ? 3 : -2}</fifths></key><time><beats>${i === 0 ? 4 : 3}</beats><beat-type>4</beat-type></time><clef><sign>${index === 0 ? 'G' : 'F'}</sign><line>${index === 0 ? 2 : 4}</line></clef></attributes>`
							: '';
					return `<measure number="${label}">${attributes}<note><pitch><step>${['C', 'D', 'E', 'F', 'E', 'F', 'G', 'A'][i]}</step><octave>${octave}</octave></pitch><duration>1</duration><type>quarter</type></note></measure>`;
				})
				.join('');
			return `<part id="P${index + 1}">${measures}</part>`;
		})
		.join('');
	return `<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>One</part-name></score-part><score-part id="P2"><part-name>Two</part-name></score-part></part-list>${parts}</score-partwise>`;
}

function rawScoreOf(...measures: string[]): string {
	const body = measures
		.map((m, i) => `<measure number="${i + 1}">${m}${NOTE}</measure>`)
		.join('');
	return `<?xml version="1.0"?>
<score-partwise version="4.0">
	<part-list><score-part id="P1"><part-name>Music</part-name></score-part></part-list>
	<part id="P1">${body}</part>
</score-partwise>`;
}
