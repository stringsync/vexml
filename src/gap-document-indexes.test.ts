import { describe, expect, it } from 'bun:test';
import { gapDocumentIndexes } from './gaps';
import { gap } from './gaps-harness';

describe('gapDocumentIndexes', () => {
	it('maps caller indexes to shifted document indexes, preserving config order', () => {
		expect(gapDocumentIndexes([gap(4), gap(0), gap(0)])).toEqual([
			{ gap: gap(4), measureIndex: 6 },
			{ gap: gap(0), measureIndex: 0 },
			{ gap: gap(0), measureIndex: 1 },
		]);
	});
});
