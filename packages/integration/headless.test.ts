import { describe, expect, it } from 'bun:test';
import * as path from 'node:path';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import type { ConfigInput, ScoreSnapshot } from '@stringsync/vexml';
import { createSnapshot } from '@stringsync/vexml/headless';
import type { VexmlContext } from '@vexml/renderer';
import { testing } from './setup';

// createSnapshot engraves with no DOM, measuring text on @napi-rs/canvas with the same font
// files the browser draws in. Its text metrics differ a little from the browser's (Linux
// Chromium hints them to whole px), so its snapshot renders a near copy of the page's own
// render: the same notes, measures and timeline, each box within a few px, under a baseline of
// its own.

const FONT_DIR = path.resolve(import.meta.dir, '../vex/fonts');
const FONTS = ['Light', 'Regular', 'SemiBold'].map((weight) => ({
	family: 'Source Sans 3',
	source: path.join(FONT_DIR, `SourceSans3-${weight}.ttf`),
}));

describe('createSnapshot', () => {
	it.concurrent('engraves score_amazing_grace with no DOM', async () => {
		const { image, result } = await headless('score_amazing_grace.musicxml');
		expectNearCopy(result);
		expect(image).toMatchScreenshot('headless_amazing_grace.png');
	});

	it.concurrent('engraves score_schubert_gute_nacht with no DOM', async () => {
		const { image, result } = await headless(
			'score_schubert_gute_nacht.musicxml',
		);
		expectNearCopy(result);
		expect(image).toMatchScreenshot('headless_schubert_gute_nacht.png');
	});

	it.concurrent('colors notes from their outlines', async () => {
		const snapshot = await createSnapshot(
			await testing.fixture('score_amazing_grace.musicxml'),
			createCanvas(1, 1),
			{ fonts: FONTS, fontRegistry: GlobalFonts },
		);
		const { image, result } = await testing.eval(
			'score_amazing_grace.musicxml',
			{},
			colorHeadless,
			snapshot,
		);
		expect(result).toBeGreaterThan(0);
		expect(image).toMatchScreenshot('headless_colored_amazing_grace.png');
	});
});

// The same elements and timeline, every box within DRIFT px of the full render's. Metrics a
// little off shift a long score a few px by its last systems.
const DRIFT = 12;
function expectNearCopy({ full, replayed }: Replayed) {
	expect(replayed.pitches).toEqual(full.pitches);
	expect(replayed.durationMs).toBe(full.durationMs);
	expect(replayed.steps).toBe(full.steps);
	expect(replayed.rects).toHaveLength(full.rects.length);
	const drift = replayed.rects.map((rect, i) =>
		Math.max(...rect.map((n, k) => Math.abs(n - (full.rects[i]?.[k] ?? n)))),
	);
	expect(Math.max(0, ...drift)).toBeLessThanOrEqual(DRIFT);
}

type Summary = {
	pitches: (string | null)[];
	rects: number[][];
	durationMs: number;
	steps: number;
};
type Replayed = { full: Summary; replayed: Summary };

async function headless(file: string, config: ConfigInput = {}) {
	const snapshot = await createSnapshot(
		await testing.fixture(file),
		createCanvas(1, 1),
		{ config, fonts: FONTS, fontRegistry: GlobalFonts },
	);
	return testing.eval(file, config, replayHeadless, { snapshot, config });
}

// Runs in the page, so it's self-contained: eval serializes it, and nothing outside it exists there.
async function replayHeadless(
	{ score, container, render }: VexmlContext,
	{ snapshot, config }: { snapshot: ScoreSnapshot; config: ConfigInput },
): Promise<Replayed> {
	const box = (r: { x: number; y: number; w: number; h: number }) => [
		r.x,
		r.y,
		r.w,
		r.h,
	];
	const summarize = (s: typeof score) => ({
		pitches: s
			.getElements()
			.notes()
			.map((note) => note.getPitch()),
		rects: [
			...s
				.getElements()
				.notes()
				.map((note) => box(note.rect)),
			...s
				.getElements()
				.measureBoxes()
				.map((b) => box(b.rect)),
		],
		durationMs: s.getDurationMs(),
		steps: s.getSequence().length,
	});
	const full = summarize(score);
	score.dispose();
	const replayed = await render(snapshot, container, {
		...config,
		fonts: {
			notation: { family: 'Bravura' },
			text: { family: 'Source Sans 3' },
		},
	});
	return { full, replayed: summarize(replayed) };
}

// Runs in the page, so it's self-contained. Each notehead and fret restamps from its outline.
async function colorHeadless(
	{ score, container, render }: VexmlContext,
	snapshot: ScoreSnapshot,
): Promise<number> {
	score.dispose();
	const replayed = await render(snapshot, container, {
		fonts: {
			notation: { family: 'Bravura' },
			text: { family: 'Source Sans 3' },
		},
	});
	const targets = replayed
		.getElements()
		.notes()
		.map((note) => note.getTabPosition() ?? note);
	for (const target of targets) {
		target.color.on('#2962ff');
	}
	return targets.length;
}
