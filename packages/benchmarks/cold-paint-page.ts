import { paint, type ScoreSnapshot } from '@stringsync/vexml/paint';

/*
 * cold-page.ts's paint path alone, in a bundle holding only @stringsync/vexml/paint, which is
 * how a page would load it ahead of the app. Keep the two in step.
 */

declare global {
	interface Window {
		coldResult: Promise<{ firstPaintMs: number; fetchedMs: number }>;
	}
}

const sampler = document.createElement('canvas');
sampler.width = 64;
sampler.height = 64;
const sampling = sampler.getContext('2d', { willReadFrequently: true });

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

window.coldResult = (async () => {
	const container = document.getElementById('score');
	if (!(container instanceof HTMLDivElement)) {
		throw new Error('no #score');
	}
	const painted = new Promise<number>((resolve) => {
		const tick = () => {
			if (inked(container)) {
				resolve(performance.now());
			} else {
				requestAnimationFrame(tick);
			}
		};
		requestAnimationFrame(tick);
	});
	const snapshot: ScoreSnapshot = await (await fetch('/input')).json();
	const fetchedMs = performance.now();
	paint(snapshot, container, {});
	return { firstPaintMs: await painted, fetchedMs };
})();
