import { beforeEach, describe, expect, it } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { FakePaintProbe } from './fake-paint-probe';
import { PaintContext } from './paint-context';
import { PaintDecoder } from './paint-decoder';
import { PaintEncoder } from './paint-encoder';
import { PaintList } from './paint-list';
import {
	type ScoreSnapshot,
	SNAPSHOT_FORMAT,
	SNAPSHOT_VERSION,
} from './score-snapshot';
import { TextOutliner } from './text-outliner';

const BRAVURA = new URL('./assets/fonts/Bravura.woff2', import.meta.url);
const CLEF = '';
const FONT = "30pt 'Bravura', serif";

describe('TextOutliner', () => {
	let list: PaintList;
	let ctx: CanvasRenderingContext2D;
	let outliner: TextOutliner;

	beforeEach(async () => {
		list = new PaintList();
		ctx = new PaintContext(
			list,
			new FakePaintProbe(),
			null,
		) as unknown as CanvasRenderingContext2D;
		outliner = new TextOutliner([
			{ family: 'Bravura', data: new Uint8Array(await readFile(BRAVURA)) },
		]);
	});

	it('outlines a text whose font holds it, which decodes onto its call', () => {
		ctx.font = FONT;
		ctx.fillText(CLEF, 10, 20);
		ctx.fillText(CLEF, 50, 20);

		const snapshot = outliner.outline(snapshotOf(list));
		const ops = decode(snapshot);

		expect(snapshot.outlines?.glyphs).toHaveLength(1);
		expect(snapshot.outlines?.texts).toHaveLength(1);
		expect(ops.map((op) => 'outline' in op.call)).toEqual([true, true]);
	});

	it('traces an outline into a path a recording bounds', () => {
		ctx.font = FONT;
		ctx.fillText(CLEF, 10, 20);
		const [op] = decode(outliner.outline(snapshotOf(list)));
		const outline = op?.call.kind === 'fillText' ? op.call.outline : undefined;
		list.reset();

		ctx.beginPath();
		outline?.trace(ctx, 10, 20);
		ctx.fill();

		expect(list.ops[0]?.path?.[0]?.kind).toBe('moveTo');
		expect(list.ops[0]?.bounds?.w).toBeGreaterThan(0);
	});

	it('leaves out a text with a character none of its families holds', () => {
		ctx.font = FONT;
		ctx.fillText('A', 10, 20);

		const snapshot = outliner.outline(snapshotOf(list));

		expect(snapshot.outlines?.texts).toEqual([]);
		expect(decode(snapshot).map((op) => 'outline' in op.call)).toEqual([false]);
	});

	it('leaves out a text drawn to a maxWidth', () => {
		ctx.font = FONT;
		ctx.fillText(CLEF, 10, 20, 5);

		expect(outliner.outline(snapshotOf(list)).outlines?.texts).toEqual([]);
	});
});

function snapshotOf(list: PaintList): ScoreSnapshot {
	const encoder = new PaintEncoder();
	const ops = encoder.encode(list.ops);
	return {
		format: SNAPSHOT_FORMAT,
		version: SNAPSHOT_VERSION,
		config: {} as ScoreSnapshot['config'],
		paint: encoder.tables(),
		engraving: { ops, width: 100, height: 100, origin: [0, 0], scale: 1 },
		fold: null,
		pages: [],
		elements: {} as ScoreSnapshot['elements'],
		sequence: {} as ScoreSnapshot['sequence'],
		gaps: [],
		outlines: null,
	};
}

function decode(snapshot: ScoreSnapshot) {
	return new PaintDecoder(snapshot.paint, snapshot.outlines).decode(
		snapshot.engraving?.ops ?? [],
	);
}
