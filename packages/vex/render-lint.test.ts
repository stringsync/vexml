import { describe, expect, it } from 'bun:test';
import { InkMap } from './ink-map';
import { RenderLint } from './render-lint';

describe('RenderLint', () => {
	it('scores a blank render zero', () => {
		const report = new RenderLint(InkMap.fromRows(['....', '....'])).lint();
		expect(report.score).toBe(0);
		expect(report.findings.map((f) => f.kind)).toEqual(['blank']);
	});

	it('scores a clean staff a hundred', () => {
		const report = new RenderLint(
			InkMap.fromRows(canvas(40, 24, staff(4, 2, 38, 4))),
		).lint();
		expect(report).toEqual({ score: 100, findings: [] });
	});

	it('flags ink on the right edge as clipped, with where', () => {
		const rows = canvas(40, 24, [
			...staff(4, 2, 38, 4),
			[9, 36, 40],
			[10, 36, 40],
		]);
		const report = new RenderLint(InkMap.fromRows(rows)).lint();
		expect(report.findings).toEqual([
			expect.objectContaining({
				kind: 'clipped',
				box: expect.objectContaining({ x: 39, y: 9, w: 1, h: 2 }),
			}),
		]);
		expect(report.score).toBe(85);
	});

	it('flags ink on the top edge separately from the bottom', () => {
		const rows = canvas(40, 24, [
			...staff(4, 2, 38, 4),
			[0, 10, 14],
			[23, 20, 22],
		]);
		const kinds = new RenderLint(InkMap.fromRows(rows)).lint().findings;
		expect(kinds.map((f) => f.message)).toEqual([
			'ink runs off the top edge over 4px',
			'ink runs off the bottom edge over 2px',
		]);
	});

	it('merges edge runs a few pixels apart into one clip', () => {
		const rows = canvas(40, 24, [
			...staff(4, 2, 38, 4),
			[0, 10, 12],
			[0, 14, 16],
		]);
		const findings = new RenderLint(InkMap.fromRows(rows)).lint().findings;
		expect(findings.map((f) => f.box.w)).toEqual([6]);
	});

	it('accepts a staff of any line count, which the score decides', () => {
		const rows = canvas(40, 24, staff(4, 2, 38, 4).slice(0, 2));
		expect(new RenderLint(InkMap.fromRows(rows)).lint().findings).toEqual([]);
	});

	it('accepts a six-line tab staff', () => {
		const rows = canvas(40, 30, [...staff(4, 2, 38, 4), [24, 2, 38]]);
		expect(new RenderLint(InkMap.fromRows(rows)).lint().findings).toEqual([]);
	});

	it('flags two staves closer than a staff space as colliding', () => {
		const rows = canvas(40, 100, [
			...staff(4, 2, 38, 10),
			...staff(50, 2, 38, 10),
		]);
		const report = new RenderLint(InkMap.fromRows(rows)).lint();
		expect(report.findings.map((f) => f.kind)).toEqual(['staves-collide']);
		expect(report.findings[0]?.box).toMatchObject({ y: 4, h: 86 });
	});

	it('accepts two staves a staff space or more apart', () => {
		const rows = canvas(40, 110, [
			...staff(4, 2, 38, 10),
			...staff(60, 2, 38, 10),
		]);
		expect(new RenderLint(InkMap.fromRows(rows)).lint().findings).toEqual([]);
	});

	it('flags a staff drawn into its neighbor as stray lines on each', () => {
		const rows = canvas(40, 80, [
			...staff(4, 2, 38, 10),
			...staff(27, 2, 38, 10),
		]);
		const report = new RenderLint(InkMap.fromRows(rows)).lint();
		// Where the staves interleave, the lines keep no spacing and fall out of any run.
		expect(report.findings.map((f) => f.box.y)).toEqual([27, 34, 37, 44]);
		expect(new Set(report.findings.map((f) => f.kind))).toEqual(
			new Set(['stray-line']),
		);
	});

	it('flags a lone line within a staff space of a staff', () => {
		const rows = canvas(40, 60, [...staff(4, 2, 38, 10), [50, 2, 38]]);
		const report = new RenderLint(InkMap.fromRows(rows)).lint();
		expect(report.findings.map((f) => f.kind)).toEqual(['stray-line']);
	});

	it('leaves a lone line more than a staff space from any staff alone', () => {
		const rows = canvas(40, 80, [...staff(4, 2, 38, 10), [70, 2, 38]]);
		expect(new RenderLint(InkMap.fromRows(rows)).lint().findings).toEqual([]);
	});
});

type Stroke = [y: number, start: number, end: number];

function staff(
	top: number,
	start: number,
	end: number,
	space: number,
): Stroke[] {
	return [0, 1, 2, 3, 4].map((i) => [top + i * space, start, end]);
}

function canvas(width: number, height: number, strokes: Stroke[]): string[] {
	const rows = Array.from({ length: height }, () =>
		'.'.repeat(width).split(''),
	);
	for (const [y, start, end] of strokes) {
		for (let x = start; x < end; x++) {
			rows[y]?.splice(x, 1, '#');
		}
	}
	return rows.map((row) => row.join(''));
}
