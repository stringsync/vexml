import { describe, expect, it } from 'bun:test';
import { measureRepeats } from './repeats';
import { DefaultScoreParser } from './score-parser';

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

async function repeatsOf(xml: string) {
	const mdoc = await new DefaultScoreParser().parse(xml);
	return measureRepeats(mdoc.score.parts[0]?.measures ?? []);
}

const FORWARD =
	'<barline location="left"><repeat direction="forward"/></barline>';
const BACKWARD =
	'<barline location="right"><repeat direction="backward"/></barline>';
const start = (n: string) =>
	`<barline location="left"><ending number="${n}" type="start"/></barline>`;
const stop = (n: string, type = 'stop') =>
	`<barline location="right"><ending number="${n}" type="${type}"/></barline>`;

describe('measureRepeats', () => {
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
			scoreOf(start('1') + stop('1') + BACKWARD, ''),
		);
		expect(result[0]?.ending).toEqual({
			number: '1',
			first: true,
			last: true,
			open: false,
		});
		expect(result[1]?.ending).toBeNull();
	});

	it('spans a multi-measure ending marked only at its edges', async () => {
		// The standard encoding: `start` on the run's first measure, `stop` on its last.
		const result = await repeatsOf(
			scoreOf(start('1'), '', stop('1') + BACKWARD, ''),
		);
		expect(result.map((r) => r.ending)).toEqual([
			{ number: '1', first: true, last: false, open: false },
			{ number: '1', first: false, last: false, open: false },
			{ number: '1', first: false, last: true, open: false },
			null,
		]);
	});

	it('spans a multi-measure ending whose bounds are restated every measure', async () => {
		// Some exporters repeat `start`/`stop` on every measure of the run; a `stop` the next
		// measure reopens with the same number is that restatement, not a second ending.
		const result = await repeatsOf(
			scoreOf(start('1') + stop('1'), start('1') + stop('1') + BACKWARD, ''),
		);
		expect(result.map((r) => r.ending)).toEqual([
			{ number: '1', first: true, last: false, open: false },
			{ number: '1', first: false, last: true, open: false },
			null,
		]);
	});

	it('leaves an ending with no backward repeat open on the right', async () => {
		// A final ending has nothing jumping back from it, so its bracket runs on into the
		// music with no down hook — even though exporters still write `type="stop"` on it.
		const result = await repeatsOf(
			scoreOf(start('1') + stop('1') + BACKWARD, start('2') + stop('2'), ''),
		);
		expect(result.map((r) => r.ending?.open)).toEqual([false, true, undefined]);
	});

	it('closes an ending that runs to the end of the score', async () => {
		// Nothing follows it, so there is no music for the bracket to run on into.
		const result = await repeatsOf(
			scoreOf(start('1') + stop('1') + BACKWARD, start('2') + stop('2')),
		);
		expect(result.map((r) => r.ending?.open)).toEqual([false, false]);
	});

	it('starts a new ending when the next run has a different number', async () => {
		const result = await repeatsOf(
			scoreOf(start('1') + stop('1'), start('2') + stop('2')),
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
		});
	});
});
