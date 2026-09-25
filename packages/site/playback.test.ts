import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { type Browser, chromium, type Page } from 'playwright';
import { createServer, type ViteDevServer } from 'vite';
import { ensure } from 'webappwiz/assert';

// How long the fake sample CDN takes to answer: long enough that a play pressed on arrival has
// to wait for it.
const CDN_DELAY_MS = 4000;

// Vite exercises the same module graph as the dev site, including the workspace library.
describe('dev site playback', () => {
	let server: ViteDevServer;
	let browser: Browser;
	let url: string;

	beforeAll(async () => {
		server = await createServer({
			root: 'packages/site',
			server: { port: 0 },
		});
		await server.listen();
		url = ensure.present(
			server.resolvedUrls?.local[0],
			'Missing dev server URL',
		);
		browser = await chromium.launch({
			headless: true,
			args: ['--no-sandbox'],
		});
	});

	afterAll(async () => {
		await browser?.close();
		await server?.close();
	});

	it('waits for the samples before starting, then starts at once', async () => {
		const { page, sent } = await open();
		await page.getByRole('button', { name: 'Play', exact: true }).click();
		await page.getByRole('button', { name: 'Loading', exact: true }).waitFor();

		// Still waiting well into the delay: the clock has not moved.
		await page.waitForTimeout(CDN_DELAY_MS / 2);
		expect(await isVisible(page, 'Loading')).toBe(true);
		expect(await elapsed(page)).toBe('0:00');

		// Playback starts only once the samples land, and from the top.
		await page
			.getByRole('button', { name: 'Pause', exact: true })
			.waitFor({ timeout: CDN_DELAY_MS * 2 });
		expect(sent()).toBe(true);
		expect(await elapsed(page)).toBe('0:00');
		await page.waitForFunction(() =>
			document.body.textContent?.includes('0:01'),
		);

		// Loaded now, so a second play needs no wait.
		await page.getByRole('button', { name: 'Pause', exact: true }).click();
		const again = Date.now();
		await page.getByRole('button', { name: 'Play', exact: true }).click();
		await page.getByRole('button', { name: 'Pause', exact: true }).waitFor();
		expect(Date.now() - again).toBeLessThan(500);
		await page.context().close();
	}, 30_000);

	it('cancels a start that is still loading', async () => {
		const { page, served } = await open();
		await page.getByRole('button', { name: 'Play', exact: true }).click();
		await page.getByRole('button', { name: 'Loading', exact: true }).click();
		await page.getByRole('button', { name: 'Play', exact: true }).waitFor();

		// Well past the samples landing, the cancelled start never ran.
		await served;
		await page.waitForTimeout(1000);
		expect(await isVisible(page, 'Play')).toBe(true);
		expect(await isVisible(page, 'Pause')).toBe(false);
		expect(await elapsed(page)).toBe('0:00');
		await page.context().close();
	}, 30_000);

	// A fresh page, samples on a slow fake CDN, and a score long enough to still be playing
	// seconds in. `served` settles once the samples have gone out, and `sent` says whether yet.
	async function open(): Promise<{
		page: Page;
		served: Promise<void>;
		sent: () => boolean;
	}> {
		const context = await browser.newContext({
			viewport: { width: 1440, height: 1000 },
		});
		const page = await context.newPage();
		page.setDefaultTimeout(7000);
		let sent = false;
		const { promise: served, resolve } = Promise.withResolvers<void>();
		await page.route('https://**', (route) => route.abort());
		await page.route(/gleitz\.github\.io/, async (route) => {
			await new Promise((resolve) => setTimeout(resolve, CDN_DELAY_MS));
			await route
				.fulfill({ contentType: 'application/javascript', body: soundfont() })
				.catch(() => {});
			sent = true;
			resolve();
		});
		await page.addInitScript(
			(xml) => localStorage.setItem('vexml:musicxml', xml),
			score(),
		);
		await page.goto(url, { waitUntil: 'domcontentloaded' });
		await page.getByRole('button', { name: 'Play', exact: true }).waitFor();
		// Once the player mounts, the score re-renders to fit the space above it, and that swaps
		// in a new session. A play pressed before the swap would go to the discarded one.
		const first = await page
			.getByRole('application', { name: 'Score', exact: true })
			.locator('canvas')
			.first()
			.elementHandle();
		await page.waitForFunction((canvas) => !canvas?.isConnected, first);
		await page.getByRole('button', { name: 'Play', exact: true }).waitFor();
		return { page, served, sent: () => sent };
	}
});

async function isVisible(page: Page, name: string): Promise<boolean> {
	return page.getByRole('button', { name, exact: true }).isVisible();
}

// The elapsed half of the player's "0:00 / 0:16" readout.
async function elapsed(page: Page): Promise<string> {
	const text = await page
		.locator('span', { hasText: /^\d+:\d\d \/ \d+:\d\d$/ })
		.first()
		.textContent();
	return ensure.present(text?.split(' ')[0], 'Missing elapsed time');
}

// A MIDI.js soundfont, the format smplr fetches, holding one short silent WAV sample.
function soundfont(): string {
	const frames = 4410;
	const wav = Buffer.alloc(44 + frames * 2);
	wav.write('RIFF', 0);
	wav.writeUInt32LE(36 + frames * 2, 4);
	wav.write('WAVE', 8);
	wav.write('fmt ', 12);
	wav.writeUInt32LE(16, 16);
	wav.writeUInt16LE(1, 20);
	wav.writeUInt16LE(1, 22);
	wav.writeUInt32LE(44100, 24);
	wav.writeUInt32LE(44100 * 2, 28);
	wav.writeUInt16LE(2, 32);
	wav.writeUInt16LE(16, 34);
	wav.write('data', 36);
	wav.writeUInt32LE(frames * 2, 40);
	const data = `data:audio/wav;base64,${wav.toString('base64')}`;
	return `MIDI.Soundfont.marimba = {\n"C4": "${data}",\n}`;
}

// Eight bars of whole-note Cs at the default tempo: sixteen seconds of playback.
function score(): string {
	const measures = Array.from(
		{ length: 8 },
		(_, i) => `<measure number="${i + 1}">
			${i === 0 ? '<attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>' : ''}
			<note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><type>whole</type></note>
		</measure>`,
	).join('');
	return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
	<part-list><score-part id="P1"><part-name>Music</part-name></score-part></part-list>
	<part id="P1">${measures}</part>
</score-partwise>`;
}
