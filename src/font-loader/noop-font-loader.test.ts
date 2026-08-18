// biome-ignore-all lint/suspicious/noExplicitAny: minimal DOM mocks for unit testing
import { describe, expect, it } from 'bun:test';
import { fakeDom } from './font-loader-harness';
import { NoopFontLoader } from './noop-font-loader';

describe('NoopFontLoader', () => {
	it('returns resolved names without touching the DOM or container', () => {
		const { head, vars, container } = fakeDom();
		expect(new NoopFontLoader().load(container)).toEqual({
			notation: 'Bravura',
			text: 'Source Sans 3',
		});
		expect(
			new NoopFontLoader().load(container, { text: { family: 'Inter' } }),
		).toEqual({ notation: 'Bravura', text: 'Inter' });
		expect(head.length).toBe(0); // no injected tags
		expect(vars).toEqual({}); // no CSS vars on the container
	});
});
