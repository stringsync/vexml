import { expect, test } from 'bun:test';
import type { CursorChangeEvent } from './cursor';
import { BarCursorView } from './cursor-view';
import { Rect } from './geometry';
import type { Layer } from './stage';

// A recording 2D context: captures fillRect calls and whether the bitmap was cleared.
class RecordingCtx {
	fills: Array<{ x: number; y: number; w: number; h: number; style: string }> =
		[];
	cleared = false;
	fillStyle = '';
	readonly canvas = { width: 1000, height: 100 };
	save(): void {}
	restore(): void {}
	setTransform(): void {}
	clearRect(): void {
		this.cleared = true;
	}
	fillRect(x: number, y: number, w: number, h: number): void {
		this.fills.push({ x, y, w, h, style: this.fillStyle });
	}
}

class FakeLayer implements Layer {
	readonly recording = new RecordingCtx();
	readonly ctx = this.recording as unknown as CanvasRenderingContext2D;
	disposed = false;
	dispose(): void {
		this.disposed = true;
	}
}

function changeAt(rect: Rect): CursorChangeEvent {
	return {
		timeMs: 0,
		timeBeats: 0,
		index: 0,
		position: { rect, getBoundingClientRect: () => ({}) as DOMRect },
		active: [],
		started: [],
		sustained: [],
		stopped: [],
		done: false,
	};
}

test('draws a vertical bar straddling the onset x, spanning the system, after clearing', () => {
	const layer = new FakeLayer();
	const view = new BarCursorView(layer); // default width 2
	view.render(changeAt(new Rect(10, 0, 1, 100)));
	expect(layer.recording.cleared).toBe(true);
	expect(layer.recording.fills).toEqual([
		{ x: 9, y: 0, w: 2, h: 100, style: '#2563eb' },
	]);
});

test('honors color and width options', () => {
	const layer = new FakeLayer();
	const view = new BarCursorView(layer, { color: 'red', widthPx: 4 });
	view.render(changeAt(new Rect(10, 5, 1, 80)));
	expect(layer.recording.fills).toEqual([
		{ x: 8, y: 5, w: 4, h: 80, style: 'red' },
	]);
});

test('repaints (clears) on each render and disposes its layer', () => {
	const layer = new FakeLayer();
	const view = new BarCursorView(layer);
	view.render(changeAt(new Rect(10, 0, 1, 100)));
	view.render(changeAt(new Rect(20, 0, 1, 100)));
	// Only the latest bar remains (cleared between).
	expect(layer.recording.fills).toHaveLength(2);
	expect(layer.recording.fills.at(-1)?.x).toBe(19);
	view.dispose();
	expect(layer.disposed).toBe(true);
});
