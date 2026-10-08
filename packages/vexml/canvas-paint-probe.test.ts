import { afterEach, describe, expect, it } from 'bun:test';
import { CanvasPaintProbe } from './canvas-paint-probe';

describe('CanvasPaintProbe', () => {
	const realDocument = globalThis.document;

	afterEach(() => {
		globalThis.document = realDocument;
	});

	// A context that spells colors the way a browser reads them back, and counts the writes.
	const probe = () => {
		const writes: unknown[] = [];
		let fill: unknown = '#000000';
		const ctx = {
			get fillStyle() {
				return fill;
			},
			set fillStyle(value: unknown) {
				writes.push(value);
				fill = value === 'red' ? '#ff0000' : value;
			},
		};
		(globalThis as unknown as { document: unknown }).document = {
			createElement: () => ({ getContext: () => ctx }),
		};
		return { probe: new CanvasPaintProbe(), writes };
	};

	it('asks the real context once per distinct style', () => {
		const { probe: p, writes } = probe();
		expect(p.normalize('fillStyle', 'red', '#000000')).toBe('#ff0000');
		expect(p.normalize('fillStyle', 'red', '#000000')).toBe('#ff0000');
		expect(writes).toEqual(['#000000', 'red']);
		// A different current value is a different question: a rejected value keeps it.
		p.normalize('fillStyle', 'red', '#00ff00');
		expect(writes).toHaveLength(4);
	});

	it('never remembers a gradient', () => {
		const { probe: p, writes } = probe();
		const gradient = {};
		p.normalize('fillStyle', gradient, '#000000');
		p.normalize('fillStyle', gradient, '#000000');
		expect(writes).toEqual(['#000000', gradient, '#000000', gradient]);
	});
});
