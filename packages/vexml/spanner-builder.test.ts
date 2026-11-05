import { describe, expect, it } from 'bun:test';
import type { Note } from '@stringsync/mdom';
import { Stave, StaveNote, TickContext } from 'vexflow/core';
import { DynamicGlyphs } from './dynamic-glyphs';
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
	): WedgeMark => ({
		lead,
		type,
		trailing,
		number: '1',
		crescendo: false,
		placement: 'above',
		dash: null,
		niente: false,
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
	});

	it('keeps a genuine wrapped hairpin running to the system edge', () => {
		const lead = {} as Note;
		const later = {} as Note;
		const end = {} as Note;
		const builder = new SpannerBuilder(new ScoreReader(new DynamicGlyphs()));
		const hairpins = builder.buildWedges(
			[marker(lead, 'start'), marker(end, 'stop')],
			new Map([
				[lead, noteOn(0, 0)],
				[later, noteOn(200, 0)],
				[end, noteOn(0, 200)],
			]),
		);
		expect(hairpins).toHaveLength(2);
		expect(hairpins[0]?.rect.right).toBe(400);
	});
});
