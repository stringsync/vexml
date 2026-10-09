import { describe, expect, it } from 'bun:test';
import { readdirSync } from 'node:fs';
import * as path from 'node:path';
import type { VexmlContext } from '@vexml/renderer';
import { testing } from './setup';

// readTimeline times a score without laying it out or drawing it, and must report exactly
// what the rendered Score does for the same document and gaps. Each fixture is checked twice
// in one tab: as rendered, and with a lead-in, a gap before its middle measure and a closing
// gap, inserted the way render inserts them.

const FIXTURES = readdirSync(path.resolve(import.meta.dir, '__data__')).filter(
	(file) => file.endsWith('.musicxml'),
);

describe('readTimeline', () => {
	// scry-ignore simple-test-setup: the point is every fixture, 184 and growing; one case each, written out, would drift from the corpus
	for (const file of FIXTURES) {
		it.concurrent(`times ${file} as the render does`, async () => {
			const xml = await testing.fixture(file);
			const { result } = await testing.eval(file, {}, compare, xml);
			expect(result.plain.timeline).toEqual(result.plain.score);
			expect(result.plain.mismatches).toEqual([]);
			expect(result.gapped.timeline).toEqual(result.gapped.score);
			expect(result.gapped.mismatches).toEqual([]);
			expect(result.gapped.score.gaps).toHaveLength(3);
		});
	}

	it.concurrent('splits a measure repeated back to back into two bars', async () => {
		const file = 'repeats_single_measure.musicxml';
		const xml = await testing.fixture(file);
		const { result } = await testing.eval(file, {}, compare, xml);
		// 90 bpm: a 4/4 bar is 2667 ms, and the middle measure plays twice.
		expect(
			result.plain.bars.map((bar) => [
				bar.measureIndex,
				Math.round(bar.startMs),
				Math.round(bar.endMs),
			]),
		).toEqual([
			[0, 0, 2667],
			[1, 2667, 5333],
			[1, 5333, 8000],
			[2, 8000, 10667],
		]);
	});

	it.concurrent('times an MDocument with insertGaps gaps, leaving it unedited', async () => {
		const xml = await testing.fixture('repeats.musicxml');
		const { result } = await testing.eval(
			'repeats.musicxml',
			{},
			async (context, xml) => {
				const { MDOMParser, readTimeline, insertGaps, render, container } =
					context;
				const document = new MDOMParser().parseFromString(xml);
				const count = () => document.score.parts[0]?.measures.length ?? 0;
				const before = count();
				const plain = await readTimeline(document);
				const unedited = count() === before;
				const bars = plain.getBars().length;
				const inserted = insertGaps(document, [
					{ beforeBarIndex: 0 },
					{ beforeBarIndex: bars },
				]);
				const gaps = inserted.map((measure, i) => ({
					measure,
					durationMs: 1000 + i * 500,
					label: `gap ${i}`,
				}));
				const timeline = await readTimeline(document, { gaps });
				context.score.dispose();
				const score = await render(document, container, {
					gaps,
					fonts: {
						notation: { family: 'Bravura' },
						text: { family: 'Source Sans 3' },
					},
				});
				return {
					unedited,
					timeline: {
						durationMs: timeline.getDurationMs(),
						gaps: timeline.getGaps(),
						bars: timeline.getBars().length,
					},
					score: {
						durationMs: score.getDurationMs(),
						gaps: score.getGaps(),
						bars: bars + 2,
					},
					added: Math.round(timeline.getDurationMs() - plain.getDurationMs()),
				};
			},
			xml,
		);
		expect(result.unedited).toBe(true);
		expect(result.timeline).toEqual(result.score);
		expect(result.added).toBe(2500);
	});

	it.concurrent('refuses gaps its input cannot hold', async () => {
		const xml = await testing.fixture('note.musicxml');
		const { result } = await testing.eval(
			'note.musicxml',
			{},
			async ({ MDOMParser, readTimeline }, xml) => {
				const document = new MDOMParser().parseFromString(xml);
				const messageOf = async (run: () => Promise<unknown>) => {
					try {
						await run();
						return '';
					} catch (error) {
						return error instanceof Error ? error.message : String(error);
					}
				};
				const measure = document.score.parts[0]?.measures[0];
				return {
					positioned: await messageOf(() =>
						readTimeline(document, {
							gaps: [{ beforeMeasureIndex: 0, durationMs: 1000 }],
						}),
					),
					named: measure
						? await messageOf(() =>
								readTimeline(xml, { gaps: [{ measure, durationMs: 1000 }] }),
							)
						: 'no measure',
				};
			},
			xml,
		);
		expect(result).toEqual({
			positioned:
				'render: gaps for an MDocument must name measures in it (see insertGaps)',
			named: 'render: a gap naming a measure needs its MDocument as input',
		});
	});
});

// Runs in the page, so it's self-contained: eval serializes it, and nothing outside it exists there.
async function compare(context: VexmlContext, xml: string) {
	const { readTimeline, render, container, MDOMParser } = context;
	type Timeline = Awaited<ReturnType<typeof readTimeline>>;
	// The Score has steps, not bars. Each bar must hold exactly the steps of its pass: contiguous
	// bars from 0 to the duration, every step inside one bar of its own measure, and a bar's first
	// step starting exactly where the bar does. The Score only marks a boundary where a drawn
	// note starts or ends, so silence is excused: a bar opening on an undrawn rest (a tab stave's)
	// has its first step late, and a silent step can run on into measures with no drawn notes
	// (a multi-measure rest).
	const barMismatches = (timeline: Timeline, score: typeof context.score) => {
		const steps = score.getSequence().getSteps();
		const bars = timeline.getBars();
		const silentAt = (ms: number) =>
			(steps.findLast((step) => step.startMs <= ms)?.active.length ?? 0) === 0;
		const mismatches: string[] = [];
		let s = 0;
		for (const [i, bar] of bars.entries()) {
			const start = bars[i - 1]?.endMs ?? 0;
			if (bar.startMs !== start) {
				mismatches.push(`bar ${i} starts at ${bar.startMs}, not ${start}`);
			}
			const first = steps[s];
			if (
				first &&
				first.startMs < bar.endMs &&
				first.startMs !== bar.startMs &&
				!silentAt(bar.startMs)
			) {
				mismatches.push(`bar ${i}'s first step starts at ${first.startMs}`);
			}
			for (; s < steps.length; s++) {
				const step = steps[s];
				if (!step || step.startMs >= bar.endMs) {
					break;
				}
				if (step.measureIndex !== bar.measureIndex && step.active.length > 0) {
					mismatches.push(`step ${s} is in measure ${step.measureIndex}`);
				}
			}
		}
		if (s !== steps.length) {
			mismatches.push(`steps ${s}+ fall after the last bar`);
		}
		if ((bars.at(-1)?.endMs ?? 0) !== score.getDurationMs()) {
			mismatches.push('the bars end before the score does');
		}
		return mismatches;
	};
	const scoreTiming = (score: typeof context.score) => {
		const sequence = score.getSequence();
		const beats = sequence.getDurationBeats();
		return {
			durationMs: score.getDurationMs(),
			durationBeats: beats,
			ms: [0, 0.5, beats / 3, beats, beats + 1].map((b) =>
				sequence.beatsToMs(b),
			),
			gaps: score.getGaps(),
		};
	};
	const timelineTiming = (timeline: Timeline) => {
		const beats = timeline.getDurationBeats();
		return {
			durationMs: timeline.getDurationMs(),
			durationBeats: beats,
			ms: [0, 0.5, beats / 3, beats, beats + 1].map((b) =>
				timeline.beatsToMs(b),
			),
			gaps: timeline.getGaps(),
		};
	};
	const timed = async (score: typeof context.score, timeline: Timeline) => ({
		score: scoreTiming(score),
		timeline: timelineTiming(timeline),
		bars: timeline.getBars(),
		mismatches: barMismatches(timeline, score),
	});

	const plain = await timed(context.score, await readTimeline(xml));

	const measures =
		new MDOMParser().parseFromString(xml).score.parts[0]?.measures.length ?? 0;
	const gaps = [
		{ beforeMeasureIndex: 0, durationMs: 1500, label: 'Lead-in' },
		{ beforeMeasureIndex: Math.floor(measures / 2), durationMs: 750 },
		{ beforeMeasureIndex: measures, durationMs: 2000, label: 'End' },
	];
	context.score.dispose();
	const score = await render(xml, container, {
		gaps,
		fonts: {
			notation: { family: 'Bravura' },
			text: { family: 'Source Sans 3' },
		},
	});
	const gapped = await timed(score, await readTimeline(xml, { gaps }));
	score.dispose();
	return { plain, gapped };
}
