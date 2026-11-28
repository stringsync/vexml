import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import * as path from 'node:path';
import type { RawEngraving } from './engraving-collect';
import { MARKS_DIR } from './engraving-matcher';
import type { Engraving } from './engraving-model';

export interface GeometryMeasure {
	index: number;
	system: number;
	x: number;
	w: number;
}

export interface GeometryStave {
	part: number;
	measure: number;
	staff: number;
	lines: number[];
	x: number;
	w: number;
}

export interface EngravingGeometry {
	screenshot: string;
	measures: GeometryMeasure[];
	staves: GeometryStave[];
}

/** Builds the screenshot-pixel geometry snapshot for an engraving render. */
export function buildGeometry(
	file: string,
	engraving: Engraving,
): EngravingGeometry {
	const { x: dx, y: dy } = engraving.shift;
	const raw: RawEngraving = engraving.raw;
	const round = (v: number) => Math.round(v * 100) / 100 || 0;
	return {
		screenshot: `engraving_${file}.png`,
		measures: (raw.measures ?? []).map((m) => ({
			index: m.index,
			system: m.system,
			x: round(m.rect.x + dx),
			w: round(m.rect.w),
		})),
		staves: raw.staves.map((s) => ({
			part: s.part ?? 0,
			measure: s.measure,
			staff: s.staff ?? 1,
			lines: s.lines.map((y) => round(y + dy)),
			x: round(s.box.x + dx),
			w: round(s.box.w),
		})),
	};
}

/**
 * Formats an engraving geometry snapshot to match Biome's JSON formatting
 * (tabs, inline measure objects and stave line arrays, trailing newline).
 */
export function formatGeometry(geometry: EngravingGeometry): string {
	const measureLines = geometry.measures.map(
		(m) =>
			`{ "index": ${m.index}, "system": ${m.system}, "x": ${m.x}, "w": ${m.w} }`,
	);
	let measuresBlock: string;
	if (measureLines.length === 0) {
		measuresBlock = '\t"measures": [],';
	} else if (
		measureLines.length === 1 &&
		`\t"measures": [${measureLines[0]}],`.replace(/\t/g, '  ').length <= 80
	) {
		measuresBlock = `\t"measures": [${measureLines[0]}],`;
	} else {
		measuresBlock = [
			'\t"measures": [',
			measureLines.map((line) => `\t\t${line}`).join(',\n'),
			'\t],',
		].join('\n');
	}

	let stavesBlock: string;
	if (geometry.staves.length === 0) {
		stavesBlock = '\t"staves": []';
	} else {
		const staveEntries = geometry.staves.map((s) =>
			[
				'\t\t{',
				`\t\t\t"part": ${s.part},`,
				`\t\t\t"measure": ${s.measure},`,
				`\t\t\t"staff": ${s.staff},`,
				`\t\t\t"lines": [${s.lines.join(', ')}],`,
				`\t\t\t"x": ${s.x},`,
				`\t\t\t"w": ${s.w}`,
				'\t\t}',
			].join('\n'),
		);
		stavesBlock = ['\t"staves": [', staveEntries.join(',\n'), '\t]'].join('\n');
	}

	return [
		'{',
		`\t"screenshot": ${JSON.stringify(geometry.screenshot)},`,
		measuresBlock,
		stavesBlock,
		'}',
		'',
	].join('\n');
}

/**
 * Writes `engraving_<fixture>.geometry.json` beside the marks: each measure's span and each
 * stave's lines in screenshot pixels, so `vex rules strip` can crop a check's spot from
 * `engraving_<fixture>.png` without rendering again.
 *
 * Skips rewriting when the existing file on disk already parses to the same geometry.
 * Returns true if the file was written, false if it was left untouched.
 */
export function writeGeometry(
	file: string,
	engraving: Engraving,
	dir = MARKS_DIR,
): boolean {
	const geometry = buildGeometry(file, engraving);
	const filePath = path.join(dir, `engraving_${file}.geometry.json`);
	const existing = readExistingGeometry(filePath);
	if (existing !== null && Bun.deepEquals(existing, geometry)) {
		return false;
	}
	mkdirSync(dir, { recursive: true });
	writeFileSync(filePath, formatGeometry(geometry));
	return true;
}

function readExistingGeometry(filePath: string): unknown | null {
	try {
		return JSON.parse(readFileSync(filePath, 'utf8'));
	} catch {
		return null;
	}
}
