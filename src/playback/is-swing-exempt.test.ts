import { describe, expect, it } from 'bun:test';
import { nth, parseMeasures } from '../engraving/score-reader-harness';
import { isSwingExempt } from './sequence-factory';

describe('isSwingExempt', () => {
	const PITCH = '<pitch><step>C</step><octave>5</octave></pitch>';
	const exemptOf = async (inner: string) =>
		isSwingExempt(nth(nth(await parseMeasures(inner), 0).notes, 0));

	it('swings an ordinary eighth', async () => {
		expect(
			await exemptOf(
				`<note>${PITCH}<duration>1</duration><type>eighth</type></note>`,
			),
		).toBe(false);
	});

	it('exempts a note under a <time-modification>', async () => {
		// A written-out triplet already carries the swing feel. Swinging it again would put it
		// on neither an even third of the beat nor a swung pair — this is the case that shows
		// up in real arrangements, where a swung vocal line sits over a triplet accompaniment.
		expect(
			await exemptOf(
				`<note>${PITCH}<duration>1</duration><type>eighth</type>` +
					'<time-modification><actual-notes>3</actual-notes>' +
					'<normal-notes>2</normal-notes></time-modification></note>',
			),
		).toBe(true);
	});

	it('exempts a grace note, which has no written duration to stretch', async () => {
		expect(
			await exemptOf(`<note><grace/>${PITCH}<type>eighth</type></note>`),
		).toBe(true);
	});

	it('exempts a note with no <type>, whose nominal duration is unknown', async () => {
		expect(await exemptOf(`<note>${PITCH}<duration>1</duration></note>`)).toBe(
			true,
		);
	});
});
