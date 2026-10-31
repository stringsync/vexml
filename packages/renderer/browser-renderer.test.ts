import { beforeEach, describe, expect, test } from 'bun:test';
import { BrowserRenderer } from './browser-renderer';
import type { TabPool } from './pool';
import type { Tab } from './tab';

class FakeRenderer extends BrowserRenderer<unknown> {
	constructor(private readonly tab: Tab) {
		super();
	}

	protected pool(): TabPool {
		return {
			withTab: <T>(fn: (tab: Tab) => Promise<T>) => fn(this.tab),
		} as TabPool;
	}

	protected mountInput(): unknown {
		return 'score';
	}
}

describe('BrowserRenderer', () => {
	let calls: string[];
	let renderer: FakeRenderer;

	beforeEach(() => {
		calls = [];
		const tab = {
			call: async (name: string) => {
				calls.push(name);
			},
			screenshot: async () => {
				calls.push('screenshot');
				return Buffer.alloc(0);
			},
		} as unknown as Tab;
		renderer = new FakeRenderer(tab);
	});

	test('mounts repeatedly without capturing', async () => {
		await renderer.mount();
		await renderer.mount();

		expect(calls).toEqual(['mount', 'mount']);
	});
});
