import { describe, expect, it } from 'bun:test';
import type { ScoreLayout } from '@vexml/renderer';
import {
	describeMark,
	type Mark,
	type ReviewData,
	resolve,
} from './review-data';
import { reviewMessage } from './review-message';

describe('review data', () => {
	it('names everything a box overlaps', () => {
		const target = resolve(
			mark({ from: { x: 110, y: 25 }, to: { x: 175, y: 55 } }),
			LAYOUT,
		);
		expect(target.measures).toEqual([{ number: '2', system: 1 }]);
		expect(target.parts).toEqual(['Guitar']);
		expect(target.notes.map((note) => note.pitch)).toEqual(['B/4', null]);
		expect(target.approximate).toBe(false);
	});

	it("names the one note an arrow's tip is nearest", () => {
		const target = resolve(
			mark({ kind: 'arrow', from: { x: 50, y: 90 }, to: { x: 132, y: 33 } }),
			LAYOUT,
		);
		expect(target.notes.map((note) => note.pitch)).toEqual(['B/4']);
		expect(target.measures.map((measure) => measure.number)).toEqual(['2']);
	});

	it('names a tab fret a pin sits on', () => {
		const target = resolve(
			mark({ kind: 'pin', from: { x: 125, y: 85 }, to: { x: 125, y: 85 } }),
			LAYOUT,
		);
		expect(target.notes).toHaveLength(1);
		expect(target.notes[0]?.tab).toEqual({ string: 3, fret: 4 });
	});

	it('reads a mark on the old render off the new layout, as near', () => {
		const target = resolve(
			mark({ panel: 'before', from: { x: 10, y: 10 }, to: { x: 20, y: 20 } }),
			LAYOUT,
		);
		expect(target.approximate).toBe(true);
	});

	it('says what a box covers, then its pixels', () => {
		expect(
			describeMark(
				mark({ from: { x: 110, y: 25 }, to: { x: 175, y: 55 } }),
				LAYOUT,
			),
		).toBe(
			'Box on After: m. 2 (system 1), Guitar, staff 1, voice 1, B4 ♪, rest ♩ (110,25 65×30)',
		);
	});

	it('says what an arrow points at', () => {
		expect(
			describeMark(
				mark({ kind: 'arrow', from: { x: 50, y: 90 }, to: { x: 124, y: 82 } }),
				LAYOUT,
			),
		).toBe(
			'Arrow on After, pointing at m. 2 (system 1), Guitar, staff 1, voice 1, fret 4 on string 3 (50,90 → 124,82)',
		);
	});

	it('gives only pixels with no layout', () => {
		expect(describeMark(mark({ to: { x: 4, y: 4 } }), null)).toBe(
			'Box on After (0,0 4×4)',
		);
	});

	it('lists each verdict and mark, then the same as JSON', () => {
		const message = reviewMessage(DATA, {
			id: 'beams',
			version: 2,
			submitted: true,
			verdicts: { 'a.png': 'changes', 'b.png': 'approved' },
			marks: {
				'a.png': [
					mark({
						from: { x: 110, y: 25 },
						to: { x: 175, y: 55 },
						note: 'The beam slants.',
					}),
				],
			},
		});
		expect(message).toStartWith(
			'[VEX REVIEW beams v2]\nLevel beams across rests\nChanges requested on 1 of 3 snapshots; 1 approved; 1 not reviewed.',
		);
		expect(message).toContain(
			'## ✗ a.png (needs change)\nrender.test.ts:47 · a.musicxml\n1. Box on After: m. 2',
		);
		expect(message).toContain('   The beam slants.');
		expect(message).toContain('## ✓ b.png\n');
		expect(message).toContain('## · c.png (not reviewed)');
		const json = JSON.parse(
			message.slice(
				message.indexOf('```json\n') + 8,
				message.lastIndexOf('\n```'),
			),
		);
		expect(json.snapshots[0].marks[0].target.measures).toEqual([
			{ number: '2', system: 1 },
		]);
	});

	it('flags a review not yet submitted', () => {
		const message = reviewMessage(DATA, {
			id: 'beams',
			version: 2,
			submitted: false,
			verdicts: {},
			marks: {},
		});
		expect(message).toContain('(Draft: not submitted yet.)');
	});
});

// One system, two measures of one part's one stave, two notes and a tab fret in m. 2.
const LAYOUT: ScoreLayout = {
	systems: [{ index: 0, box: { x: 0, y: 0, w: 200, h: 100 } }],
	measures: [
		{ number: '1', index: 0, system: 0, box: { x: 0, y: 0, w: 100, h: 100 } },
		{ number: '2', index: 1, system: 0, box: { x: 100, y: 0, w: 100, h: 100 } },
	],
	staves: [
		{
			part: 'Guitar',
			measure: '1',
			stave: 1,
			box: { x: 0, y: 20, w: 100, h: 40 },
		},
		{
			part: 'Guitar',
			measure: '2',
			stave: 1,
			box: { x: 100, y: 20, w: 100, h: 40 },
		},
	],
	notes: [
		{
			part: 'Guitar',
			measure: '2',
			stave: 1,
			voice: '1',
			pitch: 'B/4',
			beats: 0.5,
			box: { x: 120, y: 30, w: 10, h: 8 },
		},
		{
			part: 'Guitar',
			measure: '2',
			stave: 1,
			voice: '1',
			pitch: null,
			beats: 1,
			box: { x: 160, y: 30, w: 10, h: 20 },
		},
		{
			part: 'Guitar',
			measure: '2',
			stave: 1,
			voice: '1',
			pitch: 'B/4',
			beats: 0.5,
			tab: { string: 3, fret: 4 },
			box: { x: 120, y: 80, w: 10, h: 10 },
		},
	],
};

function mark(over: Partial<Mark>): Mark {
	return {
		kind: 'box',
		panel: 'after',
		from: { x: 0, y: 0 },
		to: { x: 0, y: 0 },
		note: '',
		...over,
	};
}

function entry(name: string): ReviewData['entries'][number] {
	return {
		name,
		test: 'render.test.ts',
		line: 47,
		fixture: `${name.replace('.png', '')}.musicxml`,
		changed: 10,
		share: 0.1,
		width: 200,
		height: 100,
		claim: null,
		layout: LAYOUT,
		images: { before: '', diff: '', after: '' },
		scale: 1,
	};
}
const DATA: ReviewData = {
	id: 'beams',
	version: 2,
	title: 'Level beams across rests',
	tradeoffs: null,
	unchanged: 3,
	entries: [entry('a.png'), entry('b.png'), entry('c.png')],
	mode: 'served',
};
