import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { type Browser, chromium, type Page } from 'playwright';
import { bundle, FILE_ORIGIN } from './bundle';

/** The few measures each README example engraves, as MusicXML. */
export interface ReadmeSources {
	/** Notation, lyrics, chord diagrams and tab: the opening of Amazing Grace. */
	tab: string;
	/** Voice and piano, two measures: playback, events, editing, fonts and colors. */
	song: string;
	/** The song's first measure alone, after a gap. */
	songOpening: string;
	/** Enough of the song to scroll a panoramic line past its opening. */
	songLong: string;
}

declare const vexml: {
	render: typeof import('@stringsync/vexml').render;
	EditingSession: typeof import('@stringsync/vexml').EditingSession;
	MDOMParser: typeof import('@stringsync/mdom').MDOMParser;
	Note: typeof import('@stringsync/vexml').Note;
};
declare global {
	var score: import('@stringsync/vexml').Score;
	var cursor: import('@stringsync/vexml').CursorController;
	var editor: import('@stringsync/vexml').EditingSession;
}

const PAGE_HTML =
	'<!doctype html><html><head><style>body{margin:0;background:#fff}#wrap{padding:12px;display:inline-block}</style></head><body><div id="wrap"><div id="score"></div></div></body></html>';

const STANDARD = {
	layout: { type: 'standard' as const, referenceWidth: 600 },
};

const PETALUMA = path.resolve(
	import.meta.dir,
	'../site/public/fonts/Petaluma.woff2',
);

/**
 * Records the README's example images and GIFs: each a small score in a real browser at 2x,
 * driven the way the README's snippet says. PNGs are trimmed to the ink; GIFs are halved to
 * 1x. Needs ImageMagick's `magick` on the PATH.
 */
export class ReadmeMedia {
	private browser: Promise<Browser> | null = null;
	private script: Promise<string> | null = null;
	private readonly written: string[] = [];

	constructor(
		private readonly out: string,
		private readonly sources: ReadmeSources,
	) {}

	/** Record every example into `out`, returning the paths written. */
	async record(): Promise<string[]> {
		fs.mkdirSync(this.out, { recursive: true });
		try {
			await this.notation();
			await this.playback();
			await this.events();
			await this.editing();
			await this.sticky();
			await this.style();
			await this.gaps();
		} finally {
			await (await this.browser)?.close();
		}
		return this.written;
	}

	private async notation(): Promise<void> {
		const page = await this.open(640);
		await page.evaluate(
			async ({ musicXML, config }) => {
				globalThis.score = await vexml.render(
					musicXML,
					document.getElementById('score') as HTMLDivElement,
					config,
				);
			},
			{ musicXML: this.sources.tab, config: STANDARD },
		);
		await this.png(page, 'notation');
	}

	// A cursor sweeps the bar while the notes it reports as sounding turn red.
	private async playback(): Promise<void> {
		const page = await this.open(640);
		const durationMs = await page.evaluate(
			async ({ musicXML, config }) => {
				globalThis.score = await vexml.render(
					musicXML,
					document.getElementById('score') as HTMLDivElement,
					config,
				);
				globalThis.cursor = score.createCursor();
				cursor.sync(score.createPlayhead({ color: '#e11d48', widthPx: 2 }));
				let lit: InstanceType<typeof vexml.Note>[] = [];
				cursor.events.on('change', (e) => {
					for (const n of lit) {
						n.color.off();
					}
					lit = [...e.highlighted];
					for (const n of e.highlighted) {
						n.color.on('#e11d48');
					}
				});
				return score.getDurationMs();
			},
			{ musicXML: this.sources.song, config: STANDARD },
		);
		const frames: Buffer[] = [];
		const fps = 12;
		// Played at 2x so the loop stays short.
		const count = Math.ceil((durationMs / 2000) * fps);
		for (let i = 0; i <= count; i++) {
			await page.evaluate((ms) => cursor.seekMs(ms), (i / count) * durationMs);
			frames.push(await this.frame(page));
		}
		await this.gif(page, frames, 'playback', fps);
	}

	// The real pointer moves note to note; the README's hover handler draws the halo.
	private async events(): Promise<void> {
		const page = await this.open(640);
		const points = await page.evaluate(
			async ({ musicXML, config }) => {
				const element = document.getElementById('score') as HTMLDivElement;
				globalThis.score = await vexml.render(musicXML, element, config);
				let previous: InstanceType<typeof vexml.Note> | null = null;
				score.events.on('hover', (e) => {
					const current = e.target instanceof vexml.Note ? e.target : null;
					if (current !== previous) {
						previous?.halo.off();
						current?.halo.on('rgba(41, 98, 255, 0.35)');
						previous = current;
					}
				});
				// Note centers in page px, top staff only, in reading order.
				const box = (
					element.querySelector('.vexml-canvas') ?? element
				).getBoundingClientRect();
				const scale = box.width / config.layout.referenceWidth;
				return (score.getParts()[0]?.getMeasures() ?? [])
					.flatMap((m) => m.getVoices())
					.flatMap((v) => v.getNotes())
					.map((n) => ({
						x: box.left + (n.rect.x + n.rect.w / 2) * scale,
						y: box.top + (n.rect.y + n.rect.h / 2) * scale,
					}))
					.sort((a, b) => a.x - b.x);
			},
			{ musicXML: this.sources.song, config: STANDARD },
		);
		const frames: Buffer[] = [];
		for (const p of points) {
			await page.mouse.move(p.x, p.y, { steps: 2 });
			const shot = await this.frame(page);
			frames.push(shot, shot, shot);
		}
		await this.gif(page, frames, 'events', 8);
	}

	// The selection steps through notes, Shift extends it, and a pitch edit rerenders.
	private async editing(): Promise<void> {
		const page = await this.open(640);
		await page.evaluate(
			async ({ musicXML, config }) => {
				const element = document.getElementById('score') as HTMLDivElement;
				const doc = new vexml.MDOMParser().parseFromString(musicXML);
				globalThis.editor = new vexml.EditingSession(doc);
				globalThis.score = await vexml.render(doc, element, config);
				score.createEditingController(editor);
				editor.events.on('documentchange', async () => {
					score.dispose();
					globalThis.score = await vexml.render(doc, element, config);
					score.createEditingController(editor);
				});
			},
			{ musicXML: this.sources.song, config: STANDARD },
		);
		const frames: Buffer[] = [];
		const hold = async (n: number) => {
			await page.waitForTimeout(50);
			const shot = await this.frame(page);
			for (let i = 0; i < n; i++) {
				frames.push(shot);
			}
		};
		await hold(4);
		for (const extend of [false, false, false, true, true]) {
			await page.evaluate((extend) => editor.move('next', { extend }), extend);
			await hold(4);
		}
		await page.evaluate(() => editor.setPitch({ step: 'G', octave: 5 }));
		// The rerender runs off documentchange, after setPitch returns.
		await page.waitForTimeout(400);
		await hold(10);
		await this.gif(page, frames, 'editing', 8);
	}

	// A panoramic line scrolled until its opening is folded over at the left edge.
	private async sticky(): Promise<void> {
		const page = await this.open(460, 400);
		await page.evaluate(
			async ({ musicXML }) => {
				const element = document.getElementById('score') as HTMLDivElement;
				globalThis.score = await vexml.render(musicXML, element, {
					layout: { type: 'panoramic', stickySignatures: true },
					width: 420,
				});
				element.scrollLeft = (element.scrollWidth - element.clientWidth) * 0.4;
				// The fold repaints on the scroll event, a frame later.
				await new Promise((resolve) => requestAnimationFrame(resolve));
				await new Promise((resolve) => requestAnimationFrame(resolve));
			},
			{ musicXML: this.sources.songLong },
		);
		await this.png(page, 'sticky');
	}

	// Petaluma in light ink on a dark background.
	private async style(): Promise<void> {
		const page = await this.open(640);
		await page.evaluate(
			async ({ musicXML, config, petaluma }) => {
				document.body.style.background = '#0f172a';
				globalThis.score = await vexml.render(
					musicXML,
					document.getElementById('score') as HTMLDivElement,
					{
						...config,
						backgroundColor: '#0f172a',
						fonts: {
							notation: { family: 'Petaluma', url: petaluma, color: '#e2e8f0' },
							// No family, so the default text face still loads (FontOverride wants one).
							text: { color: '#fbbf24' } as unknown as { family: string },
						},
					},
				);
			},
			{
				musicXML: this.sources.song,
				config: STANDARD,
				petaluma: `${FILE_ORIGIN}${PETALUMA}`,
			},
		);
		await this.png(page, 'style', '#0f172a');
	}

	private async gaps(): Promise<void> {
		const page = await this.open(640);
		await page.evaluate(
			async ({ musicXML, config }) => {
				globalThis.score = await vexml.render(
					musicXML,
					document.getElementById('score') as HTMLDivElement,
					{
						...config,
						gaps: [
							{
								beforeMeasureIndex: 0,
								durationMs: 8000,
								label: 'Intro',
								minWidth: 140,
								style: { fill: 'rgba(41, 98, 255, 0.08)' },
							},
						],
					},
				);
			},
			{ musicXML: this.sources.songOpening, config: STANDARD },
		);
		await this.png(page, 'gaps');
	}

	private async open(width: number, height = 600): Promise<Page> {
		this.browser ??= chromium.launch();
		this.script ??= bundle(path.resolve(import.meta.dir, 'readme-page.ts'));
		const page = await (await this.browser).newPage({
			viewport: { width, height },
			deviceScaleFactor: 2,
		});
		// vexml's Bravura and the Petaluma woff2, by the path bundle() points import.meta.url at.
		await page.route(`${FILE_ORIGIN}/**`, async (route) => {
			const file = Bun.file(
				decodeURIComponent(new URL(route.request().url()).pathname),
			);
			await route.fulfill({
				headers: { 'access-control-allow-origin': '*' },
				contentType: file.type,
				body: Buffer.from(await file.arrayBuffer()),
			});
		});
		await page.setContent(PAGE_HTML);
		await page.addScriptTag({ content: await this.script });
		return page;
	}

	private frame(page: Page): Promise<Buffer> {
		return page.locator('#wrap').screenshot();
	}

	// Trimmed to the ink plus a margin in the paper's color, since a score's box runs past it.
	private async png(
		page: Page,
		name: string,
		paper = '#ffffff',
	): Promise<void> {
		const target = path.join(this.out, `${name}.png`);
		await page.locator('#wrap').screenshot({ path: target });
		await page.close();
		magick([
			target,
			'-trim',
			'+repage',
			'-bordercolor',
			paper,
			'-border',
			'32',
			target,
		]);
		this.written.push(target);
	}

	// Frames to a looping GIF at `fps`, halved from the 2x capture.
	private async gif(
		page: Page,
		frames: Buffer[],
		name: string,
		fps: number,
	): Promise<void> {
		await page.close();
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'readme-gif-'));
		try {
			for (const [i, f] of frames.entries()) {
				fs.writeFileSync(
					path.join(dir, `${String(i).padStart(4, '0')}.png`),
					f,
				);
			}
			const target = path.join(this.out, `${name}.gif`);
			// One palette for every frame, so a color in only some frames (a selection) survives:
			// per-frame palettes, and ffmpeg's encoder, fringed the text in yellow.
			const palette = path.join(dir, 'palette.gif');
			const glob = path.join(dir, '[0-9]*.png');
			magick([
				glob,
				'-resize',
				'50%',
				'-append',
				'+dither',
				'-colors',
				'48',
				'-unique-colors',
				palette,
			]);
			magick([
				'-delay',
				String(Math.round(100 / fps)),
				glob,
				'-resize',
				'50%',
				'+dither',
				'-remap',
				palette,
				'-layers',
				'OptimizeTransparency',
				'-loop',
				'0',
				target,
			]);
			this.written.push(target);
		} finally {
			fs.rmSync(dir, { recursive: true });
		}
	}
}

function magick(args: string[]): void {
	const proc = Bun.spawnSync(['magick', ...args]);
	if (proc.exitCode !== 0) {
		throw new Error(`magick: ${proc.stderr.toString()}`);
	}
}
