import { describe, expect, it } from 'bun:test';
import type { RenderContext } from 'vexflow';
import { ChordDiagram } from './chord-diagram';

// Smoke tests only: these exercise the options branches and assert draw() doesn't
// throw. Tests of the actual visual output live in tests/integration/.

describe(ChordDiagram, () => {
	// A no-op RenderContext; measureText returns a plausible width so the centering math runs.
	const context = new Proxy(
		{},
		{
			get(_target, prop) {
				if (prop === 'measureText') {
					return (msg: string) => ({ width: msg.length * 6 });
				}
				return () => context;
			},
		},
	) as unknown as RenderContext;

	it('draws an open-position chord with markers', () => {
		const diagram = new ChordDiagram(0, 0, {
			chord: [
				[6, 'x'],
				[5, 3],
				[4, 2],
				[3, 0],
				[2, 1],
				[1, 0],
			],
			title: 'C',
		});
		expect(() => diagram.draw(context)).not.toThrow();
	});

	it('draws a barred chord at a fret position', () => {
		const diagram = new ChordDiagram(10, 20, {
			chord: [
				[5, 1],
				[4, 3],
				[3, 3],
				[2, 3],
				[1, 1],
			],
			position: 8,
			positionText: 1,
			barres: [{ fromString: 5, toString: 1, fret: 1 }],
			title: 'G♯m7♭5',
		});
		expect(() => diagram.draw(context)).not.toThrow();
	});

	it('honors every option and a custom tuning', () => {
		const diagram = new ChordDiagram(0, 0, {
			chord: [
				[4, 0],
				[3, 2],
				[2, 2],
				[1, 'x'],
			],
			tuning: ['G', 'C', 'E', 'A'],
			width: 200,
			height: 240,
			circleRadius: 5,
			stringCount: 4,
			fretCount: 7,
			showTuning: true,
			strokeWidth: 2,
			color: '#123456',
			bgColor: '#abcdef',
			fontFamily: 'Times, serif',
			fontSize: 14,
		});
		expect(() => diagram.draw(context)).not.toThrow();
	});

	it('draws with tuning hidden and no title', () => {
		const diagram = new ChordDiagram(0, 0, {
			chord: [
				[1, 5],
				[2, 5],
			],
			showTuning: false,
		});
		expect(() => diagram.draw(context)).not.toThrow();
	});

	it('top falls back before draw, then reflects the drawn extent', () => {
		const diagram = new ChordDiagram(0, 100, { chord: [[1, 3]], title: 'A' });
		const before = diagram.top;
		diagram.draw(context);
		// draw() sets drawnTop; the fallback getter no longer applies.
		expect(diagram.top).not.toBe(before);
	});
});
