import { describe, expect, it } from 'bun:test';
import { bumpOf } from './ship';

describe('bumpOf', () => {
	it('takes the argument over the environment', () => {
		expect(bumpOf('minor', 'major')).toBe('minor');
	});

	it('reads SPLATES_SHIP_BUMP when no argument is given', () => {
		expect(bumpOf(undefined, 'patch')).toBe('patch');
		expect(bumpOf(undefined, 'major')).toBe('major');
	});

	it('refuses an unknown value', () => {
		expect(() => bumpOf(undefined, 'prerelease')).toThrow('SPLATES_SHIP_BUMP');
	});

	it('refuses when neither is given', () => {
		expect(() => bumpOf(undefined, undefined)).toThrow('patch, minor or major');
		expect(() => bumpOf(undefined, '')).toThrow('patch, minor or major');
	});
});
