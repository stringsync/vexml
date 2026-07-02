import { describe, expect, it } from 'bun:test';
import type { NoteGlyph } from '../engraving/score-drawer';
import { Rect } from '../geometry';
import type { Layer, LayerHost, LayerKind } from '../host/stage';
import { ColorStyle, DefaultDecoration, HaloStyle } from './decorations';
import type { Decoratable } from './element';

// A recording 2D context: logs the operations DefaultDecoration performs so a test can assert
// what was painted (and in what order) without a real canvas. Cast to CanvasRenderingContext2D —
// only the members DefaultDecoration touches are implemented.

class RecordingContext {
	fillStyle: string | CanvasGradient | CanvasPattern = '#000000';
	font = '';
	textAlign = 'left';
	textBaseline = 'alphabetic';
	readonly canvas = { width: 800, height: 600 } as HTMLCanvasElement;
	// In call order: 'clear', 'fill:<shape>:<style>', or 'text:<text>:<style>:<font>'.
	readonly ops: string[] = [];
	private shape = '';
	save(): void {}
	restore(): void {}
	setTransform(): void {}
	clearRect(): void {
		this.ops.push('clear');
	}
	beginPath(): void {}
	ellipse(): void {
		this.shape = 'ellipse';
	}
	arc(): void {
		this.shape = 'arc';
	}
	fill(): void {
		this.ops.push(`fill:${this.shape}:${String(this.fillStyle)}`);
	}
	fillText(text: string): void {
		this.ops.push(`text:${text}:${String(this.fillStyle)}:${this.font}`);
	}
}

class FakeLayer implements Layer {
	disposed = false;
	constructor(readonly ctx: CanvasRenderingContext2D) {}
	dispose(): void {
		this.disposed = true;
	}
}

// ColorStyle and HaloStyle place their layers apart ('content' over the score, 'background'
// behind it), so the host keeps a recorder per kind and the tests assert against the relevant one.
class FakeLayerHost implements LayerHost {
	readonly recorders = new Map<LayerKind, RecordingContext>();
	readonly layers = new Map<LayerKind, FakeLayer>();
	createLayerCalls = 0;
	createLayer(kind: LayerKind): Layer {
		this.createLayerCalls++;
		const recorder = new RecordingContext();
		this.recorders.set(kind, recorder);
		const layer = new FakeLayer(
			recorder as unknown as CanvasRenderingContext2D,
		);
		this.layers.set(kind, layer);
		return layer;
	}
	ops(kind: LayerKind): string[] {
		return this.recorders.get(kind)?.ops ?? [];
	}
}

const HALO = 'fill:arc:rgba(41, 98, 255, 0.35)';
const GLYPH: NoteGlyph = { text: 'q', font: '30px Bravura', x: 12, y: 20 };

// A fake target standing in for a real Note/Measure: drawColor stamps the glyph (a notehead) in
// the color, or falls back to a filled ellipse over the box when there's none — mirroring the
// production elements, which own their own color stamping (see Decoratable.drawColor).
const decoratable = (
	rect: Rect,
	glyph: NoteGlyph | null = null,
): Decoratable => ({
	rect,
	getBoundingClientRect: () => ({}) as DOMRect,
	drawColor(ctx: CanvasRenderingContext2D, color: string): void {
		ctx.fillStyle = color;
		if (glyph) {
			ctx.font = glyph.font;
			ctx.fillText(glyph.text, glyph.x, glyph.y);
		} else {
			ctx.beginPath();
			ctx.ellipse(
				rect.x + rect.w / 2,
				rect.y + rect.h / 2,
				rect.w / 2,
				rect.h / 2,
				0,
				0,
				2 * Math.PI,
			);
			ctx.fill();
		}
	},
});

// The marks (fills/texts) recorded since the last clear — i.e., the result of the latest repaint.
function marksSinceLastClear(ops: string[]): string[] {
	return ops.slice(ops.lastIndexOf('clear') + 1).filter((o) => o !== 'clear');
}

describe('DefaultDecoration', () => {
	it('the overlay layer is created lazily, on the first decoration', () => {
		const host = new FakeLayerHost();
		const colors = new DefaultDecoration(host, new ColorStyle());
		expect(host.createLayerCalls).toBe(0);
		colors.set(decoratable(new Rect(0, 0, 12, 10), GLYPH), '#2962ff');
		expect(host.createLayerCalls).toBe(1);
	});

	it('a color stamps the notehead glyph in the color and reports has()', () => {
		const host = new FakeLayerHost();
		const colors = new DefaultDecoration(host, new ColorStyle());
		const target = decoratable(new Rect(10, 10, 12, 10), GLYPH);
		colors.set(target, '#2962ff');
		expect(colors.has(target)).toBe(true);
		// The exact glyph (text + font) vexflow drew, replayed in the chosen color.
		expect(marksSinceLastClear(host.ops('content'))).toEqual([
			'text:q:#2962ff:30px Bravura',
		]);
	});

	it('a glyph-less target (a rest) falls back to a filled ellipse', () => {
		const host = new FakeLayerHost();
		const colors = new DefaultDecoration(host, new ColorStyle());
		colors.set(decoratable(new Rect(0, 0, 12, 10), null), '#2962ff');
		expect(marksSinceLastClear(host.ops('content'))).toEqual([
			'fill:ellipse:#2962ff',
		]);
	});

	it('set(null) clears the decoration, drawing nothing', () => {
		const host = new FakeLayerHost();
		const colors = new DefaultDecoration(host, new ColorStyle());
		const target = decoratable(new Rect(0, 0, 12, 10), GLYPH);
		colors.set(target, '#ff0000');
		colors.set(target, null);
		expect(colors.has(target)).toBe(false);
		expect(host.ops('content').at(-1)).toBe('clear');
		expect(marksSinceLastClear(host.ops('content'))).toEqual([]);
	});

	it('the halo draws on a background layer in its color, behind the color layer', () => {
		const host = new FakeLayerHost();
		const colors = new DefaultDecoration(host, new ColorStyle());
		const halos = new DefaultDecoration(host, new HaloStyle());
		const target = decoratable(new Rect(0, 0, 12, 10), GLYPH);
		colors.set(target, '#2962ff');
		halos.set(target, 'rgba(41, 98, 255, 0.35)');
		// The color stamps the notehead on the content (over) layer; the halo fills its circle on the
		// background (behind) layer in the chosen color.
		expect(marksSinceLastClear(host.ops('content'))).toEqual([
			'text:q:#2962ff:30px Bravura',
		]);
		expect(marksSinceLastClear(host.ops('background'))).toEqual([HALO]);
	});

	it('a halo set(null) removes it', () => {
		const host = new FakeLayerHost();
		const halos = new DefaultDecoration(host, new HaloStyle());
		const target = decoratable(new Rect(0, 0, 12, 10), GLYPH);
		halos.set(target, 'rgba(41, 98, 255, 0.35)');
		expect(halos.has(target)).toBe(true);
		halos.set(target, null);
		expect(halos.has(target)).toBe(false);
		expect(marksSinceLastClear(host.ops('background'))).toEqual([]);
	});

	it('every repaint clears first, then redraws the whole active set', () => {
		const host = new FakeLayerHost();
		const colors = new DefaultDecoration(host, new ColorStyle());
		colors.set(decoratable(new Rect(0, 0, 12, 10), GLYPH), '#111111');
		colors.set(decoratable(new Rect(20, 0, 12, 10), GLYPH), '#222222');
		expect(marksSinceLastClear(host.ops('content'))).toEqual([
			'text:q:#111111:30px Bravura',
			'text:q:#222222:30px Bravura',
		]);
	});

	it('dispose disposes the layer and clears state', () => {
		const host = new FakeLayerHost();
		const colors = new DefaultDecoration(host, new ColorStyle());
		const halos = new DefaultDecoration(host, new HaloStyle());
		const target = decoratable(new Rect(0, 0, 12, 10), GLYPH);
		colors.set(target, '#2962ff');
		halos.set(target, 'rgba(41, 98, 255, 0.35)');
		const content = host.layers.get('content');
		const background = host.layers.get('background');
		colors.dispose();
		halos.dispose();
		expect(content?.disposed).toBe(true);
		expect(background?.disposed).toBe(true);
		expect(colors.has(target)).toBe(false);
		expect(halos.has(target)).toBe(false);
	});
});
