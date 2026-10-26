import { PNG } from 'pngjs';
import type { Finding } from './render-lint';

/** The render with a red box round each finding, so a reader finds the problem in the
 * picture rather than translating a pixel box in their head. */
export function markFindings(png: Buffer, findings: Finding[]): Buffer {
	const image = PNG.sync.read(png);
	for (const finding of findings) {
		const left = Math.max(0, Math.floor(finding.box.left) - INSET);
		const top = Math.max(0, Math.floor(finding.box.top) - INSET);
		const right = Math.min(
			image.width - 1,
			Math.ceil(finding.box.right) + INSET,
		);
		const bottom = Math.min(
			image.height - 1,
			Math.ceil(finding.box.bottom) + INSET,
		);
		for (let x = left; x <= right; x++) {
			for (let t = 0; t < THICKNESS; t++) {
				paint(image, x, top + t);
				paint(image, x, bottom - t);
			}
		}
		for (let y = top; y <= bottom; y++) {
			for (let t = 0; t < THICKNESS; t++) {
				paint(image, left + t, y);
				paint(image, right - t, y);
			}
		}
	}
	return PNG.sync.write(image);
}

// The box stands off the ink it marks, so the mark never hides what it points at.
const INSET = 4;
const THICKNESS = 2;

function paint(image: PNG, x: number, y: number): void {
	if (x < 0 || y < 0 || x >= image.width || y >= image.height) {
		return;
	}
	const at = (y * image.width + x) * 4;
	image.data[at] = 229;
	image.data[at + 1] = 57;
	image.data[at + 2] = 53;
	image.data[at + 3] = 255;
}
