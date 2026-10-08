import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { Element, StaveNote } from 'vexflow/core';
import { CanvasPaintProbe } from './canvas-paint-probe';
import { ProbeTextCanvas } from './probe-text-canvas';

describe('ProbeTextCanvas', () => {
	const realDocument = globalThis.document;

	let measured: string[];

	// A real canvas stand-in that logs each measurement by the font it was asked in, installed
	// as vexflow's measuring canvas through the probe.
	beforeEach(() => {
		measured = [];
		const ctx = {
			font: '',
			measureText(text: string) {
				measured.push(`${ctx.font}|${text}`);
				return {
					width: 10,
					actualBoundingBoxAscent: 5,
					actualBoundingBoxDescent: 5,
				};
			},
		};
		(globalThis as unknown as { document: unknown }).document = {
			createElement: () => ({ getContext: () => ctx }),
		};
		new ProbeTextCanvas(new CanvasPaintProbe()).install();
	});

	afterEach(() => {
		globalThis.document = realDocument;
		Element.setTextMeasurementCanvas(undefined as unknown as HTMLCanvasElement);
	});

	it('measures each distinct font and text on the real canvas once', () => {
		// The same glyphs, over and over: every note's head measures its glyph as it's built.
		const chords = [['c/4'], ['e/4', 'g/4'], ['c/5'], ['c/4'], ['e/4', 'g/4']];
		const notes = [...chords, ...chords].map(
			(keys) => new StaveNote({ keys, duration: 'q' }),
		);

		expect(notes).toHaveLength(10);
		expect(measured).not.toEqual([]);
		expect(measured).toEqual([...new Set(measured)]);
	});
});
