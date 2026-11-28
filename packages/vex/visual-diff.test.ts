import { describe, expect, it } from 'bun:test';
import { PNG } from 'pngjs';
import {
	classifyImage,
	evaluateSignificance,
	type ImageChange,
	measurePngDiff,
	renderDiffPanel,
} from './visual-diff';

function makePng(
	width: number,
	height: number,
	inkRects: Array<{ x: number; y: number; w: number; h: number }> = [],
): Buffer {
	const png = new PNG({ width, height });
	png.data.fill(255);
	for (const rect of inkRects) {
		for (let y = rect.y; y < Math.min(height, rect.y + rect.h); y++) {
			for (let x = rect.x; x < Math.min(width, rect.x + rect.w); x++) {
				const o = (y * width + x) * 4;
				png.data[o] = 0;
				png.data[o + 1] = 0;
				png.data[o + 2] = 0;
				png.data[o + 3] = 255;
			}
		}
	}
	return PNG.sync.write(png);
}

describe('classifyImage', () => {
	it('classifies watched screenshot and readme paths and ignores others', () => {
		expect(
			classifyImage(
				'vexml/packages/integration/__screenshots__/score_bach.png',
			),
		).toBe('score');
		expect(
			classifyImage(
				'vexml/packages/integration/__screenshots__/headless_schubert.png',
			),
		).toBe('score');
		expect(
			classifyImage(
				'vexml/packages/integration/__screenshots__/pages_stacked.png',
			),
		).toBe('score');
		expect(
			classifyImage(
				'vexml/packages/integration/__screenshots__/engraving_ties.png',
			),
		).toBe('engraving');
		expect(
			classifyImage(
				'vexml/packages/integration/__screenshots__/direction_lines.png',
			),
		).toBe('feature');
		expect(classifyImage('vexml/.github/readme/example.png')).toBe('readme');
		expect(classifyImage('vexml/.github/readme/playback.gif')).toBe('readme');
		expect(
			classifyImage('vexml/packages/integration/__lint__/defects/a.png'),
		).toBeNull();
		expect(
			classifyImage('vexml/packages/integration/__screenshots__/notes.txt'),
		).toBeNull();
	});
});

describe('measurePngDiff', () => {
	it('ignores 1px ink jitter while catching real displaced ink', () => {
		const before = makePng(120, 80, [{ x: 20, y: 20, w: 20, h: 10 }]);
		const jitter = makePng(120, 80, [{ x: 21, y: 21, w: 20, h: 10 }]);
		const moved = makePng(120, 80, [{ x: 60, y: 20, w: 20, h: 10 }]);

		const jitterMetrics = measurePngDiff(before, jitter);
		expect(jitterMetrics.movedInkPixels).toBe(0);
		expect(jitterMetrics.movedInkPercent).toBe(0);

		const movedMetrics = measurePngDiff(before, moved);
		expect(movedMetrics.movedInkPixels).toBe(400);
		expect(movedMetrics.movedInkPercent).toBe(100);
		expect(movedMetrics.heightDelta).toBe(0);
	});

	it('records height delta when canvas height changes', () => {
		const before = makePng(100, 80, [{ x: 10, y: 10, w: 10, h: 10 }]);
		const after = makePng(100, 110, [{ x: 10, y: 10, w: 10, h: 10 }]);
		const metrics = measurePngDiff(before, after);
		expect(metrics.heightDelta).toBe(30);
		expect(metrics.beforeHeight).toBe(80);
		expect(metrics.afterHeight).toBe(110);
	});
});

describe('evaluateSignificance', () => {
	const makeChange = (
		name: string,
		kind: ImageChange['kind'],
		movedInkPixels: number,
		movedInkPercent: number,
		heightDelta = 0,
	): ImageChange => ({
		path:
			kind === 'readme'
				? `vexml/.github/readme/${name}`
				: `vexml/packages/integration/__screenshots__/${name}`,
		name,
		kind,
		metrics: {
			beforeWidth: 400,
			beforeHeight: 200,
			afterWidth: 400,
			afterHeight: 200 + heightDelta,
			widthDelta: 0,
			heightDelta,
			inkPixels: 10_000,
			movedInkPixels,
			movedInkPercent,
		},
	});

	it('skips narrow single-sheet engraving tweaks below thresholds', () => {
		const res = evaluateSignificance([
			makeChange('engraving_articulation.png', 'engraving', 42, 0.1),
		]);
		expect(res.significant).toBe(false);
		expect(res.reasons).toEqual([]);
	});

	it('triggers on broad sweeps (5+ images), README updates, reflows, >=2% ink, or notable non-engraving changes', () => {
		const broad = evaluateSignificance([
			makeChange('engraving_a.png', 'engraving', 10, 0.05),
			makeChange('engraving_b.png', 'engraving', 10, 0.05),
			makeChange('engraving_c.png', 'engraving', 10, 0.05),
			makeChange('engraving_d.png', 'engraving', 10, 0.05),
			makeChange('engraving_e.png', 'engraving', 10, 0.05),
		]);
		expect(broad.significant).toBe(true);
		expect(broad.reasons[0]).toContain('5 existing images changed');

		const readme = evaluateSignificance([
			{
				path: 'vexml/.github/readme/demo.gif',
				name: 'demo.gif',
				kind: 'readme',
				metrics: null,
			},
		]);
		expect(readme.significant).toBe(true);
		expect(readme.reasons[0]).toContain('README image changed');

		const reflow = evaluateSignificance([
			makeChange('engraving_ties.png', 'engraving', 50, 0.3, 18),
		]);
		expect(reflow.significant).toBe(true);
		expect(reflow.reasons[0]).toContain('layout height shifted by 18px');

		const bigInk = evaluateSignificance([
			makeChange('engraving_keys.png', 'engraving', 500, 2.4),
		]);
		expect(bigInk.significant).toBe(true);
		expect(bigInk.reasons[0]).toContain('2.4% of ink moved');

		const feature = evaluateSignificance([
			makeChange('direction_lines.png', 'feature', 140, 0.5),
		]);
		expect(feature.significant).toBe(true);
		expect(feature.reasons[0]).toContain('feature baseline changed');

		const tinyFeature = evaluateSignificance([
			makeChange('direction_lines.png', 'feature', 24, 0.05),
		]);
		expect(tinyFeature.significant).toBe(false);
	});
});

describe('renderDiffPanel', () => {
	it('renders a valid stacked PNG with red removed and blue added diff pixels', () => {
		const before = makePng(200, 120, [{ x: 30, y: 40, w: 20, h: 10 }]);
		const after = makePng(200, 120, [{ x: 90, y: 40, w: 20, h: 10 }]);
		const out = renderDiffPanel(before, after, 'direction_lines.png - 1% INK');
		const decoded = PNG.sync.read(out);
		expect(decoded.width).toBeGreaterThanOrEqual(460);
		expect(decoded.height).toBeGreaterThan(200);

		let hasRed = false;
		let hasBlue = false;
		for (let i = 0; i < decoded.width * decoded.height; i++) {
			const o = i * 4;
			const r = decoded.data[o];
			const g = decoded.data[o + 1];
			const b = decoded.data[o + 2];
			if (r === 220 && g === 38 && b === 38) {
				hasRed = true;
			}
			if (r === 37 && g === 99 && b === 235) {
				hasBlue = true;
			}
		}
		expect(hasRed).toBe(true);
		expect(hasBlue).toBe(true);
	});

	it('crops tall scores around the densest changed window instead of full height', () => {
		const before = makePng(500, 2000, [{ x: 40, y: 1400, w: 30, h: 20 }]);
		const after = makePng(500, 2000, [{ x: 120, y: 1400, w: 30, h: 20 }]);
		const out = renderDiffPanel(before, after, 'score_tall.png');
		const decoded = PNG.sync.read(out);
		expect(decoded.height).toBeLessThan(900);
	});
});
