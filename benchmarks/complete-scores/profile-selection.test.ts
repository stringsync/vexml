import { describe, expect, test } from 'bun:test';
import { profileRanges, selectProfileEntries } from './profile-selection';

const entries = [
	{ id: 'debussy-mandoline', file: 'debussy.musicxml' },
	{ id: 'dvorak-american-quartet', file: 'dvorak.musicxml' },
	{ id: 'beethoven-symphony-5-i', file: 'beethoven.musicxml' },
];

describe('profile selection', () => {
	test('selects one score without changing the default all selection', () => {
		expect(selectProfileEntries(entries, 'debussy-mandoline')).toEqual([
			{ id: 'debussy-mandoline', file: 'debussy.musicxml' },
		]);
		expect(selectProfileEntries(entries, 'all')).toEqual(entries);
	});

	test('rejects an unknown score', () => {
		expect(() => selectProfileEntries(entries, 'missing')).toThrow(
			'unknown score: missing',
		);
	});

	test('retains the historical default windows', () => {
		expect(profileRanges('debussy-mandoline', '')).toEqual(['all']);
		expect(profileRanges('dvorak-american-quartet', '')).toEqual([
			'1-8',
			'423-430',
			'846-853',
			'all',
		]);
		expect(profileRanges('beethoven-symphony-5-i', '')).toEqual([
			'1-8',
			'248-255',
			'495-502',
			'all',
		]);
	});

	test('allows bounded-only or full-score-only runs', () => {
		expect(profileRanges('dvorak-american-quartet', '1-8,423-430')).toEqual([
			'1-8',
			'423-430',
		]);
		expect(profileRanges('beethoven-symphony-5-i', 'all')).toEqual(['all']);
	});
});
