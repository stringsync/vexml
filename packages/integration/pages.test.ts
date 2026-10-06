import { describe, expect, it } from 'bun:test';
import type { ConfigInput } from '@stringsync/vexml';
import type { VexmlContext } from '@vexml/renderer';
import { testing } from './setup';

describe('pages', () => {
	it.concurrent('exports a long score from a hidden container as whole-system pages', async () => {
		const musicXML = await testing.fixture('score_bach_air.musicxml');
		const { result } = await testing.eval(
			'score_bach_air.musicxml',
			{},
			exportPages,
			{
				musicXML,
				config: {
					layout: LETTER,
					pixelRatio: 1,
					backgroundColor: '#ffffff',
					fonts: FONTS,
				},
			},
		);

		expect(result.pages.length).toBeGreaterThan(1);
		expect(result.steps).toBeGreaterThan(0);
		expect(result.disposedThrows).toBe(true);
		expect(
			result.pages.map((page) => ({
				size: `${page.width}x${page.height}`,
				cornerAlpha: page.cornerAlpha,
				hasSystems: page.systems.length > 0,
				systemsInsidePage: page.systems.every(
					(system) => system.top >= 0 && system.bottom <= 1056,
				),
			})),
		).toEqual(
			result.pages.map(() => ({
				size: '816x1056',
				cornerAlpha: 255,
				hasSystems: true,
				systemsInsidePage: true,
			})),
		);
		// The first two pages show the paper, margins and system fit; the rest only repeat them.
		result.pages.slice(0, 2).forEach((page, i) => {
			expect(Buffer.from(page.png, 'base64')).toMatchScreenshot(
				`pages_bach_air_${i + 1}.png`,
			);
		});
	});

	it.concurrent('draws each page at the configured pixel ratio', async () => {
		const musicXML = await testing.fixture('score_bach_air.musicxml');
		const { result } = await testing.eval(
			'score_bach_air.musicxml',
			{},
			exportPages,
			{
				musicXML,
				config: {
					layout: { ...LETTER, pageWidth: 794, pageHeight: 1123 },
					pixelRatio: 3,
					fonts: FONTS,
				},
			},
		);

		expect(result.pages.length).toBeGreaterThan(1);
		// No backgroundColor: the paper still comes out opaque.
		expect(
			result.pages.map((page) => ({
				size: `${page.width}x${page.height}`,
				cornerAlpha: page.cornerAlpha,
			})),
		).toEqual(
			result.pages.map(() => ({ size: '2382x3369', cornerAlpha: 255 })),
		);
	});

	it.concurrent('shows the pages stacked on screen', async () => {
		const image = await testing.render('score_bach_air.musicxml', {
			layout: { ...LETTER, pageHeight: 600 },
			backgroundColor: '#ffffff',
		});
		expect(image).toMatchScreenshot('pages_stacked.png');
	});
});

// US Letter with half-inch margins: the 816 x 1056 CSS px page sound2score exports.
const LETTER = {
	type: 'paged',
	pageWidth: 816,
	pageHeight: 1056,
	margin: 48,
} as const;

type Exported = {
	pages: Array<{
		width: number;
		height: number;
		// Alpha of the page's top-left pixel, in its margin: the paper must be opaque.
		cornerAlpha: number;
		// Every system on the page, in page px: none may cross a page edge.
		systems: Array<{ top: number; bottom: number }>;
		png: string;
	}>;
	steps: number;
	disposedThrows: boolean;
};

// Renders into a container of its own, hidden and off screen as sound2score does it, exports every
// page and the playback steps, and disposes. Runs in the page via toString(): self-contained.
async function exportPages(
	{ render }: VexmlContext,
	arg: { musicXML: string; config: ConfigInput },
): Promise<Exported> {
	const hidden = document.createElement('div');
	hidden.style.visibility = 'hidden';
	hidden.style.position = 'absolute';
	hidden.style.left = '-100000px';
	hidden.style.top = '0';
	document.body.appendChild(hidden);
	const score = await render(arg.musicXML, hidden, arg.config);
	const decode = async (blob: Blob) => {
		const bitmap = await createImageBitmap(blob);
		const canvas = document.createElement('canvas');
		canvas.width = bitmap.width;
		canvas.height = bitmap.height;
		const ctx = canvas.getContext('2d');
		ctx?.drawImage(bitmap, 0, 0);
		const alpha = ctx?.getImageData(0, 0, 1, 1).data[3] ?? 0;
		const bytes = new Uint8Array(await blob.arrayBuffer());
		let binary = '';
		for (const byte of bytes) {
			binary += String.fromCharCode(byte);
		}
		return {
			width: bitmap.width,
			height: bitmap.height,
			alpha,
			png: btoa(binary),
		};
	};
	const pages = score.getPages();
	const blobs = await Promise.all(
		pages.map((page) => page.toBlob('image/png')),
	);
	const exported = await Promise.all(
		pages.map(async (page, i) => {
			const image = await decode(blobs[i] as Blob);
			return {
				width: image.width,
				height: image.height,
				cornerAlpha: image.alpha,
				systems: page.getSystems().map((system) => ({
					top: system.rect.y - page.rect.y,
					bottom: system.rect.bottom - page.rect.y,
				})),
				png: image.png,
			};
		}),
	);
	const steps = score.getSequence().getSteps().length;
	const last = pages[0];
	score.dispose();
	hidden.remove();
	let disposedThrows = false;
	try {
		last?.toCanvas();
	} catch {
		disposedThrows = true;
	}
	return { pages: exported, steps, disposedThrows };
}

const FONTS = {
	notation: { family: 'Bravura' },
	text: { family: 'Source Sans 3' },
} as const;
