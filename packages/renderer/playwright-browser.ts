import { chromium, type Browser as PlaywrightEngine } from 'playwright';
import type { Browser, OpenOptions } from './browser';
import { PlaywrightTab } from './playwright-tab';
import type { Tab } from './tab';

/** The one Browser implementation: Playwright-driven Chromium, launched lazily on the
 * first open(). Nothing outside this package should import playwright. */
export class PlaywrightBrowser implements Browser {
	private engine: Promise<PlaywrightEngine> | null = null;

	async open({ html, scripts = [], width, height }: OpenOptions): Promise<Tab> {
		this.engine ??= chromium.launch();
		const engine = await this.engine;
		const page = await engine.newPage({ viewport: { width, height } });
		await page.setContent(html);
		for (const content of scripts) {
			// addScriptTag resolves after the (classic) script has executed, so a script's
			// globalThis registrations are visible to the next script and to call().
			await page.addScriptTag({ content });
		}
		return new PlaywrightTab(page);
	}

	async disposeAsync(): Promise<void> {
		// Dropped first, so disposing twice shuts the engine down once and a later open()
		// launches a fresh one.
		const engine = this.engine;
		this.engine = null;
		await (await engine)?.close();
	}
}
