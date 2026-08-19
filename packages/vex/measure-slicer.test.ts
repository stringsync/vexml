import { describe, expect, it } from 'bun:test';
import {
	MDocument,
	type Measure,
	MDOMParser,
	MusicXMLSerializer,
} from '@stringsync/mdom';
import { MeasureSlicer, parseMeasureSpec } from './measure-slicer';

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

/* Occurrences of `<tag` in the serialized slice — how a duplicated signature shows up.
 * String-counted rather than walked: what the CLI writes out is the artifact under test. */
function countOf(xml: string, tag: string): number {
	return xml.split(`<${tag}`).length - 1;
}

function slice(xml: string, spec: string): string {
	return new MeasureSlicer(spec).slice(xml);
}

describe('MeasureSlicer', () => {
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
		// to check — the slice only has to name each signature once.
		for (const tag of ['divisions', 'key', 'time', 'clef']) {
			expect(countOf(xml, tag)).toBe(1);
		}
	});

	it('throws when a part has no matching measures', () => {
		expect(() => slice(scoreOf(NONE, NONE), '9')).toThrow();
	});

	it('rejects a malformed spec at construction', () => {
		expect(() => new MeasureSlicer('1,,2')).toThrow();
	});
});

/* The three cases below stay hand-written: mdom 0.2.4 has no writer for <staves>, and none
 * for a mid-measure <attributes> change. Convert them once it does — see MDOM-PROMPT.md. */
const DIVISIONS = '<divisions>1</divisions>';
const NOTE =
	'<note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>';

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

describe('MeasureSlicer, on markup mdom cannot yet write', () => {
	it('hoists a per-staff clef for each staff', () => {
		const grandStaff =
			`<attributes>${DIVISIONS}<staves>2</staves>` +
			'<clef number="1"><sign>G</sign><line>2</line></clef>' +
			'<clef number="2"><sign>F</sign><line>4</line></clef></attributes>';
		const xml = slice(rawScoreOf(grandStaff, ''), '2');
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
		// Opens in 3 sharps (inherited), then changes to 2 flats mid-measure — both survive.
		expect(measure.getKey()?.fifths).toBe(3);
		expect(countOf(xml, 'key')).toBe(2);
	});
});

describe('parseMeasureSpec', () => {
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
