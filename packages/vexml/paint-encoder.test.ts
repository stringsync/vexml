import { beforeEach, describe, expect, it } from 'bun:test';
import { FakePaintProbe } from './fake-paint-probe';
import { PaintContext } from './paint-context';
import { PaintDecoder } from './paint-decoder';
import { PaintEncoder } from './paint-encoder';
import { PaintList } from './paint-list';
import type { PaintOp } from './paint-op';

describe('PaintEncoder', () => {
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

	it('round-trips every call through JSON with its coordinates exact', () => {
		ctx.fillStyle = '#336699';
		ctx.lineWidth = 1.25;
		ctx.setLineDash([3, 2]);
		ctx.translate(10.123456789, 0.1 + 0.2);
		ctx.beginPath();
		ctx.moveTo(1 / 3, 2 / 3);
		ctx.bezierCurveTo(1, 2, 3, 4, 5, 6);
		ctx.arc(20, 20, 5, 0, Math.PI, true);
		ctx.closePath();
		ctx.fill('evenodd');
		ctx.stroke();
		ctx.fillRect(1.5, 2.5, 3.5, 4.5);
		ctx.clearRect(0, 0, 2, 2);
		ctx.font = '12px serif';
		ctx.fillText('ab', 7.777777, 8.888888);
		ctx.fillText('ab', 1, 2, 30);

		const decoded = roundTrip(list.ops);

		expect(decoded.map(describeOp)).toEqual(list.ops.map(describeOp));
	});

	it('shares a state between the ops that shared it', () => {
		ctx.fillRect(0, 0, 1, 1);
		ctx.fillRect(2, 2, 1, 1);
		ctx.fillStyle = 'red';
		ctx.fillRect(4, 4, 1, 1);

		const [a, b, c] = roundTrip(list.ops);

		expect(a?.state).toBe(b?.state as never);
		expect(c?.state).not.toBe(a?.state as never);
	});

	it('rounds bounds out to whole px, so they still hold the op', () => {
		ctx.fillRect(1.25, 2.75, 3.1, 4.2);

		const [op] = roundTrip(list.ops);
		const recorded = list.ops[0]?.bounds;

		expect(op?.bounds).toMatchObject({ x: 0, y: 1, w: 6, h: 7 });
		expect(recorded && op?.bounds?.containsRect(recorded)).toBe(true);
	});

	it('keeps a clip and the segments cut under it', () => {
		ctx.beginPath();
		ctx.rect(0, 0, 50, 50);
		ctx.clip();
		ctx.scale(2, 2);
		ctx.beginPath();
		ctx.moveTo(0, 0);
		ctx.lineTo(10, 10);
		ctx.stroke();

		const [op] = roundTrip(list.ops);

		expect(op?.state.clips.map((c) => c.rect)).toEqual(
			list.ops[0]?.state.clips.map((c) => c.rect) ?? [],
		);
		expect(op?.path?.map((s) => s.matrix.a)).toEqual([2, 2]);
	});

	it('refuses what JSON cannot hold', () => {
		ctx.fillStyle = ctx.createLinearGradient(0, 0, 1, 1);
		ctx.fillRect(0, 0, 1, 1);

		expect(() => new PaintEncoder().encode(list.ops)).toThrow(/fillStyle/);
	});
});

function roundTrip(ops: readonly PaintOp[]): PaintOp[] {
	const encoder = new PaintEncoder();
	const stream = encoder.encode(ops);
	const json = JSON.parse(JSON.stringify({ tables: encoder.tables(), stream }));
	return new PaintDecoder(json.tables).decode(json.stream);
}

// What a replay reads off an op, bounds aside (they're rounded out on purpose).
function describeOp(op: PaintOp) {
	const { a, b, c, d, e, f } = op.state.matrix;
	return {
		call: op.call,
		path: op.path?.map((s) => ({
			kind: s.kind,
			args: s.args.map((arg) => arg ?? false),
			matrix: [s.matrix.a, s.matrix.e, s.matrix.f],
		})),
		props: op.state.props,
		matrix: [a, b, c, d, e, f],
		dash: op.state.lineDash,
	};
}
