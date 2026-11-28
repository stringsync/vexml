import { describe, expect, it } from 'bun:test';
import { FakeFs } from 'core/system/testing';
import { PNG } from 'pngjs';
import { BookCropper, detectStaffSpace } from './rule-book';

describe('detectStaffSpace', () => {
	it('measures the vertical spacing of a five-line stave', () => {
		const png = makeStavePng(120, 90, [20, 31, 42, 53, 64]);
		expect(detectStaffSpace(png)).toBeCloseTo(11, 1);
	});

	it('handles sub-pixel-aligned thick staff lines', () => {
		const png = makeStavePng(100, 80, [15, 24, 33, 42, 51], 2);
		const space = detectStaffSpace(png);
		expect(space).not.toBeNull();
		expect(space ?? 0).toBeCloseTo(9, 0.6);
	});

	it('returns null when no five-line stave is present', () => {
		const blank = new PNG({ width: 80, height: 60 });
		blank.data.fill(255);
		expect(detectStaffSpace(blank)).toBeNull();
	});
});

describe('BookCropper', () => {
	it('crops the fractional box from the print page image and detects its staff space', async () => {
		const fs = new FakeFs();
		await fs.write(
			'/book/index.json',
			JSON.stringify({
				pages: [{ pdf: 25, label: '5' }],
			}),
		);
		const page = makeStavePng(200, 300, [200, 210, 220, 230, 240]);
		await fs.writeBytes('/book/pages/page-025.png', PNG.sync.write(page));

		const cropper = new BookCropper(fs, '/book');
		const result = await cropper.crop({
			page: '5',
			x: 0.25,
			y: 0.6,
			w: 0.5,
			h: 0.3,
		});
		expect(result).not.toBeNull();
		expect(result?.width).toBe(100);
		expect(result?.height).toBe(90);
		expect(result?.space).toBeCloseTo(10, 1);
		const decoded = PNG.sync.read(result?.png as Buffer);
		expect(decoded.width).toBe(100);
		expect(decoded.height).toBe(90);
	});

	it('returns null when the book directory or page image is missing', async () => {
		const fs = new FakeFs();
		const cropper = new BookCropper(fs, '/missing-book');
		expect(
			await cropper.crop({ page: '5', x: 0.1, y: 0.1, w: 0.2, h: 0.2 }),
		).toBeNull();
	});
});

function makeStavePng(
	width: number,
	height: number,
	lines: number[],
	thickness = 1,
): PNG {
	const png = new PNG({ width, height });
	png.data.fill(255);
	for (const lineY of lines) {
		for (let dy = 0; dy < thickness; dy++) {
			const y = lineY + dy;
			if (y < 0 || y >= height) {
				continue;
			}
			for (let x = 4; x < width - 4; x++) {
				const i = (y * width + x) * 4;
				png.data[i] = 30;
				png.data[i + 1] = 30;
				png.data[i + 2] = 30;
				png.data[i + 3] = 255;
			}
		}
	}
	return png;
}
