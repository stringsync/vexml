import { describe, expect, it } from 'bun:test';
import type { VexmlContext } from '@vexml/renderer';
import { testing } from './setup';

// Note.getInkRect, end to end: render one of each mark drawn beside a notehead (arpeggio,
// accidental, displaced head, dot, flags up and down, a grace with its own accidental), outline
// each note's ink in red over its head rect in blue, and screenshot it. Each ink box must hold
// its head, and reach out past it on the side its marks hang.
describe('Note.getInkRect', () => {
	it.concurrent('covers the marks drawn beside each note', async () => {
		const { result, image } = await testing.eval(
			'note_ink.musicxml',
			{},
			outlineInk,
		);
		expect(result.escapes).toEqual([]);
		const [c4, eb4, g4, fs4, g4b, a4, d5, c5] = result.reaches;
		// The arpeggio hangs left of the whole first chord.
		expect(c4?.left).toBeGreaterThan(8);
		expect(eb4?.left).toBeGreaterThan(8);
		expect(g4?.left).toBeGreaterThan(8);
		// The sharp, but not the G it shares a chord with.
		expect(fs4?.left).toBeGreaterThan(4);
		expect(g4b?.left).toBe(0);
		// The dot and the up flag hang right of the dotted eighth.
		expect(a4?.right).toBeGreaterThan(4);
		// The down flag hangs below the sixteenth's head.
		expect(d5?.below).toBeGreaterThan(10);
		// C5's natural, then its grace's flat, then the grace's own head reach left of it.
		expect(c5?.left).toBeGreaterThan(20);
		expect(image).toMatchScreenshot('note_ink.png');
	});
});

interface InkReport {
	escapes: string[];
	// How far each note's ink reaches past its head rect, in score order.
	reaches: { left: number; right: number; below: number }[];
}

// Runs in the page via toString(), so it must stay self-contained: no closing over test scope.
function outlineInk({ score }: VexmlContext): InkReport {
	const layer = score.addLayer('content');
	layer.ctx.lineWidth = 1;
	const report: InkReport = { escapes: [], reaches: [] };
	const notes = score
		.getElements()
		.measureBoxes()
		.flatMap((box) => box.getMeasures())
		.flatMap((measure) => measure.getVoices())
		.flatMap((voice) => voice.getNotes())
		.filter((note) => !note.isGrace());
	for (const note of notes) {
		const head = note.rect;
		const ink = note.getInkRect();
		layer.ctx.strokeStyle = '#1e88e5';
		layer.ctx.strokeRect(head.x, head.y, head.w, head.h);
		layer.ctx.strokeStyle = '#e53935';
		layer.ctx.strokeRect(ink.x, ink.y, ink.w, ink.h);
		const pitch = note.getPitch() ?? 'rest';
		if (!ink.containsRect(head)) {
			report.escapes.push(`${pitch} head escapes its ink`);
		}
		report.reaches.push({
			left: head.x - ink.x,
			right: ink.right - head.right,
			below: ink.bottom - head.bottom,
		});
	}
	return report;
}
