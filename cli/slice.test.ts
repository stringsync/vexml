import { describe, expect, it } from 'bun:test';
import { sliceMusicXML } from './slice';
import {
	COMMON,
	countOf,
	DIVISIONS,
	FLATS,
	firstMeasureOf,
	measuresOf,
	SHARPS,
	scoreOf,
	TREBLE,
} from './slice-harness';

describe('sliceMusicXML', () => {
	it('keeps only the requested measures, in document order', () => {
		const xml = sliceMusicXML(
			scoreOf(DIVISIONS + SHARPS + COMMON + TREBLE, '', '', '', ''),
			'1,3-4',
		);
		expect(measuresOf(xml).map((m) => m.number)).toEqual(['1', '3', '4']);
	});

	it('hoists the signatures in effect into the opening measure', () => {
		const xml = sliceMusicXML(
			scoreOf(DIVISIONS + SHARPS + COMMON + TREBLE, '', ''),
			'3',
		);
		const measure = firstMeasureOf(xml);
		expect(measure.getKey()?.fifths).toBe(3);
		expect(measure.getTime()?.beats).toBe('4');
		expect(measure.getClef()?.sign).toBe('G');
	});

	it('hoists the nearest signature, not the earliest', () => {
		const xml = sliceMusicXML(
			scoreOf(DIVISIONS + SHARPS + COMMON + TREBLE, FLATS, ''),
			'3',
		);
		expect(firstMeasureOf(xml).getKey()?.fifths).toBe(-2);
	});

	it('leaves the opening measure its own signatures', () => {
		const xml = sliceMusicXML(
			scoreOf(DIVISIONS + SHARPS + COMMON + TREBLE, '', FLATS),
			'3',
		);
		expect(firstMeasureOf(xml).getKey()?.fifths).toBe(-2);
		expect(countOf(xml, 'key')).toBe(1);
	});

	it('hoists a per-staff clef for each staff', () => {
		const grandStaff =
			`${DIVISIONS}<staves>2</staves>` +
			'<clef number="1"><sign>G</sign><line>2</line></clef>' +
			'<clef number="2"><sign>F</sign><line>4</line></clef>';
		const xml = sliceMusicXML(scoreOf(grandStaff, ''), '2');
		const measure = firstMeasureOf(xml);
		expect(measure.staveCount).toBe(2);
		expect(measure.getClef('1')?.sign).toBe('G');
		expect(measure.getClef('2')?.sign).toBe('F');
	});

	it('stops at a numberless key, which already covers every staff', () => {
		const xml = sliceMusicXML(
			scoreOf(
				`${DIVISIONS}<staves>2</staves><key number="2"><fifths>3</fifths></key>`,
				FLATS,
				'',
			),
			'3',
		);
		expect(firstMeasureOf(xml).getKey()?.fifths).toBe(-2);
		expect(countOf(xml, 'key')).toBe(1);
	});

	it('hoists into a measure that declares no attributes at all', () => {
		const xml = sliceMusicXML(
			scoreOf(DIVISIONS + SHARPS + COMMON + TREBLE, ''),
			'2',
		);
		const measure = firstMeasureOf(xml);
		expect(measure.getKey()?.fifths).toBe(3);
		expect(measure.getTime()?.beats).toBe('4');
		expect(measure.getClef()?.sign).toBe('G');
		expect(measure.notes).toHaveLength(1);
	});

	it('carries every signature in effect, each exactly once', () => {
		const xml = sliceMusicXML(
			scoreOf(DIVISIONS + SHARPS + COMMON + TREBLE, '', ''),
			'3',
		);
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

	it('does not let a mid-measure change suppress what the measure inherits', () => {
		const xml = sliceMusicXML(
			`<?xml version="1.0"?>
<score-partwise version="4.0">
	<part-list><score-part id="P1"><part-name>Music</part-name></score-part></part-list>
	<part id="P1">
		<measure number="1">
			<attributes>${DIVISIONS}${SHARPS}${COMMON}${TREBLE}</attributes>
			<note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
		</measure>
		<measure number="2">
			<note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
			<attributes>${FLATS}</attributes>
			<note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
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

	it('throws when a part has no matching measures', () => {
		expect(() => sliceMusicXML(scoreOf(DIVISIONS, ''), '9')).toThrow();
	});
});
