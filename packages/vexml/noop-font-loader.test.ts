import { describe, expect, it } from 'bun:test';
import { NoopFontLoader } from './noop-font-loader';

describe('NoopFontLoader', () => {
	// The container is never read (that is the whole point), so an empty object stands in for it
	// and the absence of a document in this environment is itself the no-side-effects assertion.
	const container = {} as HTMLElement;

	it('resolves the default families', async () => {
		expect(await new NoopFontLoader().load(container)).toEqual({
			notation: 'Bravura',
			text: 'Source Sans 3',
		});
	});

	it('resolves an overridden text family', async () => {
		expect(
			await new NoopFontLoader().load(container, { text: { family: 'Inter' } }),
		).toEqual({ notation: 'Bravura', text: 'Inter' });
	});
});
