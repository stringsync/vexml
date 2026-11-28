import { beforeEach, describe, expect, it } from 'bun:test';
import { MDocument } from '@stringsync/mdom';
import { FakeReadCounter } from './fake-read-counter';
import { StavePlan, type StaveVisibility } from './stave-plan';

function required<T>(value: T | null | undefined, name: string): T {
	if (value == null) {
		throw new Error(`missing ${name}`);
	}
	return value;
}

describe('StavePlan', () => {
	let staves: StavePlan;

	beforeEach(() => {
		staves = new NotationOnlyPlan({ showTabs: true, showNotation: true });
	});

	it('reads implicit single-staff counts once across cross-part pairing queries', () => {
		const document = score([null, null]);
		const counters = document.score.parts.map(
			(part) => new FakeReadCounter(part),
		);
		const parts = counters.map((counter) => counter.view);

		expect(staves.partsPairTabWithNotation(parts)).toBe(false);
		expect(staves.partsPairTabWithNotation(parts)).toBe(false);
		expect(staves.visibleNumbers(required(parts[0], 'part'))).toEqual(['1']);
		expect(counters.map((c) => c.readsOf('staveCount'))).toEqual([1, 1]);
	});

	it('reads explicit multi-staff counts once across cross-part pairing queries', () => {
		const document = score([2, 2]);
		const counters = document.score.parts.map(
			(part) => new FakeReadCounter(part),
		);
		const parts = counters.map((counter) => counter.view);

		expect(staves.partsPairTabWithNotation(parts)).toBe(false);
		expect(staves.partsPairTabWithNotation(parts)).toBe(false);
		expect(staves.visibleNumbers(required(parts[0], 'part'))).toEqual([
			'1',
			'2',
		]);
		expect(counters.map((c) => c.readsOf('staveCount'))).toEqual([1, 1]);
	});

	it('preserves notation and tab visibility filtering', () => {
		const document = score([2]);
		const part = required(document.score.parts[0], 'part');
		required(part.measures[0], 'measure').setClef({
			sign: 'TAB',
			line: 5,
			staff: '2',
		});

		expect(plan().visibleNumbers(part)).toEqual(['1', '2']);
		expect(plan({ showTabs: false }).visibleNumbers(part)).toEqual(['1']);
		expect(plan({ showNotation: false }).visibleNumbers(part)).toEqual(['2']);
		expect(plan({ showTabs: false }).pairsTabWithNotation(part)).toBe(false);
		expect(plan({ showNotation: false }).pairsTabWithNotation(part)).toBe(
			false,
		);
	});

	it('preserves split notation and tab pairing under visibility filtering', () => {
		const document = score([null, null]);
		const parts = document.score.parts;
		const tab = required(parts[1], 'tab part');
		required(tab.measures[0], 'measure').setClef({ sign: 'TAB', line: 5 });

		expect(plan().partsPairTabWithNotation(parts)).toBe(true);
		expect(plan({ showTabs: false }).partsPairTabWithNotation(parts)).toBe(
			false,
		);
		expect(plan({ showNotation: false }).partsPairTabWithNotation(parts)).toBe(
			false,
		);
	});

	it('counts a second staff from its numbered clefs when <staves> is absent', () => {
		const document = score([null]);
		const part = required(document.score.parts[0], 'part');
		const measure = required(part.measures[0], 'measure');
		measure.setClef({ sign: 'G', line: 2, staff: '1' });
		measure.setClef({ sign: 'F', line: 4, staff: '2' });

		expect(plan().visibleNumbers(part)).toEqual(['1', '2']);
	});

	it('reads staff counts afresh for a new render after a source edit', () => {
		const document = score([null]);
		const part = required(document.score.parts[0], 'part');
		expect(plan().visibleNumbers(part)).toEqual(['1']);

		required(part.measures[0], 'measure').setStaveCount(2);

		expect(plan().visibleNumbers(part)).toEqual(['1', '2']);
	});
});

function plan(visibility: Partial<StaveVisibility> = {}): StavePlan {
	return new StavePlan({ showTabs: true, showNotation: true, ...visibility });
}

function score(staveCounts: Array<number | null>): MDocument {
	const document = MDocument.empty();
	staveCounts.forEach((staveCount, index) => {
		const part = document.score.addPart({
			id: `P${index + 1}`,
			name: `Part ${index + 1}`,
		});
		const measure = part.addMeasure();
		if (staveCount !== null) {
			measure.setStaveCount(staveCount);
		}
	});
	return document;
}

/* A plan that takes every staff for notation, so the tests count only the stave reads. */
class NotationOnlyPlan extends StavePlan {
	override isTab(): boolean {
		return false;
	}
}
