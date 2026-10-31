import { describe, expect, it } from 'bun:test';
import type { VexmlContext } from '@vexml/renderer';
import { testing } from './setup';

// How many progressive renders the first screen's time is the best of.
const FIRST_SCREEN_RUNS = 3;

describe('progressive', () => {
	// The whole-render baseline, reached by drawing the first screen before render() resolved
	// and the rest in idle slices: pixel-identical once complete.
	it.concurrent('renders score_schubert_gute_nacht.png once complete', async () => {
		const { image, result } = await testing.eval(
			'score_schubert_gute_nacht.musicxml',
			{ progressive: true },
			async ({ score }: VexmlContext) => {
				const before = score.isComplete();
				const drawn: number[] = [];
				score.events.on('draw', (e) => drawn.push(...e.systems));
				await score.whenComplete();
				return { before, after: score.isComplete(), drawn };
			},
		);

		expect(result.before).toBe(false);
		expect(result.after).toBe(true);
		expect(result.drawn).toEqual([...result.drawn].sort((a, b) => a - b));
		expect(image).toMatchScreenshot('score_schubert_gute_nacht.png');
	}, 30_000);

	// render() resolves with the first screen's systems alone, well before the whole score is
	// drawn: the time from a parsed document to the first screen against the time a whole
	// render takes, in one tab slowed 4x (DevTools' "4x slowdown"), as a slow device would see
	// it. The longest task the slices ran after is reported with the times (see the log).
	// Not concurrent: a render racing in another tab would skew the times.
	//
	// The first screen is the best of three: a burst of load on the host (another test's
	// browser, a build) stretches a 400 ms window far more than it does the 2 s whole render
	// that averages over it, and a burst only adds, so the quickest run is the code's cost.
	it('resolves with the first screen before a whole render would', async () => {
		const { result } = await testing.eval(
			'score_schubert_gute_nacht.musicxml',
			{},
			timeRenders,
			{
				arg: {
					musicXML: await testing.fixture('score_schubert_gute_nacht.musicxml'),
					runs: FIRST_SCREEN_RUNS,
				},
				cpuThrottle: 4,
			},
		);
		console.log(
			`progressive at 4x CPU, after parse: whole render ${result.wholeMs} ms, first screen ${result.firstScreenMs} ms, best of ${result.firstScreenRuns.join('/')} (${result.systemsAtResolve} of ${result.systems} systems), longest later task ${result.longestLaterTaskMs} ms`,
		);

		expect(result.systemsAtResolve).toBeGreaterThan(0);
		expect(result.systemsAtResolve).toBeLessThan(result.systems);
		expect(result.firstScreenMs).toBeLessThan(result.wholeMs);
		// The layout is planned a system ahead of the draw (see LazyLayoutPlan), so the first
		// screen costs its own systems, not the whole score's plan. Relative to the whole render,
		// since a slower machine stretches both.
		expect(result.firstScreenMs).toBeLessThan(result.wholeMs / 4);
	}, 60_000);
});

/* Render the parsed fixture whole, then progressively, timing each render(), how many systems
 * the progressive one had drawn when it resolved, and the longest task its slices ran after.
 * The first screen is timed `runs` times, each but the last disposed as soon as it resolves,
 * and the best stands for it. Runs in the browser from its source, so it holds its own
 * constants. */
async function timeRenders(
	{ container, render, MDOMParser }: VexmlContext,
	arg: { musicXML: string; runs: number },
) {
	const fonts = {
		notation: { family: 'Bravura' },
		text: { family: 'Source Sans 3' },
	};
	const parse = () => new MDOMParser().parseFromString(arg.musicXML);
	const wholeDoc = parse();
	const wholeStart = performance.now();
	const whole = await render(wholeDoc, container, { fonts });
	const wholeMs = performance.now() - wholeStart;
	const systems = whole.getSystems().length;
	whole.dispose();

	const firstScreenRuns: number[] = [];
	for (let run = 1; run < arg.runs; run++) {
		const earlyDoc = parse();
		const start = performance.now();
		const early = await render(earlyDoc, container, {
			fonts,
			progressive: true,
		});
		firstScreenRuns.push(Math.round(performance.now() - start));
		early.dispose();
	}

	const tasks: Array<{ start: number; duration: number }> = [];
	const observer = new PerformanceObserver((list) => {
		for (const entry of list.getEntries()) {
			tasks.push({ start: entry.startTime, duration: entry.duration });
		}
	});
	observer.observe({ entryTypes: ['longtask'] });
	const doc = parse();
	const firstStart = performance.now();
	const score = await render(doc, container, { fonts, progressive: true });
	const resolved = performance.now();
	firstScreenRuns.push(Math.round(resolved - firstStart));
	const drawnLater: number[] = [];
	score.events.on('draw', (e) => drawnLater.push(...e.systems));
	await score.whenComplete();
	// The observer reports a task once it ends; let the last slice's land.
	await new Promise((resolve) => setTimeout(resolve, 200));
	observer.disconnect();
	score.dispose();
	const later = tasks.filter((t) => t.start >= resolved);
	return {
		wholeMs: Math.round(wholeMs),
		firstScreenMs: Math.min(...firstScreenRuns),
		firstScreenRuns,
		systems,
		systemsAtResolve: systems - drawnLater.length,
		longestLaterTaskMs: Math.round(
			Math.max(0, ...later.map((t) => t.duration)),
		),
	};
}
