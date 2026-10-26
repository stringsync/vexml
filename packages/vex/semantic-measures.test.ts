import { expect, it } from 'bun:test';
import { MDOMParser } from '@stringsync/mdom';
import { SemanticMeasures } from './semantic-measures';

it('slices repeated labels by position and carries signatures into later slices', () => {
	const xml =
		'<score-partwise><part-list><score-part id="P1"><part-name>Voice</part-name></score-part></part-list><part id="P1"><measure number="A"><attributes><divisions>1</divisions><clef><sign>G</sign><line>2</line></clef></attributes><note><rest/><duration>1</duration><type>quarter</type></note></measure><measure number="A"><note><rest/><duration>2</duration><type>half</type></note></measure></part></score-partwise>';
	const slices = new SemanticMeasures(xml).all();
	expect(slices.map((s) => [s.index, s.number])).toEqual([
		[0, 'A'],
		[1, 'A'],
	]);
	const doc = new MDOMParser().parseFromString(slices[1]?.xml ?? '');
	expect(doc.score.parts[0]?.measures).toHaveLength(1);
	expect(doc.score.parts[0]?.measures[0]?.notes[0]?.child('type')?.text).toBe(
		'half',
	);
	expect(doc.score.parts[0]?.measures[0]?.getClef()?.child('sign')?.text).toBe(
		'G',
	);
});
