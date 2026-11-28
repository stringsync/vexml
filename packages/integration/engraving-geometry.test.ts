import { describe, expect, it } from 'bun:test';
import {
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	statSync,
	utimesSync,
	writeFileSync,
} from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { RawEngraving } from './engraving-collect';
import {
	type EngravingGeometry,
	formatGeometry,
	writeGeometry,
} from './engraving-geometry';
import { MARKS_DIR } from './engraving-matcher';
import { Engraving } from './engraving-model';

describe('writeGeometry', () => {
	it('writes a new Biome-formatted geometry file when none exists', () => {
		withTempDir((dir) => {
			const wrote = writeGeometry('sample', new Engraving(sampleRaw(200)), dir);
			const filePath = path.join(dir, 'engraving_sample.geometry.json');

			expect(wrote).toBe(true);
			expect(readFileSync(filePath, 'utf8')).toBe(
				[
					'{',
					'\t"screenshot": "engraving_sample.png",',
					'\t"measures": [{ "index": 0, "system": 0, "x": 10, "w": 200 }],',
					'\t"staves": [',
					'\t\t{',
					'\t\t\t"part": 0,',
					'\t\t\t"measure": 0,',
					'\t\t\t"staff": 1,',
					'\t\t\t"lines": [80, 90, 100, 110, 120],',
					'\t\t\t"x": 10,',
					'\t\t\t"w": 200',
					'\t\t}',
					'\t]',
					'}',
					'',
				].join('\n'),
			);
		});
	});

	it('skips rewriting when existing geometry matches, leaving the file untouched on disk', () => {
		withTempDir((dir) => {
			const engraving = new Engraving(sampleRaw(200));
			const filePath = path.join(dir, 'engraving_sample.geometry.json');

			expect(writeGeometry('sample', engraving, dir)).toBe(true);
			const past = new Date('2020-01-01T00:00:00.000Z');
			utimesSync(filePath, past, past);
			const before = statSync(filePath).mtimeMs;

			expect(writeGeometry('sample', engraving, dir)).toBe(false);
			expect(statSync(filePath).mtimeMs).toBe(before);
		});
	});

	it('rewrites when computed geometry changes', () => {
		withTempDir((dir) => {
			const filePath = path.join(dir, 'engraving_sample.geometry.json');

			expect(writeGeometry('sample', new Engraving(sampleRaw(200)), dir)).toBe(
				true,
			);
			expect(writeGeometry('sample', new Engraving(sampleRaw(240)), dir)).toBe(
				true,
			);

			const parsed = JSON.parse(
				readFileSync(filePath, 'utf8'),
			) as EngravingGeometry;
			expect(parsed.measures[0]?.w).toBe(240);
			expect(parsed.staves[0]?.w).toBe(240);
		});
	});

	it('rewrites when existing file is invalid JSON', () => {
		withTempDir((dir) => {
			const filePath = path.join(dir, 'engraving_sample.geometry.json');
			writeFileSync(filePath, '{not valid json');

			expect(writeGeometry('sample', new Engraving(sampleRaw(200)), dir)).toBe(
				true,
			);
			const parsed = JSON.parse(
				readFileSync(filePath, 'utf8'),
			) as EngravingGeometry;
			expect(parsed.screenshot).toBe('engraving_sample.png');
		});
	});

	it('matches Biome formatting across all committed geometry files', () => {
		const files = readdirSync(MARKS_DIR).filter((f) =>
			f.endsWith('.geometry.json'),
		);
		expect(files.length).toBeGreaterThan(0);
		const formatted = files.map((file) => {
			const content = readFileSync(path.join(MARKS_DIR, file), 'utf8');
			const parsed = JSON.parse(content) as EngravingGeometry;
			return { file, text: formatGeometry(parsed) };
		});
		const expected = files.map((file) => ({
			file,
			text: readFileSync(path.join(MARKS_DIR, file), 'utf8'),
		}));
		expect(formatted).toEqual(expected);
	});
});

function withTempDir(run: (dir: string) => void): void {
	const dir = mkdtempSync(path.join(os.tmpdir(), 'vexml-geometry-'));
	try {
		run(dir);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}

function sampleRaw(width: number): RawEngraving {
	return {
		measures: [
			{ index: 0, system: 0, rect: { x: 10, y: 80, w: width, h: 40 } },
		],
		staves: [
			{
				measure: 0,
				lines: [80, 90, 100, 110, 120],
				box: { x: 10, y: 80, w: width, h: 40 },
			},
		],
		notes: [],
		masks: [],
	};
}
