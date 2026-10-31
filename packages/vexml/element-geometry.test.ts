import { describe, expect, it } from 'bun:test';
import { renderedScore } from './render-harness';
import type { Score } from './score';

describe('structural element geometry', () => {
	it('resolves a point in each staff column to that part only', async () => {
		const { score } = await renderedScore('structure_two_parts.musicxml');
		const measures = score.getElements().measures();
		expect(measures).toHaveLength(2);
		// vet-ignore matchers-over-test-logic: the loop walks every case of a table, and a matcher would hide which one failed
		for (const measure of measures) {
			const point = center(measure.rect);
			expect(score.getElements().at(point)).toBe(measure);
			const hits = score.getElements().allAt(point);
			expect(hits).toContain(measure);
			expect(hits).toContain(measure.getBox());
			expect(hits).not.toContain(
				measures.find((candidate) => candidate !== measure),
			);
		}
	});

	it('hits middle and implicit right barlines with their document provenance', async () => {
		const { score, document } = await renderedScore(
			'barline_mid_measure.musicxml',
		);
		const middle = only(
			score
				.getElements()
				.barlines()
				.filter((barline) => barline.getLocation() === 'middle'),
			'middle barline',
		);
		const right = only(
			score
				.getElements()
				.barlines()
				.filter((barline) => barline.getLocation() === 'right'),
			'right barline',
		);
		expect(score.getElements().at(center(middle.rect))).toBe(middle);
		expect(score.getElements().at(center(right.rect))).toBe(right);
		expect(score.getTimeAt(center(middle.rect))).not.toBeNull();
		expect(score.getTimeAt(center(right.rect))).not.toBeNull();
		expect(
			score.getTimeAt({
				x: middle.getMeasure().rect.x + middle.getMeasure().rect.w / 4,
				y: center(middle.getMeasure().rect).y,
			}),
		).not.toBeNull();
		expect(middle.getSources()).toEqual([
			only(
				document?.score.parts[0]?.measures[0]?.barlines.filter(
					(barline) => barline.location === 'middle',
				) ?? [],
				'middle source',
			),
		]);
		expect(right.getSources()).toEqual([]);
	});

	it('hits explicit repeat edges and ordinary implicit edges', async () => {
		const { score } = await renderedScore('repeats.musicxml');
		const barlines = score.getElements().barlines();
		const forward = barlines.find(
			(barline) =>
				barline.getLocation() === 'left' &&
				barline.getSources()[0]?.repeat === 'forward',
		);
		const backward = barlines.find(
			(barline) =>
				barline.getLocation() === 'right' &&
				barline.getSources()[0]?.repeat === 'backward',
		);
		const implicit = barlines.find(
			(barline) =>
				barline.getLocation() === 'right' && barline.getSources().length === 0,
		);
		expect(forward).toBeDefined();
		expect(backward).toBeDefined();
		expect(implicit).toBeDefined();
		// vet-ignore matchers-over-test-logic: the loop walks every case of a table, and a matcher would hide which one failed
		for (const barline of [forward, backward, implicit]) {
			// vet-ignore matchers-over-test-logic: the loop walks every case of a table, and a matcher would hide which one failed
			if (barline) {
				expect(score.getElements().at(center(barline.rect))).toBe(barline);
			}
		}
	});

	it('resolves barlines on every wrapped system', async () => {
		const { score } = await renderedScore('print_new_system.musicxml');
		const systems = score.getSystems();
		expect(systems.length).toBeGreaterThan(1);
		// vet-ignore matchers-over-test-logic: the loop walks every case of a table, and a matcher would hide which one failed
		for (const system of systems) {
			const box = only(system.getMeasureBoxes().slice(0, 1), 'system measure');
			const measure = only(box.getMeasures(), 'part measure');
			const right = only(
				score
					.getElements()
					.barlines()
					.filter(
						(barline) =>
							barline.getMeasure() === measure &&
							barline.getLocation() === 'right',
					),
				'system right barline',
			);
			expect(score.getElements().at(center(right.rect))).toBe(right);
		}
	});

	it('matches whole-render barlines after progressive drawing and snapshot replay', async () => {
		const whole = await renderedScore('print_new_system.musicxml');
		const progressive = await renderedScore(
			'print_new_system.musicxml',
			{ progressive: true },
			0,
		);
		progressive.scheduler.runAll();
		expect(barlineGeometry(progressive.score)).toEqual(
			barlineGeometry(whole.score),
		);

		const restored = await renderedScore(whole.score.snapshot());
		expect(barlineGeometry(restored.score)).toEqual(
			barlineGeometry(whole.score),
		);
		// vet-ignore matchers-over-test-logic: the loop walks every case of a table, and a matcher would hide which one failed
		for (const barline of restored.score.getElements().barlines()) {
			expect(barline.getSources()).toEqual([]);
			expect(restored.score.getElements().at(center(barline.rect))).toBe(
				barline,
			);
		}
	});

	it('builds fresh elements over the same document on rerender', async () => {
		const first = await renderedScore('repeats.musicxml');
		const document = first.document;
		// vet-ignore matchers-over-test-logic: the loop walks every case of a table, and a matcher would hide which one failed
		if (!document) {
			throw new Error('missing parsed document');
		}
		const firstBarline = only(
			first.score.getElements().barlines().slice(0, 1),
			'first barline',
		);
		const second = await renderedScore(document);
		const secondBarline = only(
			second.score.getElements().barlines().slice(0, 1),
			'second barline',
		);
		expect(secondBarline).not.toBe(firstBarline);
		expect(secondBarline.getSources()).toEqual(firstBarline.getSources());
		expect(second.score.getElements().at(center(secondBarline.rect))).toBe(
			secondBarline,
		);
	});
});

function center(rect: { x: number; y: number; w: number; h: number }) {
	return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
}

function only<T>(values: readonly T[], what: string): T {
	if (values.length !== 1 || !values[0]) {
		throw new Error(`expected one ${what}, got ${values.length}`);
	}
	return values[0];
}

function barlineGeometry(score: Score): string[] {
	return score
		.getElements()
		.barlines()
		.map(
			(barline) =>
				`${barline.getMeasure().getPart().getId()}:${barline.getMeasure().getIndex()}:${barline.getLocation()}:${JSON.stringify(barline.rect)}`,
		)
		.sort();
}
