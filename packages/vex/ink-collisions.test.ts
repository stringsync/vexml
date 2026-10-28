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
});
