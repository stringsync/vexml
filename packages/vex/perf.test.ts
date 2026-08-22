import { describe, expect, it } from 'bun:test';
import { type Row, table } from './perf';

function row(name: string, ...times: Array<number | string>): Row {
	return {
		name,
		cells: times.map((time) =>
			typeof time === 'number'
				? { ms: time, size: '100x200' }
				: { error: time },
		),
	};
}

describe('table', () => {
	it('gives every column the width of its widest cell', () => {
		const lines = table([row('a', 1, 2, 3), row('bbbb', 4, 5, 6)]).split('\n');
		const widths = new Set(lines.map((line) => line.length));
		expect(widths.size).toBe(1);
	});

	it('reports a mean per engine', () => {
		const lines = table([row('a', 10, 20, 30), row('b', 30, 40, 50)]).split(
			'\n',
		);
		expect(lines.at(-1)).toContain('20ms');
		expect(lines.at(-1)).toContain('30ms');
		expect(lines.at(-1)).toContain('40ms');
	});

	it('averages only the renders that worked', () => {
		const lines = table([row('a', 10, 1, 1), row('b', 'boom', 1, 1)]).split(
			'\n',
		);
		expect(lines.at(-1)).toContain('10ms');
	});

	it('says so in the cell when an engine failed', () => {
		expect(table([row('a', 'boom\nat frame', 1, 1)])).toContain('error: boom');
	});

	it('has no mean for an engine that failed everywhere', () => {
		const lines = table([row('a', 'boom', 1, 1)]).split('\n');
		expect(lines.at(-1)).toMatch(/\|\s-\s+\|/);
	});
});
