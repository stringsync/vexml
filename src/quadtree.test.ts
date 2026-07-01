import { describe, expect, it } from 'bun:test';
import { Rect } from './geometry';
import { QuadTree } from './quadtree';

type Item = { id: number; rect: Rect };

function randomRect(): Rect {
	const x = Math.floor(Math.random() * 1000) - 100; // can stray outside [0,1000)
	const y = Math.floor(Math.random() * 1000) - 100;
	const w = 1 + Math.floor(Math.random() * 40);
	const h = 1 + Math.floor(Math.random() * 40);
	return new Rect(x, y, w, h);
}

describe('QuadTree', () => {
	it('query matches a brute-force oracle, including out-of-bounds items', () => {
		const bounds = new Rect(0, 0, 1000, 1000);
		for (let trial = 0; trial < 25; trial++) {
			const tree = new QuadTree<Item>(bounds, 4, 6);
			const items: Item[] = [];
			for (let i = 0; i < 200; i++) {
				const item = { id: i, rect: randomRect() };
				items.push(item);
				tree.insert(item);
			}
			for (let q = 0; q < 10; q++) {
				const area = randomRect();
				const got = new Set(tree.query(area).map((i) => i.id));
				const want = new Set(
					items.filter((i) => i.rect.intersects(area)).map((i) => i.id),
				);
				expect(got).toEqual(want);
			}
		}
	});

	it('items outside the root bounds land in the outside bucket and are still queryable', () => {
		const tree = new QuadTree<Item>(new Rect(0, 0, 100, 100), 4, 4);
		const inside = { id: 1, rect: new Rect(10, 10, 5, 5) };
		const escaped = { id: 2, rect: new Rect(-50, -50, 20, 20) }; // wholly outside
		const straddler = { id: 3, rect: new Rect(90, 90, 40, 40) }; // spills past the edge
		tree.insert(inside);
		tree.insert(escaped);
		tree.insert(straddler);

		const outsideIds = new Set(tree.outside().map((i) => i.id));
		expect(outsideIds).toEqual(new Set([2, 3]));

		// The escaped item is still found by a query that overlaps it.
		const hits = new Set(
			tree.query(new Rect(-60, -60, 30, 30)).map((i) => i.id),
		);
		expect(hits).toEqual(new Set([2]));
	});

	it('clear resets the tree and the outside bucket', () => {
		const tree = new QuadTree<Item>(new Rect(0, 0, 100, 100), 2, 4);
		for (let i = 0; i < 20; i++) {
			tree.insert({ id: i, rect: new Rect(i, i, 2, 2) });
		}
		tree.insert({ id: 99, rect: new Rect(-10, -10, 2, 2) });
		tree.clear();
		expect(tree.query(new Rect(0, 0, 100, 100))).toHaveLength(0);
		expect(tree.outside()).toHaveLength(0);
	});
});
