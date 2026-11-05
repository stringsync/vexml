import { describe, expect, it } from 'bun:test';
import type { InkMask } from '@vexml/renderer';
import { type SourceSpan, SpannerReach } from './spanner-reach';

const tolerance = { near: 16, vertical: 100, breakEnd: 48, resume: 120 };
const systems = new Map([
	[0, { x: 0, y: 0, w: 1000, h: 200 }],
	[1, { x: 0, y: 300, w: 1000, h: 200 }],
]);
const ink = (x: number, y: number, width: number, kind = 'slur'): InkMask => ({
	id: x,
	kind,
	x,
	y,
	width,
	height: 30,
	runs: [],
});
const end = (x: number, y: number, system: number) => ({
	box: { x, y, w: 12, h: 10 },
	system,
});
const slur = (start: ReturnType<typeof end>, stop: ReturnType<typeof end>) =>
	({ kind: 'slur', measure: '1', start, stop }) satisfies SourceSpan;

describe('SpannerReach', () => {
	it('passes a slur drawn from its start note to its stop note', () => {
		const report = new SpannerReach(
			[ink(100, 60, 400)],
			systems,
			tolerance,
		).check([slur(end(100, 90, 0), end(490, 90, 0))]);
		expect(report.findings).toEqual([]);
		expect(report.checked.slur).toBe(1);
	});
	it('flags a slur that stops short of its stop note', () => {
		const report = new SpannerReach(
			[ink(100, 60, 200)],
			systems,
			tolerance,
		).check([slur(end(100, 90, 0), end(490, 90, 0))]);
		expect(report.findings.map((f) => f.problem)).toEqual(['stop-missing']);
	});
	it('flags a slur that is not drawn at all', () => {
		const report = new SpannerReach([], systems, tolerance).check([
			slur(end(100, 90, 0), end(490, 90, 0)),
		]);
		expect(report.findings.map((f) => f.problem)).toEqual(['start-missing']);
	});
	it('passes a slur that runs to the system end and resumes after the break', () => {
		const report = new SpannerReach(
			[ink(800, 60, 200), ink(10, 360, 300)],
			systems,
			tolerance,
		).check([slur(end(850, 90, 0), end(290, 390, 1))]);
		expect(report.findings).toEqual([]);
	});
	it('flags a slur that does not wrap to the next system', () => {
		const report = new SpannerReach(
			[ink(800, 60, 100), ink(200, 360, 100)],
			systems,
			tolerance,
		).check([slur(end(850, 90, 0), end(290, 390, 1))]);
		expect(report.findings.map((f) => f.problem)).toEqual([
			'no-break-end',
			'no-resume',
		]);
	});
	it('does not let one slur vouch for two spans', () => {
		const report = new SpannerReach(
			[ink(100, 60, 400)],
			systems,
			tolerance,
		).check([
			slur(end(100, 90, 0), end(490, 90, 0)),
			slur(end(100, 90, 0), end(490, 90, 0)),
		]);
		expect(report.findings).toHaveLength(1);
	});
});

// The resumed segment and outgoing tie both touch the first note of the system.
it('keeps a chained tie available after claiming its incoming resumed segment', () => {
	const spans: SourceSpan[] = [
		{
			kind: 'tie',
			measure: '56',
			start: end(850, 90, 0),
			stop: end(75, 390, 1),
		},
		{
			kind: 'tie',
			measure: '57',
			start: end(75, 390, 1),
			stop: end(386, 390, 1),
		},
	];
	const report = new SpannerReach(
		[
			ink(856, 30, 144, 'tie'),
			ink(61, 330, 20, 'tie'),
			ink(81, 330, 310, 'tie'),
		],
		systems,
		tolerance,
	).check(spans);
	expect(report.findings).toEqual([]);
	expect(report.checked.tie).toBe(2);
});
