import { Stopwatch, SystemClock } from 'core/time';
import type { CDPSession, Page } from 'playwright';
import type { Tab } from './tab';

// Bound both the PNG and the enlarged viewport to 128 MiB of raw RGBA pixels each.
// Larger captures can silently lose SVG ink (the full alphaTab quartet did), even
// when Chromium returns a valid PNG. This is a capture budget, not an engine limit.
const MAX_CAPTURE_PIXELS = 33_554_432;

export class PlaywrightTab implements Tab {
	constructor(private readonly page: Page) {}

	/** @internal Measure an operation's elapsed time and collect its browser CPU profile. */
	async profile<T>(operation: () => Promise<T>) {
		const session = await this.page.context().newCDPSession(this.page);
		const timer = new Stopwatch(new SystemClock());
		try {
			await session.send('Profiler.enable');
			await session.send('Profiler.start');
			timer.start();
			const result = await operation();
			const ms = timer.elapsed().ms;
			const { profile } = await session.send('Profiler.stop');
			return { result, ms, profile };
		} finally {
			timer.dispose();
			await session.detach();
		}
	}

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

	// The DevTools session holding the CPU throttle; the throttle lasts as long as it does.
	private throttling: CDPSession | null = null;

	async throttle(rate: number): Promise<void> {
		this.throttling ??= await this.page.context().newCDPSession(this.page);
		await this.throttling.send('Emulation.setCPUThrottlingRate', { rate });
		if (rate === 1) {
			await this.throttling.detach();
			this.throttling = null;
		}
	}

	async screenshot(selector: string): Promise<Buffer> {
		// An element screenshot reaches past the viewport without resizing it, so a page that paints
		// only what's in view (vexml's tiles on a long score) would leave the rest blank. Grow the
		// viewport over the element for the shot, let a frame paint it, then put the size back.
		const locator = this.page.locator(selector);
		const prior = this.page.viewportSize();
		const box = await locator.boundingBox();
		const bottom = Math.ceil((box?.y ?? 0) + (box?.height ?? 0));
		if (box) {
			const scale = await this.page.evaluate(() => window.devicePixelRatio);
			const width = Math.ceil(box.width * scale);
			const height = Math.ceil(box.height * scale);
			const viewportPixels = prior
				? Math.ceil(prior.width * scale) *
					Math.ceil(Math.max(prior.height, bottom) * scale)
				: 0;
			if (
				width * height > MAX_CAPTURE_PIXELS ||
				viewportPixels > MAX_CAPTURE_PIXELS
			) {
				throw new Error(
					`Unsupported capture size: ${width}x${height} device pixels for ${selector}; ` +
						`image or expanded viewport exceeds the ${MAX_CAPTURE_PIXELS}-pixel capture budget. ` +
						'Capture a smaller measure slice.',
				);
			}
		}
		if (!prior || bottom <= prior.height) {
			return locator.screenshot();
		}
		try {
			await this.page.setViewportSize({ width: prior.width, height: bottom });
			await this.page.evaluate(
				() =>
					new Promise((resolve) =>
						requestAnimationFrame(() => requestAnimationFrame(resolve)),
					),
			);
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
