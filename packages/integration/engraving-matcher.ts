import { expect } from 'bun:test';
import { mkdirSync, writeFileSync } from 'node:fs';
import * as path from 'node:path';
import { PNG } from 'pngjs';
import {
	type EngravingMark,
	type EngravingMarksFile,
	formatSpaces,
	renderMarkedImage,
} from './engraving-marks';
import { Engraving, type EngravingCheck } from './engraving-model';

const ROOT = path.resolve(import.meta.dir, '../..');

/** Where engraving checks write `.marks.json` and `.marked.png` beside `__screenshots__/`. */
export const MARKS_DIR = path.resolve(import.meta.dir, './__marks__');

/** Tags each measurement mark with whether its value matched `expected`. */
export function applyPassFlags(
	marks: EngravingMark[],
	actual: unknown,
	expected: unknown,
	overallPass: boolean,
): EngravingMark[] {
	const actualLeaves = collectLeaves(actual);
	const expectedLeaves = collectLeaves(expected);
	const measureCount = marks.filter((m) => m.role === 'measure').length;
	const perLeaf =
		measureCount > 0 &&
		measureCount === actualLeaves.length &&
		actualLeaves.length === expectedLeaves.length;

	let measureIndex = 0;
	return marks.map((mark) => {
		if (mark.role !== 'measure') {
			return { ...mark };
		}
		const idx = measureIndex++;
		if (mark.pass !== undefined) {
			return { ...mark };
		}
		if (!perLeaf) {
			return { ...mark, pass: overallPass };
		}
		const got = actualLeaves[idx];
		const want = expectedLeaves[idx];
		const pass = Object.is(got, want);
		if (!pass && typeof want === 'number' && mark.note) {
			return {
				...mark,
				pass,
				note: `${mark.note} (expected ${formatSpaces(want)})`,
			};
		}
		return { ...mark, pass };
	});
}

/** Writes `engraving_<rule>.marks.json` and `engraving_<rule>.marked.png` into `dir`. */
export function writeEngravingMarks(
	engraving: Engraving,
	marks: EngravingMark[],
	dir = MARKS_DIR,
): { jsonPath: string; pngPath: string } | null {
	if (!engraving.rule || !engraving.image) {
		return null;
	}
	const base = `engraving_${engraving.rule}`;
	const decoded = PNG.sync.read(engraving.image);
	const payload: EngravingMarksFile = {
		screenshot: `${base}.png`,
		width: decoded.width,
		height: decoded.height,
		marks,
	};
	mkdirSync(dir, { recursive: true });
	const jsonPath = path.join(dir, `${base}.marks.json`);
	const pngPath = path.join(dir, `${base}.marked.png`);
	writeFileSync(jsonPath, `${JSON.stringify(payload, null, '\t')}\n`);
	writeFileSync(pngPath, renderMarkedImage(engraving.image, marks));
	return { jsonPath, pngPath };
}

expect.extend({
	/** Asserts an engraving check's measured values and writes its marks and marked PNG. */
	toMatchMeasurements(received: unknown, expected: unknown) {
		if (!isEngravingCheck(received)) {
			return {
				pass: false,
				message: () =>
					'toMatchMeasurements expects a value returned by engraving.check(...)',
			};
		}
		const pass = Bun.deepEquals(received.value, expected);
		const marks = applyPassFlags(
			received.engraving.exportMarks(),
			received.value,
			expected,
			pass,
		);
		const written = writeEngravingMarks(received.engraving, marks);
		return {
			pass,
			message: () => {
				const hint = written
					? `\nMarked render: ${path.relative(ROOT, written.pngPath)}`
					: '';
				return `expected ${JSON.stringify(received.value)} to equal ${JSON.stringify(expected)}${hint}`;
			},
		};
	},
});

declare module 'bun:test' {
	interface Matchers {
		toMatchMeasurements(expected: unknown): void;
	}
}

function isEngravingCheck(value: unknown): value is EngravingCheck<unknown> {
	return (
		typeof value === 'object' &&
		value !== null &&
		'engraving' in value &&
		'value' in value &&
		(value as { engraving: unknown }).engraving instanceof Engraving
	);
}

function collectLeaves(value: unknown): unknown[] {
	if (Array.isArray(value)) {
		return value.flatMap(collectLeaves);
	}
	return [value];
}
