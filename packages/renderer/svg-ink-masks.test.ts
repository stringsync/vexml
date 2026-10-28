import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { type Browser, chromium } from 'playwright';
import type { InkMask } from './ink-mask';
import { SvgInkMasks } from './svg-ink-masks';

describe('SvgInkMasks', () => {
	let browser: Browser;
	beforeAll(async () => {
		browser = await chromium.launch();
	});
	afterAll(() => browser.close());

	it.each([
		{ scale: 1, rotation: 0 },
		{ scale: 2, rotation: 0 },
		{ scale: 1, rotation: 0.5 },
		{ scale: 2, rotation: 0.5 },
	])('tiles exclusive SVG masks at DPR $scale with rotation $rotation', async ({
		scale,
		rotation,
	}) => {
		const page = await browser.newPage({ deviceScaleFactor: scale });
		try {
			await page.setContent(`<body style="margin:0"><style>
svg .paint { fill: black; stroke: black; stroke-width: 3; }
.ink-parent { opacity: .8; }
</style><div id="screenshot" style="padding:7.25px;display:inline-block"><div id="score">
<svg width="2300" height="2600" viewBox="10 20 1150 1300" style="overflow:visible">
<defs><path id="shape" d="M0 0L12 0L6 15Z"/><clipPath id="clip"><rect x="0" y="0" width="1100" height="1200"/></clipPath></defs>
<g transform="translate(24.125 34.25) rotate(${rotation})">
<g class="ink-parent" clip-path="url(#clip)">
<rect class="paint" x="4" y="5" width="1070" height="1100" fill-opacity=".6"/>
<g class="ink-child" transform="translate(12 15) scale(1.2)"><use href="#shape"/><text x="20" y="20" font-size="16">Text</text></g>
<path d="M500 480L520 520L540 480" fill="none" stroke="black" stroke-width="5" stroke-miterlimit="8"/>
</g>
<g class="ink-percent"><rect x="50%" y="40%" width="5%" height="1%"/></g>
<g class="ink-hidden" visibility="hidden"><rect width="10" height="10"/></g>
</g><g class="ink-edge"><rect x="0" y="15" width="30" height="20"/></g></svg>
<svg width="80" height="150022" viewBox="0 0 80 150022" preserveAspectRatio="xMaxYMin meet">
<g class="ink-start"><rect x="10.25" y="10.25" width="20" height="20"/></g>
<g class="ink-end"><rect x="10.25" y="150000.25" width="20" height="20"/></g>
</svg></div></div></body>`);
			await page.addScriptTag({
				content: `globalThis.Masks = ${SvgInkMasks.toString()}`,
			});
			const result = await page.evaluate(compareRasterization);
			expect(result.largest).toBeLessThanOrEqual(1024);
			expect(
				maskDifferences(
					result.masks.slice(0, result.reference.length),
					result.reference,
					rotation,
				),
			).toEqual([]);
			expect(result.masks.map((mask) => mask.kind)).toEqual([
				'parent',
				'child',
				'percent',
				'hidden',
				'edge',
				'start',
				'end',
			]);
			expect(result.masks[1]?.ancestors).toContain(result.masks[0]?.id);
			expect(result.masks[3]?.runs).toEqual([]);
			expect(result.masks.at(-1)?.y).toBeGreaterThan(150000 * scale);
			expect(result.masks.at(-1)?.runs.length).toBeGreaterThan(0);
		} finally {
			await page.close();
		}
	}, 30000);
});

function maskDifferences(
	actual: InkMask[],
	expected: InkMask[],
	rotation: number,
): string[] {
	const differences: string[] = [];
	for (const [i, reference] of expected.entries()) {
		const mask = actual[i];
		if (
			JSON.stringify(mask && { ...mask, runs: [] }) !==
			JSON.stringify({ ...reference, runs: [] })
		) {
			differences.push(`${i}: metadata`);
		}
		if (
			reference.kind !== 'child' &&
			(rotation === 0 || reference.kind !== 'parent')
		) {
			if (JSON.stringify(mask?.runs) !== JSON.stringify(reference.runs)) {
				differences.push(`${i}: pixels`);
			}
			continue;
		}
		// Chromium rounds some edge alpha differently for clipped opacity layers
		// and high-DPI text. Permit under 1% differing ink, within a one-pixel fringe.

		const a = pixels(mask?.runs ?? []),
			b = pixels(reference.runs);
		const diff =
			[...a].filter((p) => !b.has(p)).length +
			[...b].filter((p) => !a.has(p)).length;
		if (diff >= b.size / 100) {
			differences.push(`${i}: ${diff} differing pixels`);
		}
		for (const [from, to] of [
			[a, b],
			[b, a],
		] as const) {
			for (const pixel of from) {
				if (
					![-1, 0, 1].some((dy) =>
						[-1, 0, 1].some((dx) => to.has(pixel + dy * reference.width + dx)),
					)
				) {
					differences.push(`${i}: distant pixel ${pixel}`);
					break;
				}
			}
		}
	}
	return differences;
}

function pixels(runs: number[]): Set<number> {
	const out = new Set<number>();
	for (let i = 0; i < runs.length; i += 2) {
		for (let p = runs[i] ?? 0; p < (runs[i] ?? 0) + (runs[i + 1] ?? 0); p++) {
			out.add(p);
		}
	}
	return out;
}

async function compareRasterization() {
	const Masks = (globalThis as unknown as { Masks: typeof SvgInkMasks }).Masks;
	const container = document.getElementById('score');
	if (!container) {
		throw new Error('missing score');
	}
	let largest = 0;
	const draw = CanvasRenderingContext2D.prototype.drawImage;
	CanvasRenderingContext2D.prototype.drawImage = function (
		image: CanvasImageSource,
		...args: number[]
	) {
		if (image instanceof HTMLImageElement) {
			largest = Math.max(largest, image.naturalWidth, image.naturalHeight);
		}
		Reflect.apply(draw, this, [image, ...args]);
	};
	const masks = await new Masks(container).capture();
	CanvasRenderingContext2D.prototype.drawImage = draw;
	// The old path decoded the whole SVG and cropped only at drawImage.
	// Keep that independent reference here, never as a production fallback.
	Object.assign(Masks.prototype, {
		flush: async () => {},
		enqueue: async (
			clone: SVGSVGElement,
			x: number,
			y: number,
			mask: InkMask,
			styles: string,
			ratio: number,
		) => {
			const { width, height } = mask;
			const style = document.createElementNS(
				'http://www.w3.org/2000/svg',
				'style',
			);
			style.textContent = styles;
			clone.appendChild(style);
			const image = new Image();
			image.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(new XMLSerializer().serializeToString(clone))))}`;
			await image.decode();
			const canvas = document.createElement('canvas');
			canvas.width = width;
			canvas.height = height;
			const context = canvas.getContext('2d');
			if (!context) {
				throw new Error('missing context');
			}
			context.drawImage(
				image,
				-x,
				-y,
				Number(clone.getAttribute('width')) * ratio,
				Number(clone.getAttribute('height')) * ratio,
			);
			const rgba = context.getImageData(0, 0, width, height).data;
			const runs: number[] = [];
			let start = -1;
			for (let i = 0; i <= width * height; i++) {
				const ink = i < width * height && (rgba[i * 4 + 3] ?? 0) >= 128;
				if (ink && start < 0) {
					start = i;
				} else if (!ink && start >= 0) {
					runs.push(start, i - start);
					start = -1;
				}
			}
			canvas.width = 0;
			image.removeAttribute('src');
			mask.runs = runs;
		},
	});
	// Very tall SVG decoding was unreliable in the old path. Compare the
	// ordinary viewport and assert the distant ink separately below.
	container.querySelectorAll('svg')[1]?.remove();
	return {
		masks,
		reference: await new Masks(container).capture(),
		largest,
	};
}
