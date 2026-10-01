import { beforeEach, describe, expect, it } from 'bun:test';
import { Rect } from 'webappwiz/geometry';
import { FakePaintProbe } from './fake-paint-probe';
import { PaintContext } from './paint-context';
import { PaintList } from './paint-list';

describe('PaintContext', () => {
	let list: PaintList;
	let ctx: CanvasRenderingContext2D;

	beforeEach(() => {
		list = new PaintList();
		ctx = new PaintContext(
			list,
			new FakePaintProbe(),
			null,
		) as unknown as CanvasRenderingContext2D;
	});

	it('records a fill with its path, boxed with a pixel of antialiasing', () => {
		ctx.beginPath();
		ctx.moveTo(10, 10);
		ctx.lineTo(30, 20);
		ctx.fill();
		expect(list.ops).toHaveLength(1);
		expect(list.ops[0]?.path?.map((s) => s.kind)).toEqual(['moveTo', 'lineTo']);
		expect(list.ops[0]?.bounds).toEqual(new Rect(9, 9, 22, 12));
	});

	it('widens a stroke by half its line width', () => {
		ctx.lineWidth = 2;
		ctx.lineJoin = 'round';
		ctx.beginPath();
		ctx.moveTo(0, 0);
		ctx.lineTo(10, 0);
		ctx.stroke();
		expect(list.ops[0]?.bounds).toEqual(new Rect(-2, -2, 14, 4));
	});

	it('maps each path segment through the transform current when it was added', () => {
		ctx.translate(100, 0);
		ctx.beginPath();
		ctx.moveTo(0, 0);
		ctx.resetTransform();
		ctx.lineTo(0, 0);
		ctx.fill();
		expect(list.ops[0]?.bounds).toEqual(new Rect(-1, -1, 102, 2));
	});

	it('restores the style a save captured', () => {
		ctx.fillStyle = 'red';
		ctx.save();
		ctx.fillStyle = 'blue';
		ctx.restore();
		ctx.fillRect(0, 0, 1, 1);
		expect(list.ops[0]?.state.props.fillStyle).toBe('red');
	});

	it('narrows a box to a rectangular clip and drops a draw wholly outside it', () => {
		ctx.beginPath();
		ctx.rect(0, 0, 10, 10);
		ctx.clip();
		ctx.fillRect(5, 5, 100, 100);
		ctx.fillRect(50, 50, 5, 5);
		// The fill's box grows a pixel for antialiasing before the clip cuts it.
		expect(list.ops.map((op) => op.bounds)).toEqual([new Rect(4, 4, 6, 6)]);
	});

	it('leaves a filtered draw unbounded, since a filter can spread it anywhere', () => {
		ctx.filter = 'blur(2px)';
		ctx.fillRect(0, 0, 10, 10);
		expect(list.ops[0]?.bounds).toBeNull();
	});

	it('leaves a path with an arcTo unbounded', () => {
		ctx.beginPath();
		ctx.moveTo(0, 0);
		ctx.arcTo(10, 0, 10, 10, 5);
		ctx.fill();
		expect(list.ops[0]?.bounds).toBeNull();
	});

	it('boxes text by its measured ink, padded for hinting', () => {
		ctx.font = '10px serif';
		ctx.fillText('ab', 0, 20);
		// 20px wide and 10px tall per the fake probe, padded 3px, plus a pixel of antialiasing.
		expect(list.ops[0]?.bounds).toEqual(new Rect(-4, 6, 28, 18));
	});

	it('boxes putImageData in the device pixels it writes', () => {
		ctx.putImageData(ctx.createImageData(4, 2), 10, 20);
		expect(list.ops[0]?.bounds).toEqual(new Rect(9, 19, 6, 4));
	});

	it('records nothing for an empty path or a non-finite rect', () => {
		ctx.beginPath();
		ctx.fill();
		ctx.fillRect(Number.NaN, 0, 10, 10);
		expect(list.ops).toEqual([]);
	});

	it('repeats an odd dash list, as a canvas does', () => {
		ctx.setLineDash([1, 2, 3]);
		expect(ctx.getLineDash()).toEqual([1, 2, 3, 1, 2, 3]);
	});

	it('hands the sink a reset', () => {
		ctx.fillRect(0, 0, 1, 1);
		ctx.reset();
		expect(list.ops).toEqual([]);
	});
});
