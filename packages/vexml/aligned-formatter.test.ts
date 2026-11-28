import { describe, expect, it } from 'bun:test';
import { BarNote, StaveNote, Voice } from 'vexflow/core';
import { AlignedFormatter } from './aligned-formatter';

describe('AlignedFormatter', () => {
	const eighth = (key: string) => new StaveNote({ keys: [key], duration: '8' });
	const half = (key: string) => new StaveNote({ keys: [key], duration: 'h' });
	const voice = (tickables: Array<StaveNote | BarNote>) =>
		new Voice().setMode(Voice.Mode.SOFT).addTickables(tickables);

	it('aligns simultaneous notes across parts with staggered mid-measure barlines', () => {
		const p1Notes = Array.from({ length: 6 }, () => eighth('g/4'));
		const p2Notes = Array.from({ length: 6 }, () => eighth('e/4'));
		const p1Bar = new BarNote();
		const p2Bar = new BarNote();
		// Part 1 barline before note index 3; Part 2 barline before note index 4.
		const v1 = voice([...p1Notes.slice(0, 3), p1Bar, ...p1Notes.slice(3)]);
		const v2 = voice([...p2Notes.slice(0, 4), p2Bar, ...p2Notes.slice(4)]);

		const formatter = new AlignedFormatter();
		formatter.joinVoices([v1]);
		formatter.joinVoices([v2]);
		formatter.format([v1, v2], 300);

		expect(p1Notes.map((n) => n.getTickContext())).toEqual(
			p2Notes.map((n) => n.getTickContext()),
		);
		expect(p1Notes.map((n) => n.getX())).toEqual(p2Notes.map((n) => n.getX()));
		// Each barline sits strictly between its preceding note and its downbeat note.
		expect(p1Bar.getX()).toBeGreaterThan(p1Notes[2]?.getX() ?? 0);
		expect(p1Bar.getX()).toBeLessThan(p1Notes[3]?.getX() ?? 0);
		expect(p2Bar.getX()).toBeGreaterThan(p2Notes[3]?.getX() ?? 0);
		expect(p2Bar.getX()).toBeLessThan(p2Notes[4]?.getX() ?? 0);
	});

	it('keeps notes aligned after a mid-measure barline when the other part holds a longer note', () => {
		const p1Notes = [
			eighth('g/4'),
			eighth('a/4'),
			eighth('b/4'),
			eighth('c/5'),
		];
		const p1Bar = new BarNote();
		const p2First = half('e/4');
		const p2Second = half('f/4');
		// Part 1 barline occurs mid-way through Part 2's first half note; both parts' beat 2+ notes still align.
		const v1 = voice([
			p1Notes[0] as StaveNote,
			p1Notes[1] as StaveNote,
			p1Bar,
			p1Notes[2] as StaveNote,
			p1Notes[3] as StaveNote,
		]);
		const v2 = voice([p2First, p2Second]);

		const formatter = new AlignedFormatter();
		formatter.joinVoices([v1]);
		formatter.joinVoices([v2]);
		formatter.format([v1, v2], 250);

		expect(p1Notes[0]?.getTickContext()).toBe(p2First.getTickContext());
		expect(p1Bar.getX()).toBeGreaterThan(p1Notes[1]?.getX() ?? 0);
		expect(p1Bar.getX()).toBeLessThan(p1Notes[2]?.getX() ?? 0);
	});
});
