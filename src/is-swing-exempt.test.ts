import { describe, expect, it } from 'bun:test';
import { DefaultScoreParser } from './score-parser/default-score-parser';
import { isSwingExempt } from './sequence-factory';

describe('isSwingExempt', () => {
	const PITCH = '<pitch><step>C</step><octave>5</octave></pitch>';

	// A one-part, one-measure score holding just the note under test.
	const exemptOf = async (inner: string) => {
		const mdoc = await new DefaultScoreParser().parse(`<?xml version="1.0"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>M</part-name></score-part></part-list>
  <part id="P1"><measure number="1">
    <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
    ${inner}
  </measure></part>
</score-partwise>`);
		const note = mdoc.score.parts[0]?.measures[0]?.notes[0];
		if (!note) {
			throw new Error('fixture: no note parsed');
		}
		return isSwingExempt(note);
	};

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
