import { describe, expect, it } from 'bun:test';
import * as path from 'node:path';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import type { ConfigInput, ScoreSnapshot } from '@stringsync/vexml';
import { createSnapshot } from '@stringsync/vexml/headless';
import type { VexmlContext } from '@vexml/renderer';
import { testing } from './setup';

// paint draws a snapshot with no Score behind it, as render would show it, and a render of the
// same snapshot into the same container takes its tiles over. Each case renders the fixture in
// full, snapshots it through JSON, disposes the score, then paints into the same container.

// The fonts Testing defaults to, stated here because the paint is handed its config directly.
const CONFIG: ConfigInput = {
	fonts: {
		notation: { family: 'Bravura' },
		text: { family: 'Source Sans 3' },
	},
};

const FONT_DIR = path.resolve(import.meta.dir, '../vex/fonts');
const FONTS = ['Light', 'Regular', 'SemiBold'].map((weight) => ({
	family: 'Source Sans 3',
	source: path.join(FONT_DIR, `SourceSans3-${weight}.ttf`),
}));

describe('paint', () => {
	it.concurrent('paints a snapshot as render shows it', async () => {
		const { image, result } = await testing.eval(
			'score_amazing_grace.musicxml',
			{},
			paintOnly,
			{ config: CONFIG, snapshot: null },
		);
		expect(result.tiles).toBeGreaterThan(0);
		expect(image).toMatchScreenshot('score_amazing_grace.png');
	});

	it.concurrent('paints a headless snapshot as render shows it', async () => {
		const snapshot = await createSnapshot(
			await testing.fixture('score_amazing_grace.musicxml'),
			createCanvas(1, 1),
			{ fonts: FONTS, fontRegistry: GlobalFonts },
		);
		const { image } = await testing.eval(
			'score_amazing_grace.musicxml',
			{},
			paintOnly,
			{ config: CONFIG, snapshot },
		);
		expect(image).toMatchScreenshot('headless_amazing_grace.png');
	});

	it.concurrent('hands its tiles to a render of the same snapshot', async () => {
		const { result } = await testing.eval(
			'score_schubert_gute_nacht.musicxml',
			{},
			paintThenRender,
			{ config: CONFIG, renderConfig: CONFIG },
		);
		expect(result.painted).toBeGreaterThan(0);
		expect(result.keptWhileLoading).toBe(true);
		expect(result.adopted).toBe(result.painted);
		expect(result.unchanged).toBe(result.painted);
		expect(result.compared).toBeGreaterThan(0);
		expect(result.sameAsFresh).toBe(result.compared);
		expect(result.notes).toBeGreaterThan(0);
		expect(result.restored).toBe(true);
	});

	it.concurrent('leaves its tiles for a render in other colors', async () => {
		const { result } = await testing.eval(
			'score_amazing_grace.musicxml',
			{},
			paintThenRender,
			{
				config: CONFIG,
				renderConfig: {
					...CONFIG,
					fonts: {
						notation: { family: 'Bravura', color: '#1d4ed8' },
						text: { family: 'Source Sans 3', color: '#c2410c' },
					},
				},
			},
		);
		expect(result.painted).toBeGreaterThan(0);
		expect(result.keptWhileLoading).toBe(true);
		expect(result.adopted).toBe(0);
		expect(result.notes).toBeGreaterThan(0);
	});

	it.concurrent('refuses a snapshot of another version untouched', async () => {
		const { result } = await testing.eval(
			'score_amazing_grace.musicxml',
			{},
			paintMismatched,
			CONFIG,
		);
		expect(result).toEqual({ reason: 'version', untouched: true });
	});

	it.concurrent('puts the container back when disposed', async () => {
		const { result } = await testing.eval(
			'score_amazing_grace.musicxml',
			{},
			paintDisposed,
			{ ...CONFIG, maxHeight: 300, backgroundColor: '#fce4ec' },
		);
		expect(result).toEqual({ painted: true, restored: true, empty: true });
	});
});

// Each eval fn runs in the page, so it's self-contained: eval serializes it, and nothing outside
// it exists there.

async function paintOnly(
	{ score, container, paint }: VexmlContext,
	{ config, snapshot }: { config: ConfigInput; snapshot: ScoreSnapshot | null },
): Promise<{ tiles: number }> {
	const taken = snapshot ?? JSON.parse(JSON.stringify(score.snapshot()));
	score.dispose();
	paint(taken, container, config);
	return {
		tiles: container.querySelectorAll('canvas[data-vexml-tile]').length,
	};
}

async function paintThenRender(
	{ score, container, paint, render }: VexmlContext,
	{ config, renderConfig }: { config: ConfigInput; renderConfig: ConfigInput },
) {
	const pixels = (canvas: HTMLCanvasElement) => canvas.toDataURL();
	const tilesIn = (root: HTMLElement) =>
		Array.from(
			root.querySelectorAll<HTMLCanvasElement>('canvas[data-vexml-tile]'),
		).map((canvas) => ({
			canvas,
			index: canvas.getAttribute('data-vexml-tile'),
			pixels: pixels(canvas),
		}));
	const snapshot = JSON.parse(JSON.stringify(score.snapshot()));
	score.dispose();
	const style = container.getAttribute('style');
	paint(snapshot, container, config);
	const painted = tilesIn(container);
	const pending = render(snapshot, container, renderConfig);
	const keptWhileLoading = painted.every(({ canvas }) => canvas.isConnected);
	const rendered = await pending;
	const adopted = painted.filter(({ canvas }) => canvas.isConnected);
	const unchanged = adopted.filter(
		({ canvas, pixels: before }) => pixels(canvas) === before,
	);
	// The same snapshot rendered with no paint before it, for what its tiles should show.
	// Laid over the container, so it paints the tiles near the same view.
	const fresh = document.createElement('div');
	const box = container.getBoundingClientRect();
	fresh.style.cssText = `position:absolute;left:${box.left + scrollX}px;top:${box.top + scrollY}px;width:${box.width}px`;
	document.body.appendChild(fresh);
	const other = await render(snapshot, fresh, renderConfig);
	const freshTiles = new Map(tilesIn(fresh).map((t) => [t.index, t.pixels]));
	// Past the budget only the tiles near view are painted: compare those both hold.
	const compared = unchanged.filter(({ index }) => freshTiles.has(index));
	const sameAsFresh = compared.filter(
		({ index, pixels: shown }) => freshTiles.get(index) === shown,
	);
	other.dispose();
	fresh.remove();
	const notes = rendered.getElements().notes().length;
	// The score took the container over from the paint, so it puts back what was there before it.
	rendered.dispose();
	return {
		painted: painted.length,
		keptWhileLoading,
		adopted: adopted.length,
		unchanged: unchanged.length,
		compared: compared.length,
		sameAsFresh: sameAsFresh.length,
		notes,
		restored: container.getAttribute('style') === style,
	};
}

async function paintMismatched(
	{ score, container, paint, SnapshotMismatchError }: VexmlContext,
	config: ConfigInput,
) {
	const snapshot = score.snapshot();
	score.dispose();
	const before = container.outerHTML;
	try {
		paint({ ...snapshot, version: snapshot.version + 1 }, container, config);
		return { reason: null, untouched: container.outerHTML === before };
	} catch (error) {
		return {
			reason: error instanceof SnapshotMismatchError ? error.reason : null,
			untouched: container.outerHTML === before,
		};
	}
}

async function paintDisposed(
	{ score, container, paint }: VexmlContext,
	config: ConfigInput,
) {
	const snapshot = score.snapshot();
	score.dispose();
	const style = container.getAttribute('style') ?? '';
	const painted = paint(snapshot, container, config);
	const wasPainted =
		container.querySelectorAll('canvas[data-vexml-tile]').length > 0 &&
		(container.getAttribute('style') ?? '') !== style;
	painted.dispose();
	return {
		painted: wasPainted,
		restored: (container.getAttribute('style') ?? '') === style,
		empty: container.childElementCount === 0,
	};
}
