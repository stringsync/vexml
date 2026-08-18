import { describe, expect, it } from 'bun:test';
import { Rect } from './geometry';
import { type SpillStave, SpillTracker } from './spill-tracker';

describe('SpillTracker', () => {
	// Staff lines at y 40 (top) and 80 (bottom), anchored at y 30. SPILL_COLUMN is 8, so
	// a rect at x 0..16 covers columns 0..2.
	const stave: SpillStave = {
		getY: () => 30,
		getYForLine: () => 40,
		getBottomLineY: () => 80,
	};

	it('bands a rect rising over the top line, keeping the worst extent per column', () => {
		const tracker = new SpillTracker();
		tracker.recordStave(0, 0, stave, new Rect(0, 25, 16, 10)); // rises 15 over line 40
		tracker.recordStave(0, 0, stave, new Rect(8, 35, 4, 5)); // rises 5, column 1 only
		const spill = tracker.observedStaveSpill().get(0)?.get(0);
		expect(spill?.rise.get(0)).toBe(15);
		expect(spill?.rise.get(1)).toBe(15);
		expect(spill?.rise.get(2)).toBe(15);
		expect(spill?.drop.size).toBe(0); // bottom 35 stays above line 80: no drop stored
	});

	it('bands a drop under the bottom line and leaves untouched columns absent', () => {
		const tracker = new SpillTracker();
		tracker.recordDrop(0, 1, stave, new Rect(16, 70, 8, 22)); // bottom 92, 12 under 80
		const spill = tracker.observedStaveSpill().get(0)?.get(1);
		expect(spill?.drop.get(2)).toBe(12);
		expect(spill?.drop.get(3)).toBe(12);
		expect(spill?.drop.get(0)).toBeUndefined();
		expect(spill?.rise.size).toBe(0);
	});

	it('seeds a row with its staff-line offsets without recording any spill', () => {
		const tracker = new SpillTracker();
		tracker.seedRow(2, 3, stave);
		const spill = tracker.observedStaveSpill().get(2)?.get(3);
		expect(spill).toMatchObject({ lineTop: 10, lineBottom: 50 });
		expect(spill?.rise.size).toBe(0);
		expect(spill?.drop.size).toBe(0);
	});

	it('reports overflow as how far content rose above each placed system top', () => {
		const tracker = new SpillTracker();
		tracker.recordSystemTop(1, 200);
		tracker.growHighestTop(1, 180);
		tracker.growHighestTop(1, 190); // keeps the higher (smaller) 180
		expect(tracker.observedOverflow().get(1)).toBe(20);
	});

	it('excludes the first system and systems with no recorded content from overflow', () => {
		const tracker = new SpillTracker();
		tracker.recordSystemTop(0, 100);
		tracker.growHighestTop(0, 50); // system 0 uses the cropped top slack instead
		tracker.recordSystemTop(1, 200); // placed, but nothing recorded content
		expect(tracker.observedOverflow().size).toBe(0);
	});

	it('clamps overflow at 0 when content stayed below the system top', () => {
		const tracker = new SpillTracker();
		tracker.recordSystemTop(1, 200);
		tracker.growHighestTop(1, 240);
		expect(tracker.observedOverflow().get(1)).toBe(0);
	});

	it('keeps the topmost decoration y per system', () => {
		const tracker = new SpillTracker();
		tracker.growDecorationTop(0, 60);
		tracker.growDecorationTop(0, 45);
		tracker.growDecorationTop(0, 70);
		expect(tracker.decorationTopOf(0)).toBe(45);
		expect(tracker.decorationTopOf(1)).toBeUndefined();
	});
});
