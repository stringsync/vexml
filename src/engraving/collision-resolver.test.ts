import { describe, expect, it } from 'bun:test';
import { Rect } from '../geometry';
import { CollisionResolver } from './collision-resolver';

function detector(): CollisionResolver {
	return new CollisionResolver(new Rect(-1000, -1000, 4000, 4000));
}

describe('CollisionResolver', () => {
	it('reports the kind and minimum translation of every hit', () => {
		const d = detector();
		d.add({ rect: new Rect(5, 0, 10, 10), kind: 'note' });
		const hits = d.query(new Rect(0, 0, 10, 10));
		expect(hits).toHaveLength(1);
		expect(hits[0]?.other.kind).toBe('note');
		// Overlap is 5 wide, 10 tall → separate along x, leftward (candidate is left of note).
		expect(hits[0]?.mtv.axis).toBe('x');
		expect(hits[0]?.mtv.dx).toBe(-5);
	});

	it('raises a rect to sit `gap` above the highest obstacle in its column', () => {
		const d = detector();
		d.add({ rect: new Rect(5, 90, 10, 30), kind: 'note' }); // top at y=90
		d.add({ rect: new Rect(5, 70, 10, 5), kind: 'tie' }); // higher: top at y=70 (kind-agnostic)
		const natural = new Rect(0, 85, 20, 15); // bottom at y=100, overlaps both
		const placed = d.liftClear(natural, 8);
		expect(placed.bottom).toBe(62); // 70 (highest top) - 8 gap
		expect(placed.x).toBe(0); // x unchanged — text only lifts vertically
	});

	it('leaves a rect that is already clear above its column where it is', () => {
		const d = detector();
		d.add({ rect: new Rect(5, 200, 10, 30), kind: 'note' }); // well below the annotation
		const natural = new Rect(0, 85, 20, 15); // bottom at y=100
		expect(d.liftClear(natural, 8)).toBe(natural); // returned unchanged
	});

	it('stacks successive annotations above one another', () => {
		const d = detector();
		d.add({ rect: new Rect(5, 90, 10, 30), kind: 'note' });
		const a = d.liftClear(new Rect(0, 85, 20, 15), 8); // bottom 82
		d.add({ rect: a, kind: 'annotation' });
		const b = d.liftClear(new Rect(0, 85, 20, 15), 8); // must clear `a`, not the note
		expect(b.bottom).toBe(a.y - 8); // a.y is a's top
	});

	it('ignores the obstacle kinds a lift filters out, so text clears notes but not diagrams', () => {
		const d = detector();
		d.add({ rect: new Rect(5, 90, 10, 30), kind: 'note' }); // top at y=90
		d.add({ rect: new Rect(0, 70, 20, 5), kind: 'diagram' }); // higher, but a diagram
		const natural = new Rect(0, 85, 20, 15); // bottom at y=100
		// Clearing only note/tie/annotation: lifts to clear the note (90), not the diagram (70).
		const placed = d.liftClear(natural, 8, {
			kinds: ['note', 'tie', 'annotation'],
		});
		expect(placed.bottom).toBe(82); // 90 - 8, the diagram was ignored
	});

	it('lowers a rect to sit `gap` below the lowest obstacle in its column', () => {
		const d = detector();
		d.add({ rect: new Rect(5, 90, 10, 30), kind: 'note' }); // bottom at y=120
		d.add({ rect: new Rect(5, 130, 10, 5), kind: 'tie' }); // lower: bottom at y=135
		const natural = new Rect(0, 100, 20, 15);
		expect(d.dropClear(natural, 8).y).toBe(143); // 135 (lowest bottom) + 8 gap
	});

	it('leaves an already-clear rect put when dropping, and stacks the next one under it', () => {
		const d = detector();
		d.add({ rect: new Rect(5, 0, 10, 30), kind: 'note' }); // well above
		const natural = new Rect(0, 100, 20, 15);
		expect(d.dropClear(natural, 8)).toBe(natural); // returned unchanged
		d.add({ rect: new Rect(5, 100, 10, 30), kind: 'note' }); // bottom at 130
		const a = d.dropClear(natural, 8);
		d.add({ rect: a, kind: 'annotation' });
		expect(d.dropClear(natural, 8).y).toBe(a.bottom + 8); // stacks under `a`
	});

	it('keeps the gap when pushing a box right of a close neighbor, as the chord-diagram cursor does', () => {
		const d = detector();
		d.add({ rect: new Rect(0, 0, 88, 84), kind: 'diagram' }); // right edge at x=88
		// Overlapping neighbour → pushed to 88 + 6.
		expect(d.pushRightOf(new Rect(50, 0, 88, 84), 'diagram', 6).x).toBe(94);
		// Close but not overlapping (90 > 88) → gap still enforced to 94.
		expect(d.pushRightOf(new Rect(90, 0, 88, 84), 'diagram', 6).x).toBe(94);
		// Far enough away → left where it is.
		expect(d.pushRightOf(new Rect(200, 0, 88, 84), 'diagram', 6).x).toBe(200);
	});

	it('ignores a diagram in a different vertical band when pushing right', () => {
		const d = detector();
		d.add({ rect: new Rect(0, 0, 88, 84), kind: 'diagram' });
		// Same x-range but a different stave (y far below) → no horizontal push.
		expect(d.pushRightOf(new Rect(50, 500, 88, 84), 'diagram', 6).x).toBe(50);
	});

	it('pulls an over-right box back inside without overshooting left, and leaves an inside box put', () => {
		const d = detector();
		const bounds = new Rect(0, 0, 100, 100);
		// Overruns the right edge -> pulled left so its right edge lands on the (margin-inset) edge.
		expect(d.nudgeInsideX(new Rect(80, 0, 30, 10), bounds, 5).x).toBe(65);
		// Already inside -> untouched.
		expect(d.nudgeInsideX(new Rect(20, 0, 30, 10), bounds, 5).x).toBe(20);
		// Wider than the span -> clamps to the left edge rather than overshooting it.
		expect(d.nudgeInsideX(new Rect(80, 0, 200, 10), bounds, 5).x).toBe(5);
	});

	it('flags the rects that cross the viewport edges', () => {
		const d = detector();
		d.add({ rect: new Rect(10, 10, 5, 5), kind: 'note' }); // inside
		d.add({ rect: new Rect(10, -20, 5, 5), kind: 'annotation' }); // off the top
		d.add({ rect: new Rect(95, 10, 20, 5), kind: 'diagram' }); // off the right
		const escaped = d.escaping(new Rect(0, 0, 100, 100));
		const byKind = new Map(escaped.map((e) => [e.item.kind, e.edges]));
		expect(byKind.size).toBe(2);
		expect(byKind.get('annotation')).toEqual(['top']);
		expect(byKind.get('diagram')).toEqual(['right']);
	});
});
