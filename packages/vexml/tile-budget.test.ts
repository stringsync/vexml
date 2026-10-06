import { describe, expect, it } from 'bun:test';
import { TileBudget } from './tile-budget';

describe('TileBudget', () => {
	it('frees the least recently used tiles until the rest fit', () => {
		const budget = new TileBudget<string>(20);
		budget.use('a', 10);
		budget.use('b', 10);
		budget.use('c', 10);
		budget.use('a', 10); // re-using a leaves b the least recent, so b is the one freed
		expect(budget.trim(new Set())).toEqual(['b']);
		expect(budget.used).toBe(20);
	});

	it('never frees a kept tile, even past the limit', () => {
		const budget = new TileBudget<string>(5);
		budget.use('a', 10);
		budget.use('b', 10);
		expect(budget.trim(new Set(['a', 'b']))).toEqual([]);
		expect(budget.used).toBe(20);
	});

	it('frees nothing while under the limit', () => {
		const budget = new TileBudget<string>(100);
		budget.use('a', 10);
		expect(budget.trim(new Set())).toEqual([]);
	});

	it('stops counting a dropped tile', () => {
		const budget = new TileBudget<string>(100);
		budget.use('a', 10);
		budget.use('b', 30);
		budget.drop('a');
		expect(budget.used).toBe(30);
	});
});
