import { describe, expect, it } from 'bun:test';
import type { InkMask } from '@vexml/renderer';
import { Rect } from 'webappwiz/geometry';
import { InkCollisions } from './ink-collisions';

const first: InkMask = {
	id: 0,
	kind: 'harmony',
	x: 10,
	y: 20,
	width: 3,
	height: 2,
	runs: [0, 1, 4, 1],
};
const second: InkMask = {
	id: 1,
	kind: 'tempo',
	x: 10,
	y: 20,
	width: 3,
	height: 2,
	runs: [1, 1, 4, 1],
};

describe('InkCollisions', () => {
	it('does not flag ink included in an ancestor through intermediate wrappers', () => {
		expect(
			new InkCollisions([
				first,
				{ ...second, parent: 99, ancestors: [first.id, 99] },
			]).findings(),
		).toEqual([]);
	});
	it('accepts a shared unison head but still detects a rest against that head', () => {
		const head = { ...first, kind: 'notehead' };
		expect(new InkCollisions([head, { ...head, id: 1 }]).findings()).toEqual(
			[],
		);
		expect(
			new InkCollisions([head, { ...head, id: 1, kind: 'rest' }]).findings(),
		).toHaveLength(1);
	});
	it('allows touching chord heads but keeps a one-pixel contact between distinct voices', () => {
		const head: InkMask = {
			...first,
			kind: 'notehead',
			parent: 10,
			runs: [0, 6],
		};
		const touching: InkMask = { ...head, id: 1, x: 12, y: 21 };
		expect(new InkCollisions([head, touching]).findings()).toEqual([]);
		expect(
			new InkCollisions([head, { ...touching, parent: 11 }]).findings(),
		).toEqual([
			{
				kind: 'collision',
				message: 'notehead ink overlaps notehead ink',
				box: new Rect(12, 21, 1, 1),
			},
		]);
	});
	it('allows beam/staff construction while retaining beam/head collisions', () => {
		const beam = { ...first, kind: 'beam' };
		expect(
			new InkCollisions([beam, { ...second, kind: 'stave' }]).findings(),
		).toEqual([]);
		expect(
			new InkCollisions([beam, { ...second, kind: 'notehead' }]).findings(),
		).toHaveLength(1);
	});
	it('boxes only the opaque ink intersection, including a single pixel', () => {
		expect(new InkCollisions([first, second]).findings()).toEqual([
			{
				kind: 'collision',
				message: 'harmony ink overlaps tempo ink',
				box: new Rect(11, 21, 1, 1),
			},
		]);
	});
	it('does not confuse overlapping bounds with touching ink', () => {
		expect(
			new InkCollisions([first, { ...second, runs: [1, 1, 5, 1] }]).findings(),
		).toEqual([]);
	});
	it('maps pixels from separately cropped masks to capture coordinates', () => {
		expect(
			new InkCollisions([
				first,
				{ ...second, x: 11, y: 21, width: 1, height: 1, runs: [0, 1] },
			]).findings()[0]?.box,
		).toEqual(new Rect(11, 21, 1, 1));
	});
	it('permits notation construction contacts on the allowlist', () => {
		expect(
			new InkCollisions([
				{ ...first, kind: 'notehead' },
				{ ...second, kind: 'stem' },
			]).findings(),
		).toEqual([]);
	});
	it('does not flag ink shared with its containing element', () => {
		expect(
			new InkCollisions([first, { ...second, parent: first.id }]).findings(),
		).toEqual([]);
	});
	it('checks two different elements of the same kind', () => {
		expect(
			new InkCollisions([first, { ...second, kind: 'harmony' }]).findings(),
		).toHaveLength(1);
	});
	it('finds the same box regardless of input order', () => {
		expect(new InkCollisions([second, first]).findings()[0]?.box).toEqual(
			new Rect(11, 21, 1, 1),
		);
	});
	it('leaves distant elements alone', () => {
		expect(
			new InkCollisions([first, { ...second, x: 100 }]).findings(),
		).toEqual([]);
	});

	it('intersects enormous sparse masks without allocating their bounding bitmap', () => {
		const huge = {
			...first,
			x: -10,
			y: -20,
			width: 1_000_000,
			height: 1_000_000,
			runs: [999_999_999_998, 2],
		};
		const small = {
			...second,
			x: 999_989,
			y: 999_979,
			width: 1,
			height: 1,
			runs: [0, 1],
		};
		expect(new InkCollisions([huge, small]).findings()[0]?.box).toEqual(
			new Rect(999_989, 999_979, 1, 1),
		);
	});

	it.each(
		Array.from({ length: 100 }, (_, seed) => seed),
	)('matches a pixel oracle for cropped, multirow runs (case %i)', (seed) => {
		const a = generatedMask(seed, 0),
			b = generatedMask(seed, 1);
		expect(new InkCollisions([a, b]).findings().map((f) => f.box)).toEqual(
			pixelIntersection(a, b),
		);
	});
});

function generatedMask(seed: number, id: number): InkMask {
	const width = 1 + ((seed + id * 3) % 9);
	const height = 1 + ((seed * 7 + id) % 8);
	const runs: number[] = [];
	let start = -1;
	for (let p = 0; p <= width * height; p++) {
		const ink = p < width * height && (p * 17 + seed * 3 + id) % 11 < 7;
		if (ink && start < 0) {
			start = p;
		} else if (!ink && start >= 0) {
			runs.push(start, p - start);
			start = -1;
		}
	}
	return {
		id,
		kind: id ? 'tempo' : 'harmony',
		x: ((seed + id * 2) % 5) - 3,
		y: ((seed * 3 + id) % 5) - 2,
		width,
		height,
		runs,
	};
}

function pixelIntersection(a: InkMask, b: InkMask): Rect[] {
	const opaque = (mask: InkMask, x: number, y: number) => {
		if (
			x < mask.x ||
			x >= mask.x + mask.width ||
			y < mask.y ||
			y >= mask.y + mask.height
		) {
			return false;
		}
		const p = (y - mask.y) * mask.width + x - mask.x;
		return mask.runs.some(
			(start, i) =>
				i % 2 === 0 && p >= start && p < start + (mask.runs[i + 1] ?? 0),
		);
	};
	let expected: Rect | null = null;
	for (let y = -3; y < 15; y++) {
		for (let x = -3; x < 15; x++) {
			if (opaque(a, x, y) && opaque(b, x, y)) {
				const pixel = new Rect(x, y, 1, 1);
				expected = expected ? expected.union(pixel) : pixel;
			}
		}
	}
	return expected ? [expected] : [];
}
