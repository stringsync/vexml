import { type ConfigInput, render } from '@stringsync/vexml';

/*
 * The browser side of cold-first-paint.ts, bundled for the render paths (cold-paint-page.ts is the paint path): the page loads, fetches its
 * input from the server, and reports when the first non-blank notation reached a canvas, in
 * ms since navigation start (so script download and the fetch are in the number).
 */

type Path = 'render' | 'progressive';

declare global {
	interface Window {
		coldResult: Promise<{ firstPaintMs: number; fetchedMs: number }>;
	}
}

const sampler = document.createElement('canvas');
sampler.width = 64;
sampler.height = 64;
const sampling = sampler.getContext('2d', { willReadFrequently: true });

// Inked: some canvas in the container has a pixel that is neither transparent nor white.
function inked(container: HTMLElement): boolean {
	if (!sampling) {
		throw new Error('no 2d context to sample with');
	}
	for (const canvas of container.querySelectorAll('canvas')) {
		if (canvas.width === 0 || canvas.height === 0) {
			continue;
		}
		sampling.clearRect(0, 0, 64, 64);
		sampling.drawImage(canvas, 0, 0, 64, 64);
		const { data } = sampling.getImageData(0, 0, 64, 64);
		for (let i = 0; i < data.length; i += 4) {
			const [r = 255, g = 255, , a = 0] = data.subarray(i, i + 4);
			if (a > 0 && (r < 250 || g < 250)) {
				return true;
			}
		}
	}
	return false;
}

function firstInk(container: HTMLElement): Promise<number> {
	return new Promise((resolve) => {
		const tick = () => {
			if (inked(container)) {
				resolve(performance.now());
			} else {
				requestAnimationFrame(tick);
			}
		};
		requestAnimationFrame(tick);
	});
}

async function run(path: Path) {
	const container = document.getElementById('score');
	if (!(container instanceof HTMLDivElement)) {
		throw new Error('no #score');
	}
	const config: ConfigInput = { progressive: path === 'progressive' };
	const painted = firstInk(container);
	const musicXML = await (await fetch('/input')).text();
	const fetchedMs = performance.now();
	void render(musicXML, container, config);
	return { firstPaintMs: await painted, fetchedMs };
}

window.coldResult = run(
	new URLSearchParams(location.search).get('path') as Path,
);
