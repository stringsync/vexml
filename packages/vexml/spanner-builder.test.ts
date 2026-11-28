import { describe, expect, it } from 'bun:test';
import type { Note } from '@stringsync/mdom';
import {
	type RenderContext,
	Stave,
	StaveNote,
	TickContext,
} from 'vexflow/core';
import { HAIRPIN_BREAK_OPEN_RATIO } from './constants';
import { DynamicGlyphs } from './dynamic-glyphs';
import type { Hairpin } from './hairpin';
import { ScoreReader, type WedgeMark } from './score-reader';
import { SpannerBuilder } from './spanner-builder';

describe('SpannerBuilder hairpin endpoints', () => {
	// Two measures share a system; the third stave is on the next system.
	const noteOn = (x: number, y: number) => {
		const stave = new Stave(x, y, 200);
		const note = new StaveNote({ keys: ['c/4'], duration: 'h' }).setStave(
			stave,
		);
		new TickContext().addTickable(note).preFormat().setX(50);
		return note;
	};
	const marker = (
		lead: Note,
		type: 'start' | 'stop',
		trailing = false,
		opts: Partial<Pick<WedgeMark, 'crescendo' | 'niente'>> = {},
	): WedgeMark => ({
		lead,
		type,
		trailing,
		number: '1',
		crescendo: opts.crescendo ?? false,
		placement: 'above',
		dash: null,
		niente: opts.niente ?? false,
		spread: null,
	});

	it('ends a single-note trailing hairpin at its measure rather than the next measure', () => {
		const lead = {} as Note;
		const later = {} as Note;
		const first = noteOn(0, 0);
		const second = noteOn(200, 0);
		const builder = new SpannerBuilder(new ScoreReader(new DynamicGlyphs()));
		const [hairpin] = builder.buildWedges(
			[marker(lead, 'start'), marker(lead, 'stop', true)],
			new Map([
				[lead, first],
				[later, second],
			]),
		);
		expect(hairpin).toBeDefined();
		expect(hairpin?.rect.right).toBe(first.checkStave().getNoteEndX() - 4);
		// A single-note trailing diminuendo is not a system break, so its right end still closes to a point.
		const path = recordPath(hairpin as Hairpin);
		expect(path.moves).toHaveLength(1);
		expect(path.lines).toHaveLength(2);
	});

	it('keeps a genuine wrapped diminuendo open at the outgoing system edge and closed on the new system', () => {
		const lead = {} as Note;
		const later = {} as Note;
		const end = {} as Note;
		const builder = new SpannerBuilder(new ScoreReader(new DynamicGlyphs()));
		const hairpins = builder.buildWedges(
			[
				marker(lead, 'start', false, { crescendo: false, niente: true }),
				marker(end, 'stop', false, { crescendo: false, niente: true }),
			],
			new Map([
				[lead, noteOn(0, 0)],
				[later, noteOn(200, 0)],
				[end, noteOn(0, 200)],
			]),
		);
		expect(hairpins).toHaveLength(2);
		const [outgoing, incoming] = hairpins;
		expect(outgoing?.rect.right).toBe(400);
		const outPath = recordPath(outgoing as Hairpin);
		// Two separate strokes leave the broken right end open without a vertical closing line or niente circle.
		expect(outPath.moves).toHaveLength(2);
		expect(outPath.arcs).toBe(0);
		const outHeight =
			(outgoing?.bounds.bottom ?? 0) - (outgoing?.bounds.top ?? 0);
		const outRightGap = Math.abs(
			(outPath.moves[1]?.[1] ?? 0) - (outPath.lines[0]?.[1] ?? 0),
		);
		expect(outRightGap).toBeCloseTo(outHeight * HAIRPIN_BREAK_OPEN_RATIO, 5);
		// The incoming half closes to its real niente stop on the new system.
		const inPath = recordPath(incoming as Hairpin);
		expect(inPath.arcs).toBe(1);
	});

	it('keeps a genuine wrapped crescendo open at the start of the new system', () => {
		const lead = {} as Note;
		const later = {} as Note;
		const end = {} as Note;
		const builder = new SpannerBuilder(new ScoreReader(new DynamicGlyphs()));
		const hairpins = builder.buildWedges(
			[
				marker(lead, 'start', false, { crescendo: true, niente: true }),
				marker(end, 'stop', false, { crescendo: true, niente: true }),
			],
			new Map([
				[lead, noteOn(0, 0)],
				[later, noteOn(200, 0)],
				[end, noteOn(0, 200)],
			]),
		);
		expect(hairpins).toHaveLength(2);
		const [outgoing, incoming] = hairpins;
		// Outgoing crescendo starts closed with its niente circle.
		const outPath = recordPath(outgoing as Hairpin);
		expect(outPath.arcs).toBe(1);
		// Incoming crescendo starts open on the left without a niente circle.
		const inPath = recordPath(incoming as Hairpin);
		expect(inPath.moves).toHaveLength(2);
		expect(inPath.arcs).toBe(0);
		const inHeight =
			(incoming?.bounds.bottom ?? 0) - (incoming?.bounds.top ?? 0);
		const inLeftGap = Math.abs(
			(inPath.moves[1]?.[1] ?? 0) - (inPath.lines[0]?.[1] ?? 0),
		);
		expect(inLeftGap).toBeCloseTo(inHeight * HAIRPIN_BREAK_OPEN_RATIO, 5);
	});
});

function recordPath(hairpin: Hairpin) {
	const moves: [number, number][] = [];
	const lines: [number, number][] = [];
	let arcs = 0;
	const ctx = {
		save() {},
		restore() {},
		setLineWidth() {},
		setLineDash() {},
		beginPath() {},
		moveTo(x: number, y: number) {
			moves.push([x, y]);
		},
		lineTo(x: number, y: number) {
			lines.push([x, y]);
		},
		arc() {
			arcs += 1;
		},
		stroke() {},
	} as unknown as RenderContext;
	hairpin.setContext(ctx).draw();
	return { moves, lines, arcs };
}
