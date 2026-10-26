import { describe, expect, it } from 'bun:test';
import { InkMap } from './ink-map';
import { StaffDetector } from './staff-detector';

describe('StaffDetector', () => {
	it('finds five evenly spaced lines as one staff', () => {
		const ink = InkMap.fromRows(canvas(40, 20, staff(2, 0, 40, 4)));
		const groups = new StaffDetector(ink).groups();
		expect(groups.map((g) => g.lines.map((l) => l.y))).toEqual([
			[2, 6, 10, 14, 18],
		]);
	});

	it('merges a thick line into one at its center', () => {
		const rows = canvas(40, 10, [
			...line(2, 0, 40),
			...line(3, 0, 40),
			...line(7, 0, 40),
			...line(8, 0, 40),
		]);
		const lines = new StaffDetector(InkMap.fromRows(rows)).lines();
		expect(lines.map((l) => l.y)).toEqual([2.5, 7.5]);
	});

	it('splits two staves a system apart into two groups', () => {
		const rows = canvas(40, 60, [
			...staff(2, 0, 40, 4),
			...staff(40, 0, 40, 4),
		]);
		const groups = new StaffDetector(InkMap.fromRows(rows)).groups();
		expect(groups.map((g) => g.lines.length)).toEqual([5, 5]);
	});

	it('splits a group where the spacing changes', () => {
		const rows = canvas(40, 60, [
			...staff(2, 0, 40, 4),
			...staff(27, 0, 40, 7),
		]);
		const groups = new StaffDetector(InkMap.fromRows(rows)).groups();
		expect(groups.map((g) => g.lines.map((l) => l.y))).toEqual([
			[2, 6, 10, 14, 18],
			[27, 34, 41, 48, 55],
		]);
	});

	it('gives a line where two spacings meet to the longer run', () => {
		const rows = canvas(40, 40, [[2, 0, 40], ...staff(11, 0, 40, 4)]);
		const groups = new StaffDetector(InkMap.fromRows(rows)).groups();
		expect(groups.map((g) => g.lines.map((l) => l.y))).toEqual([
			[2],
			[11, 15, 19, 23, 27],
		]);
	});

	it('ignores a long run well short of the staff width', () => {
		const rows = canvas(100, 30, [...staff(2, 0, 100, 4), ...line(26, 10, 40)]);
		const lines = new StaffDetector(InkMap.fromRows(rows)).lines();
		expect(lines.map((l) => l.y)).toEqual([2, 6, 10, 14, 18]);
	});

	it('keeps a staff line that fret numbers break into pieces', () => {
		const rows = canvas(100, 30, staff(2, 0, 100, 4)).map((row, y) =>
			y === 10
				? `${row.slice(0, 30)}...${row.slice(33, 60)}...${row.slice(63)}`
				: row,
		);
		const lines = new StaffDetector(InkMap.fromRows(rows)).lines();
		expect(lines.map((l) => l.y)).toEqual([2, 6, 10, 14, 18]);
	});

	it('keeps only the staff lines when beam rows outnumber them', () => {
		const beams = [21, 22, 23, 24, 25, 26, 27, 28].map(
			(y) => [y, 0, 25] as Stroke,
		);
		const rows = canvas(100, 30, [...staff(2, 0, 100, 4), ...beams]);
		const lines = new StaffDetector(InkMap.fromRows(rows)).lines();
		expect(lines.map((l) => l.y)).toEqual([2, 6, 10, 14, 18]);
	});

	it('drops a line thicker than a staff line, which is a beam', () => {
		const beam = [22, 23, 24, 25, 26].map((y) => [y, 0, 100] as Stroke);
		const rows = canvas(100, 30, [...staff(2, 0, 100, 4), ...beam]);
		const lines = new StaffDetector(InkMap.fromRows(rows)).lines();
		expect(lines.map((l) => l.y)).toEqual([2, 6, 10, 14, 18]);
	});

	it('ignores a short run even when it is the only one', () => {
		const rows = canvas(100, 10, line(5, 10, 20));
		expect(new StaffDetector(InkMap.fromRows(rows)).lines()).toEqual([]);
	});

	it('boxes a group by its lines', () => {
		const ink = InkMap.fromRows(canvas(40, 20, staff(2, 5, 35, 4)));
		const [group] = new StaffDetector(ink).groups();
		expect(group?.box).toMatchObject({ x: 5, y: 2, w: 30, h: 16 });
	});
});

type Stroke = [y: number, start: number, end: number];

function line(y: number, start: number, end: number): Stroke[] {
	return [[y, start, end]];
}

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
