import type { Note as VexNote } from 'vexflow/core';
import { Stroke } from 'vexflow/core';

/*
 * A <notations><arpeggiate unbroken="yes">: one roll line running across the staves of a part
 * (a piano's hands) instead of one per stave. Every chord it marks carries one of these so
 * each stave reserves the same width left of its noteheads and the line sits at one x; only
 * the top chord draws, from its own top head down past the lowest head of the chords linked
 * to it, and the rest stay silent.
 */
export class UnbrokenArpeggio extends Stroke {
	private readonly below: VexNote[] = [];
	private drawsLine = true;

	/* Join `lower`'s arpeggio to this one: this chord draws the line, `lower` draws nothing. */
	join(lower: UnbrokenArpeggio, lowerNote: VexNote): void {
		lower.drawsLine = false;
		this.below.push(lowerNote);
	}

	override draw(): void {
		if (!this.drawsLine) {
			this.setRendered();
			return;
		}
		// Stroke stretches its wiggle over one end note's heads besides its own; lend it the
		// lowest of the chords joined below, so the line runs from this chord to the bottom one.
		const lowest = this.below.reduce<VexNote | undefined>(
			(low, n) =>
				low === undefined || Math.max(...n.getYs()) > Math.max(...low.getYs())
					? n
					: low,
			undefined,
		);
		if (lowest !== undefined) {
			this.addEndNote(lowest);
		}
		super.draw();
	}
}
