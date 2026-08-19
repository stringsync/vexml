import { SPILL_COLUMN } from './constants';
import type { Rect } from './geometry';

/**
 * How far one stave row's drawn content spilled past its staff lines, plus where those
 * lines sit relative to the stave's y (what a stave offset positions). Measured on a
 * first draw pass so a second can re-space the staves around the actual music instead of
 * a fixed gap — the vertical analog of the per-system topOverflow feedback.
 */
export type StaveSpill = {
	/** Px the content rose above the top staff line, per x column (see SPILL_COLUMN):
	 * `Math.floor(x / SPILL_COLUMN)` -> the worst rise anything covering that column had.
	 * A column nothing reached over is absent rather than 0. */
	rise: Map<number, number>;
	/** Px the content dropped below the bottom staff line, columned the same way. */
	drop: Map<number, number>;
	/** Top staff line, relative to the stave's y. */
	lineTop: number;
	/** Bottom staff line, relative to the stave's y. */
	lineBottom: number;
};

/* What the tracker reads off a vexflow Stave: where its y anchor and staff lines sit.
 * Structural, so a unit test can hand in a plain object. */
export interface SpillStave {
	getY(): number;
	getYForLine(line: number): number;
	getBottomLineY(): number;
}

/*
 * The vertical measurements one draw pass takes so the next can make room: per stave row,
 * how far content spilled past its staff lines (opening the stave gaps); per system, how
 * far content rose above the system's own top (reserving headroom against the system
 * before it) and how high the above-stave text decorations reached (growing the measure
 * boxes the playback cursor rides on). One instance lives and dies with its DrawPass.
 */
export class SpillTracker {
	// systemIndex -> stave row -> that row's spill record.
	private readonly staveSpill = new Map<number, Map<number, StaveSpill>>();
	// Per system: the stave-top y it was placed at, and the highest (smallest) y any of
	// its content reached. Their difference is how far the system overflows above its
	// top stave — reserved above it on a redraw so it can't clash with the system above.
	private readonly systemTopByIndex = new Map<number, number>();
	private readonly systemHighestTop = new Map<number, number>();
	// The topmost y reached by above-stave text decorations (chord symbols, words) in a
	// system. Measure boxes grow up to this so the playback cursor/scroll cover those
	// extras instead of clipping them; chord diagrams are deliberately excluded — see the
	// harmony draw block in DrawPass for why the cursor stops at the stave.
	private readonly systemDecorationTop = new Map<number, number>();

	/* Content drawn on a stave row: band its rise over the top line AND its drop under the
	 * bottom line (a tall rect can do both, e.g. a chord spanning the staff). */
	recordStave(
		system: number,
		row: number,
		stave: SpillStave,
		rect: Rect,
	): void {
		const spill = this.spillOf(system, row, stave);
		this.bandSpill(spill.rise, rect, stave.getYForLine(0) - rect.y);
		this.bandSpill(spill.drop, rect, rect.bottom - stave.getBottomLineY());
	}

	/*
	 * How far an above-stave annotation reached over its stave, so pass two opens the gap
	 * to the stave above wide enough to hold it (see SpillResolver.spacedOffsets). Banding
	 * the lift makes this converge: the reported rise is the stack height over this
	 * stave's own music, which doesn't depend on how far apart the staves currently sit.
	 */
	recordRise(system: number, row: number, stave: SpillStave, rect: Rect): void {
		const spill = this.spillOf(system, row, stave);
		this.bandSpill(spill.rise, rect, stave.getYForLine(0) - rect.y);
	}

	/* The below-stave mirror of {@link recordRise}: how far a below-stave annotation (a
	 * placement="below" direction, a dynamic) reached under its stave, so pass two opens
	 * the gap to the stave BELOW wide enough to hold it. */
	recordDrop(system: number, row: number, stave: SpillStave, rect: Rect): void {
		const spill = this.spillOf(system, row, stave);
		this.bandSpill(spill.drop, rect, rect.bottom - stave.getBottomLineY());
	}

	/* Seed a row's spill record even when nothing is drawn on it, so the re-spacing pass
	 * still knows where its staff lines sit (a tab stave is taller than a notation one,
	 * and an empty stave still occupies its height). */
	seedRow(system: number, row: number, stave: SpillStave): void {
		this.spillOf(system, row, stave);
	}

	/* Where a system's top stave was placed, the baseline its overflow is measured from. */
	recordSystemTop(system: number, topY: number): void {
		this.systemTopByIndex.set(system, topY);
	}

	/* Content that reached `top` in a system — keeps the highest (smallest) y per system. */
	growHighestTop(system: number, top: number): void {
		this.systemHighestTop.set(
			system,
			Math.min(this.systemHighestTop.get(system) ?? Infinity, top),
		);
	}

	/* An above-stave text decoration that reached `top` — grows the system's measure-box
	 * ceiling (see decorationTopOf). */
	growDecorationTop(system: number, top: number): void {
		this.systemDecorationTop.set(
			system,
			Math.min(this.systemDecorationTop.get(system) ?? Infinity, top),
		);
	}

	/* The topmost decoration y a system recorded, or undefined when it recorded none. */
	decorationTopOf(system: number): number | undefined {
		return this.systemDecorationTop.get(system);
	}

	/* Every stave row's spill, keyed system -> row, for the pass driver to re-space with. */
	observedStaveSpill(): Map<number, Map<number, StaveSpill>> {
		return this.staveSpill;
	}

	/* Px each system's content rose above its own placed top: the headroom a redraw
	 * reserves above that system. The first system uses the cropped top slack instead, so
	 * it's excluded (it never reserves space against a system above it). */
	observedOverflow(): Map<number, number> {
		const overflow = new Map<number, number>();
		for (const [idx, topY] of this.systemTopByIndex) {
			const highest = this.systemHighestTop.get(idx);
			if (idx > 0 && highest !== undefined) {
				overflow.set(idx, Math.max(0, topY - highest));
			}
		}
		return overflow;
	}

	/* This row's spill record on this system, seeded on first sight with where the staff
	 * lines sit relative to the stave's y (which is what a stave offset positions). */
	private spillOf(system: number, row: number, stave: SpillStave): StaveSpill {
		let rows = this.staveSpill.get(system);
		if (!rows) {
			rows = new Map();
			this.staveSpill.set(system, rows);
		}
		let spill = rows.get(row);
		if (!spill) {
			spill = {
				rise: new Map(),
				drop: new Map(),
				lineTop: stave.getYForLine(0) - stave.getY(),
				lineBottom: stave.getBottomLineY() - stave.getY(),
			};
			rows.set(row, spill);
		}
		return spill;
	}

	/*
	 * Record `extent` px of spill against every x column `rect` covers, keeping the worst per
	 * column. Nothing is stored for a non-positive extent — content that stays inside its own
	 * staff lines has nothing for a neighbour to clear, and an absent column reads as 0.
	 */
	private bandSpill(
		columns: Map<number, number>,
		rect: Rect,
		extent: number,
	): void {
		const first = Math.floor(rect.x / SPILL_COLUMN);
		const last = Math.floor(rect.right / SPILL_COLUMN);
		if (extent <= 0 || !Number.isFinite(first) || !Number.isFinite(last)) {
			return;
		}
		for (let column = first; column <= last; column++) {
			columns.set(column, Math.max(columns.get(column) ?? 0, extent));
		}
	}
}
