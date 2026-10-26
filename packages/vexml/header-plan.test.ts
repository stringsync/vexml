import { describe, expect, it } from 'bun:test';
import { type Config, DEFAULT_CONFIG } from './config';
import {
	HEADER_CREDIT_SIZE,
	HEADER_TITLE_SIZE,
	PAGE_MARGIN_X,
} from './constants';
import { HeaderPlan } from './header-plan';
import type { ScoreHeader } from './score-reader';

describe('HeaderPlan', () => {
	const header: ScoreHeader = {
		title: 'Air',
		subtitles: ['BWV 1068'],
		left: ['Anon.'],
		right: ['J. S. Bach', 'arr. A. Arranger'],
		symbols: [],
		footer: [],
	};
	const on: Config = { ...DEFAULT_CONFIG, showHeader: true };

	it('plans nothing while the header is off, empty, or panoramic', () => {
		expect(HeaderPlan.of(DEFAULT_CONFIG, header)).toBeNull();
		expect(HeaderPlan.of(on, null)).toBeNull();
		expect(
			HeaderPlan.of(
				{
					...on,
					layout: {
						type: 'panoramic',
						scale: 1,
						stickySignatures: false,
						fitHeight: null,
					},
				},
				header,
			),
		).toBeNull();
	});

	it('centers the title and subtitles, then hangs the side columns under them', () => {
		const lines = HeaderPlan.of(on, header)?.lines(800) ?? [];
		expect(lines.map(({ text, align, x }) => ({ text, align, x }))).toEqual([
			{ text: 'Air', align: 'center', x: 400 },
			{ text: 'BWV 1068', align: 'center', x: 400 },
			{ text: 'Anon.', align: 'left', x: PAGE_MARGIN_X },
			{ text: 'J. S. Bach', align: 'right', x: 800 - PAGE_MARGIN_X },
			{ text: 'arr. A. Arranger', align: 'right', x: 800 - PAGE_MARGIN_X },
		]);
		expect(lines[0]).toMatchObject({
			baseline: HEADER_TITLE_SIZE,
			weight: 'bold',
		});
		// The left and right columns share their rows.
		expect(lines[2]?.baseline).toBe(lines[3]?.baseline);
		expect(
			(lines[4]?.baseline ?? 0) - (lines[3]?.baseline ?? 0),
		).toBeGreaterThan(HEADER_CREDIT_SIZE);
	});

	it('reaches below its lowest baseline, by the line descent', () => {
		const plan = HeaderPlan.of(on, header);
		const last = plan?.lines(800).at(-1)?.baseline ?? 0;
		expect(plan?.height).toBeGreaterThan(last);
	});
});
