import type { Page } from 'playwright';
import type { Tab } from './tab';

export class PlaywrightTab implements Tab {
	constructor(private readonly page: Page) {}

	async call<T = void>(name: string, arg?: unknown): Promise<T> {
		// The one serialized function in the repo: page.evaluate ships this dispatcher into
		// the page as source text, where it looks the name up on globalThis. Everything the
		// callers wrote runs from real scripts loaded at open().
		return (await this.page.evaluate(
			async ({ name, arg }) => {
				const fn = (globalThis as Record<string, unknown>)[name];
				if (typeof fn !== 'function') {
					throw new Error(`call: no script registered '${name}' on globalThis`);
				}
				return await fn(arg);
			},
			{ name, arg },
		)) as T;
	}

	async screenshot(selector: string): Promise<Buffer> {
		return this.page.locator(selector).screenshot();
	}

	async resize(width: number, height: number): Promise<void> {
		await this.page.setViewportSize({ width, height });
	}

	async close(): Promise<void> {
		await this.page.close();
	}
}
