import { describe, expect, it } from 'bun:test';
import { PNG } from 'pngjs';
import type { RawEngraving } from './engraving-collect';
import {
	EngravingMarks,
	formatSpaces,
	renderMarkedImage,
} from './engraving-marks';
import { applyPassFlags } from './engraving-matcher';
import { Engraving, stemLength } from './engraving-model';

describe('engraving marks', () => {
	it('formats quarter stave-spaces with vulgar fractions', () => {
		expect([
			formatSpaces(3.5),
			formatSpaces(3.25),
			formatSpaces(3.75),
			formatSpaces(4),
			formatSpaces(0.5),
			formatSpaces(-1.25),
		]).toEqual(['3½', '3¼', '3¾', '4', '½', '-1¼']);
	});

	it('deduplicates reference marks and shifts score coordinates into screenshot pixels', () => {
		const marks = new EngravingMarks();
		marks.reference('middle-line:100', {
			kind: 'line',
			from: { x: 10, y: 100 },
			to: { x: 200, y: 100 },
			label: 'middle line',
		});
		marks.reference('middle-line:100', {
			kind: 'line',
			from: { x: 10, y: 100 },
			to: { x: 200, y: 100 },
			label: 'middle line',
		});
		marks.measure({
			kind: 'bracket',
			from: { x: 50, y: 90 },
			to: { x: 50, y: 125 },
			label: '3½',
		});
		expect(marks.toScreenshot({ x: 12, y: 8 })).toEqual([
			{
				kind: 'line',
				role: 'reference',
				from: { x: 22, y: 108 },
				to: { x: 212, y: 108 },
				label: 'middle line',
			},
			{
				kind: 'bracket',
				role: 'measure',
				from: { x: 62, y: 98 },
				to: { x: 62, y: 133 },
				label: '3½',
			},
		]);
	});

	it('records stem brackets and one middle line while measuring, undone by maskShift', () => {
		const raw = syntheticRaw({ shiftX: 15, shiftY: 10 });
		const engraving = new Engraving(raw, { rule: 'stem-length' });
		const lengths = engraving.headsIn(0).map((note) => stemLength(note));

		expect(lengths).toEqual([35, 35]);
		expect(engraving.exportMarks()).toEqual([
			{
				kind: 'bracket',
				role: 'measure',
				from: { x: 59, y: 95 },
				to: { x: 59, y: 130 },
				label: '3½',
				note: 'C/5 down-stem: 3½ spaces from notehead centre to stem tip',
			},
			{
				kind: 'line',
				role: 'reference',
				from: { x: 25, y: 110 },
				to: { x: 235, y: 110 },
				label: 'middle line',
				note: 'Middle stave line',
			},
			{
				kind: 'bracket',
				role: 'measure',
				from: { x: 147, y: 125 },
				to: { x: 147, y: 90 },
				label: '3½',
				note: 'A/4 up-stem: 3½ spaces from notehead centre to stem tip',
			},
		]);
	});

	it('tags each measurement mark with its own pass flag when leaf counts align', () => {
		const marks = [
			{
				kind: 'line' as const,
				role: 'reference' as const,
				from: { x: 0, y: 50 },
				to: { x: 100, y: 50 },
				label: 'middle line',
			},
			{
				kind: 'bracket' as const,
				role: 'measure' as const,
				from: { x: 20, y: 40 },
				to: { x: 20, y: 75 },
				label: '3½',
				note: 'C/5 down-stem: 3½ spaces',
			},
			{
				kind: 'bracket' as const,
				role: 'measure' as const,
				from: { x: 60, y: 40 },
				to: { x: 60, y: 70 },
				label: '3',
				note: 'D/5 down-stem: 3 spaces',
			},
		];

		const tagged = applyPassFlags(marks, [[3.5, 3]], [[3.5, 3.5]], false);
		expect(
			tagged.map((m) => ({ role: m.role, pass: m.pass, note: m.note })),
		).toEqual([
			{ role: 'reference', pass: undefined, note: undefined },
			{ role: 'measure', pass: true, note: 'C/5 down-stem: 3½ spaces' },
			{
				role: 'measure',
				pass: false,
				note: 'D/5 down-stem: 3 spaces (expected 3½)',
			},
		]);
	});

	it('draws passing marks in green, failing marks in red, and reference lines in blue', () => {
		const blank = blankPng(160, 120);
		const marked = PNG.sync.read(
			renderMarkedImage(blank, [
				{
					kind: 'line',
					role: 'reference',
					from: { x: 10, y: 60 },
					to: { x: 150, y: 60 },
					label: 'middle line',
				},
				{
					kind: 'bracket',
					role: 'measure',
					from: { x: 40, y: 40 },
					to: { x: 40, y: 80 },
					label: '3½',
					pass: true,
				},
				{
					kind: 'bracket',
					role: 'measure',
					from: { x: 100, y: 40 },
					to: { x: 100, y: 80 },
					label: '3',
					pass: false,
				},
			]),
		);

		expect(marked.width).toBe(160);
		expect(marked.height).toBe(120);
		expect(dominantChannel(pixelAt(marked, 20, 60))).toBe('b');
		expect(dominantChannel(pixelAt(marked, 40, 55))).toBe('g');
		expect(dominantChannel(pixelAt(marked, 100, 55))).toBe('r');
	});
});

interface SyntheticRawOptions {
	shiftX: number;
	shiftY: number;
}

function syntheticRaw(opts: SyntheticRawOptions): RawEngraving {
	const { shiftX, shiftY } = opts;
	return {
		staves: [
			{
				measure: 0,
				lines: [80, 90, 100, 110, 120],
				box: { x: 10, y: 80, w: 210, h: 40 },
			},
		],
		notes: [
			{ measure: 0, pitch: 'C/5', head: { x: 50, y: 80, w: 12, h: 10 } },
			{ measure: 0, pitch: 'A/4', head: { x: 112, y: 110, w: 12, h: 10 } },
		],
		masks: [
			solidMask('notehead', 50 + shiftX, 80 + shiftY, 12, 10),
			solidMask('notehead', 112 + shiftX, 110 + shiftY, 12, 10),
			solidMask('stem', 50 + shiftX, 85 + shiftY, 2, 35),
			solidMask('stem', 124 + shiftX, 80 + shiftY, 2, 35),
		],
	};
}

function solidMask(kind: string, x: number, y: number, w: number, h: number) {
	return { kind, x, y, width: w, runs: [0, w * h] };
}

function blankPng(width: number, height: number): Buffer {
	const png = new PNG({ width, height });
	png.data.fill(255);
	return PNG.sync.write(png);
}

function pixelAt(png: PNG, x: number, y: number): [number, number, number] {
	const at = (y * png.width + x) * 4;
	return [png.data[at] ?? 0, png.data[at + 1] ?? 0, png.data[at + 2] ?? 0];
}

function dominantChannel([r, g, b]: [number, number, number]): 'r' | 'g' | 'b' {
	if (r > g && r > b) {
		return 'r';
	}
	if (g > r && g > b) {
		return 'g';
	}
	return 'b';
}
