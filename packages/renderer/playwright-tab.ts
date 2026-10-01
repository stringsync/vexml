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
		// An element screenshot reaches past the viewport without resizing it, so a page that paints
		// only what's in view (vexml's tiles on a long score) would leave the rest blank. Grow the
		// viewport over the element for the shot, let a frame paint it, then put the size back.
		const locator = this.page.locator(selector);
		const prior = this.page.viewportSize();
		const box = await locator.boundingBox();
		const bottom = Math.ceil((box?.y ?? 0) + (box?.height ?? 0));
		if (!prior || bottom <= prior.height) {
			return locator.screenshot();
		}
		await this.page.setViewportSize({ width: prior.width, height: bottom });
		await this.page.evaluate(
			() =>
				new Promise((resolve) =>
					requestAnimationFrame(() => requestAnimationFrame(resolve)),
				),
		);
		try {
			return await locator.screenshot();
		} finally {
			await this.page.setViewportSize(prior);
		}
	}

	async resize(width: number, height: number): Promise<void> {
		await this.page.setViewportSize({ width, height });
	}

	async disposeAsync(): Promise<void> {
		await this.page.close();
	}
}
