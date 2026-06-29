import { expect, test } from 'bun:test';
import { Decorations } from './decorations';
import { Rect } from './geometry';
import type { Layer, LayerHost, LayerKind } from './stage';
import type { Decoratable, NoteGlyph } from './targets';

// A recording 2D context: logs the operations Decorations performs so a test can assert what was
// painted (and in what order) without a real canvas. Cast to CanvasRenderingContext2D — only the
// members Decorations touches are implemented.

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

class FakeLayerHost implements LayerHost {
	readonly recorder = new RecordingContext();
	createLayerCalls = 0;
	layer: FakeLayer | null = null;
	createLayer(_kind: LayerKind): Layer {
		this.createLayerCalls++;
		this.layer = new FakeLayer(
			this.recorder as unknown as CanvasRenderingContext2D,
		);
		return this.layer;
	}
}

const HALO = 'fill:arc:rgba(41, 98, 255, 0.35)';
const GLYPH: NoteGlyph = { text: 'q', font: '30px Bravura', x: 12, y: 20 };

const decoratable = (
	rect: Rect,
	glyph: NoteGlyph | null = null,
): Decoratable => ({
	rect,
	glyph,
	getBoundingClientRect: () => ({}) as DOMRect,
});

// The marks (fills/texts) recorded since the last clear — i.e., the result of the latest repaint.
function marksSinceLastClear(ops: string[]): string[] {
	return ops.slice(ops.lastIndexOf('clear') + 1).filter((o) => o !== 'clear');
}

test('the overlay layer is created lazily, on the first decoration', () => {
	const host = new FakeLayerHost();
	const decorations = new Decorations(host);
	expect(host.createLayerCalls).toBe(0);
	decorations.setColor(decoratable(new Rect(0, 0, 12, 10), GLYPH), '#2962ff');
	expect(host.createLayerCalls).toBe(1);
});

test('setColor stamps the notehead glyph in the color and reports isColored', () => {
	const host = new FakeLayerHost();
	const decorations = new Decorations(host);
	const target = decoratable(new Rect(10, 10, 12, 10), GLYPH);
	decorations.setColor(target, '#2962ff');
	expect(decorations.isColored(target)).toBe(true);
	// The exact glyph (text + font) vexflow drew, replayed in the chosen color.
	expect(marksSinceLastClear(host.recorder.ops)).toEqual([
		'text:q:#2962ff:30px Bravura',
	]);
});

test('a glyph-less target (a rest) falls back to a filled ellipse', () => {
	const host = new FakeLayerHost();
	const decorations = new Decorations(host);
	decorations.setColor(decoratable(new Rect(0, 0, 12, 10), null), '#2962ff');
	expect(marksSinceLastClear(host.recorder.ops)).toEqual([
		'fill:ellipse:#2962ff',
	]);
});

test('setColor(null) clears the decoration, drawing nothing', () => {
	const host = new FakeLayerHost();
	const decorations = new Decorations(host);
	const target = decoratable(new Rect(0, 0, 12, 10), GLYPH);
	decorations.setColor(target, '#ff0000');
	decorations.setColor(target, null);
	expect(decorations.isColored(target)).toBe(false);
	expect(host.recorder.ops.at(-1)).toBe('clear');
	expect(marksSinceLastClear(host.recorder.ops)).toEqual([]);
});

test('halo draws under color', () => {
	const host = new FakeLayerHost();
	const decorations = new Decorations(host);
	const target = decoratable(new Rect(0, 0, 12, 10), GLYPH);
	decorations.setColor(target, '#2962ff');
	decorations.setHalo(target, true);
	expect(marksSinceLastClear(host.recorder.ops)).toEqual([
		HALO,
		'text:q:#2962ff:30px Bravura',
	]);
});

test('setHalo(false) removes the halo', () => {
	const host = new FakeLayerHost();
	const decorations = new Decorations(host);
	const target = decoratable(new Rect(0, 0, 12, 10), GLYPH);
	decorations.setHalo(target, true);
	expect(decorations.isHaloed(target)).toBe(true);
	decorations.setHalo(target, false);
	expect(decorations.isHaloed(target)).toBe(false);
	expect(marksSinceLastClear(host.recorder.ops)).toEqual([]);
});

test('every repaint clears first, then redraws the whole active set', () => {
	const host = new FakeLayerHost();
	const decorations = new Decorations(host);
	decorations.setColor(decoratable(new Rect(0, 0, 12, 10), GLYPH), '#111111');
	decorations.setColor(decoratable(new Rect(20, 0, 12, 10), GLYPH), '#222222');
	expect(marksSinceLastClear(host.recorder.ops)).toEqual([
		'text:q:#111111:30px Bravura',
		'text:q:#222222:30px Bravura',
	]);
});

test('dispose disposes the layer and clears state', () => {
	const host = new FakeLayerHost();
	const decorations = new Decorations(host);
	const target = decoratable(new Rect(0, 0, 12, 10), GLYPH);
	decorations.setColor(target, '#2962ff');
	const layer = host.layer;
	decorations.dispose();
	expect(layer?.disposed).toBe(true);
	expect(decorations.isColored(target)).toBe(false);
});
