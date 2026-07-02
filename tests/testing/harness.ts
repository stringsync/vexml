import type { Config } from '@stringsync/vexml';
import { withPage } from './setup';

// ponytail: mirrors src DEFAULT_WIDTH — the public API doesn't expose it, so tests
// don't get privileged access. Bump if src's default reference width ever exceeds this.
const DEFAULT_WIDTH = 900;

// A fixture is laid out to its reference width (8.5in unless the test overrides it);
// the result scales to any container at runtime, so a static viewport exercises the
// layout deterministically. The browser and page server are shared across the whole run
// (see setup.ts) — launching a second Chromium per file is flaky in Docker.

/** Render a corpus file in the browser and return its screenshot PNG. */
export async function render(
	file: string,
	config: Partial<Config>,
): Promise<Buffer> {
	const width =
		(config.layout?.type === 'standard'
			? config.layout.referenceWidth
			: undefined) ?? DEFAULT_WIDTH;
	// Default both fonts to the families the Docker image installs as system fonts (see
	// Dockerfile). Passing a family with no URL takes fonts.ts's "already available" path —
	// the browser resolves it synchronously instead of fetching Bravura's woff2 or Source
	// Sans 3 from the Google Fonts CDN, so nothing races the layout. A test that sets
	// fonts.notation or fonts.text (spread last) overrides the corresponding default.
	const resolved: Partial<Config> = {
		...config,
		fonts: {
			notation: { family: 'Bravura' },
			text: { family: 'Source Sans 3' },
			...config.fonts,
		},
	};
	return withPage(async (page) => {
		await page.setViewportSize({ width: width + 64, height: 600 });
		await page.evaluate(
			async ({ file, config }) => {
				const res = await fetch(`/data/${file}`);
				const input = file.endsWith('.mxl')
					? await res.blob()
					: await res.text();
				const container = document.getElementById('screenshot');
				if (!(container instanceof HTMLDivElement)) {
					throw new Error('container not found');
				}
				container.replaceChildren(); // clear the previous test's render
				await window.render(input, container, config);
			},
			{ file, config: resolved },
		);
		return page.locator('#screenshot').screenshot();
	});
}
