import { Articulation, Modifier, type StaveNote } from 'vexflow/core';

/** How many px cheaper the other side must score before it replaces the rules' side. */
const PREFERRED_SIDE_BONUS = 8;

/* What stands in a slur's way: the drawn extents of the notes, marks and accidentals under it. */
export class SlurObstacles {
	/*
	 * Scores the slur bowing up and bowing down and returns the cheaper side. A side costs
	 * what the notes under the bow stand past the chord joining its two ends on that side
	 * (so a side another voice or a high note sits in costs more), plus half of each stem
	 * that points into the bow, which the bow has to leave through. The side the rules
	 * chose carries `PREFERRED_SIDE_BONUS` px off, so only a clear win moves it.
	 */
	cheaperSide(
		from: StaveNote,
		to: StaveNote,
		span: StaveNote[],
		preferUp: boolean,
	): boolean {
		const xL = from.getAbsoluteX();
		const width = to.getAbsoluteX() - xL;
		const costOf = (up: boolean) => {
			const dir = up ? -1 : 1;
			const headY = (n: StaveNote) => {
				const { yTop, yBottom } = n.getNoteHeadBounds();
				return up ? yTop : yBottom;
			};
			const yL = headY(from);
			const yR = headY(to);
			let cost = 0;
			for (const n of span) {
				if (n === from || n === to) {
					continue;
				}
				const s = width ? (n.getAbsoluteX() - xL) / width : 0.5;
				const extents = this.noteExtents(n);
				const y = up ? extents.top : extents.bottom;
				cost += Math.max(0, dir * (y - (yL + s * (yR - yL))));
			}
			for (const n of [from, to]) {
				if (n.hasStem() && (n.getStemDirection() === 1) === up) {
					const { topY, baseY } = n.getStemExtents();
					cost += Math.abs(topY - baseY) / 2;
				}
			}
			return cost - (up === preferUp ? PREFERRED_SIDE_BONUS : 0);
		};
		return costOf(true) <= costOf(false);
	}

	/*
	 * The highest (smallest y) and lowest (largest y) drawn point of a note,
	 * covering both its noteheads and, when present, its stem tip.
	 */
	noteExtents(note: StaveNote): { top: number; bottom: number } {
		const { yTop, yBottom } = note.getNoteHeadBounds();
		let top = yTop;
		let bottom = yBottom;
		if (note.hasStem()) {
			const { topY, baseY } = note.getStemExtents();
			top = Math.min(top, topY, baseY);
			bottom = Math.max(bottom, topY, baseY);
		}
		return { top, bottom };
	}

	/*
	 * How far a note's articulations reach on one side, or null when it has none there. Read
	 * off the drawn marks: vexflow only settles where a mark sits (stacked over its
	 * neighbours, lifted off a beam) while drawing it, and both slur passes run after the
	 * notes have drawn.
	 */
	marksOnSide(
		note: StaveNote,
		above: boolean,
	): { top: number; bottom: number } | null {
		const side = above ? Modifier.Position.ABOVE : Modifier.Position.BELOW;
		let top = Infinity;
		let bottom = -Infinity;
		for (const mod of note.getModifiers()) {
			if (mod instanceof Articulation && mod.getPosition() === side) {
				const box = mod.getBoundingBox();
				top = Math.min(top, box.getY());
				bottom = Math.max(bottom, box.getY() + box.getH());
			}
		}
		return top === Infinity ? null : { top, bottom };
	}

	accidentalBoxes(note: StaveNote) {
		return note
			.getModifiers()
			.filter((mod) => mod.getCategory() === 'Accidental')
			.map((mod) => mod.getBoundingBox());
	}
}
