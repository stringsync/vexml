import { STAVE_CLEARANCE } from './constants';
import type { StaveSpill } from './spill-tracker';

/* What pass one measured, as the resolver reads it off DrawPass.run()'s result. */
export interface SpillReport {
	observedStaveSpill: ReadonlyMap<number, ReadonlyMap<number, StaveSpill>>;
	observedOverflow: ReadonlyMap<number, number>;
	lyricsStepped: boolean;
	voltasLifted: boolean;
}

/* The resolver's verdict on a first pass: the re-spaced offsets, whether a second pass
 * has to redraw at all, and how much the tallest system grew (what the page floor and
 * scratch canvas must gain before the redraw). */
export interface PassRevision {
	systemStaveOffsets: Map<number, number[]>;
	needed: boolean;
	grewBy: number;
}

/*
 * Turns pass one's measurements into pass two's layout: re-space each system's staves
 * around the music actually drawn on them, and decide whether a redraw is needed at all.
 *
 * The layout planner gaps staves by fixed constants, which is right until a part's
 * content spills far enough past its staff lines to reach the next stave (deep ledger
 * lines, tall chords, a words direction or chord symbol riding above it). Given pass
 * one's measured spill, widen any gap that has to grow so the lower stave's highest
 * content clears the upper stave's lowest by STAVE_CLEARANCE. Gaps that already fit are
 * left exactly as planned, so ordinary scores keep their planned spacing.
 *
 * Resolved PER SYSTEM, which is what a reference engraving does: a piano's two staves
 * ride close together through a plain bar and open up under a bar that needs it, on the
 * same page. Sharing one worst case across the score instead would let the densest
 * measure in the piece set the gap for every line of it.
 *
 * Within a system, gaps planned at the same size stay the same size: the planned size is
 * what says whether a gap is within a part or between two of them, so widening one for a
 * single stave's chord symbol — and leaving its siblings alone — would read as uneven
 * part spacing rather than as room made for the symbol. Different planned sizes stay
 * independent, so a grand staff's inner gap doesn't drag the gaps around it open with it.
 */

export class SpillResolver {
	/*
	 * Weigh a first pass: re-spaced offsets plus whether any of the four redraw triggers
	 * fired — a gap that had to widen, a system that rose above its own top (only
	 * meaningful with a system above it to collide with, hence systemCount), a stepped
	 * lyric verse, or a volta bracket the notes climbed through.
	 */
	revise(
		planned: number[],
		report: SpillReport,
		systemCount: number,
	): PassRevision {
		const systemStaveOffsets = this.spacedOffsets(
			planned,
			report.observedStaveSpill,
		);
		const respace = [...systemStaveOffsets.values()].some((offsets) =>
			offsets.some((o, i) => o !== planned[i]),
		);
		const needsOverflow =
			systemCount > 1 &&
			[...report.observedOverflow.values()].some((v) => v > 0);
		// A verse hangs at one height per system, but each measure column is formatted alone
		// and can only see its own notes — so a system whose columns wanted different heights
		// drew a stepped verse, and pass two pins the whole row to the deepest of them.
		const needsLyricPin = report.lyricsStepped;
		// A volta bracket is drawn with its stave, before the notes it spans are formatted, so
		// a measure whose notes climb through it is only visible after the fact. Pass two
		// redraws the brackets lifted clear.
		const needsVoltaLift = report.voltasLifted;
		// Re-spacing makes a system taller, so the page floor and the scratch canvas both
		// have to grow before the redraw. Sized off the system that grew MOST — systems
		// grow by different amounts, and every one of them has to fit. Over-allocating
		// costs nothing: the final crop trims back to the content actually drawn.
		const grewBy = Math.max(
			0,
			...[...systemStaveOffsets.values()].map(
				(offsets) => (offsets.at(-1) ?? 0) - (planned.at(-1) ?? 0),
			),
		);
		return {
			systemStaveOffsets,
			needed: respace || needsOverflow || needsLyricPin || needsVoltaLift,
			grewBy,
		};
	}

	/* Every system's re-spaced offsets, keyed by system index. */
	spacedOffsets(
		planned: number[],
		spillBySystem: ReadonlyMap<number, ReadonlyMap<number, StaveSpill>>,
	): Map<number, number[]> {
		const bySystem = new Map<number, number[]>();
		for (const [system, spill] of spillBySystem) {
			bySystem.set(system, this.systemOffsets(planned, spill));
		}
		return bySystem;
	}

	/* One system's stave offsets, from the spill measured on that system alone. */
	private systemOffsets(
		planned: number[],
		spill: ReadonlyMap<number, StaveSpill>,
	): number[] {
		// planned gap size -> the widest any gap of that size turned out to need.
		const resolved = new Map<number, number>();
		const plannedGaps: number[] = [];
		for (let i = 1; i < planned.length; i++) {
			const above = spill.get(i - 1);
			const below = spill.get(i);
			const plannedGap = (planned[i] ?? 0) - (planned[i - 1] ?? 0);
			// Content bottom of the upper stave, and content top of the lower one, both
			// relative to their own stave y — so their difference is the gap they need.
			const needed =
				above && below
					? above.lineBottom +
						this.worstColumn(above.drop, below.rise) +
						STAVE_CLEARANCE -
						below.lineTop
					: plannedGap;
			plannedGaps.push(plannedGap);
			resolved.set(
				plannedGap,
				Math.max(resolved.get(plannedGap) ?? plannedGap, needed),
			);
		}

		const offsets = [planned[0] ?? 0];
		for (const plannedGap of plannedGaps) {
			offsets.push(
				(offsets.at(-1) ?? 0) + (resolved.get(plannedGap) ?? plannedGap),
			);
		}
		return offsets;
	}

	/*
	 * How far two staves' content reaches into the gap between them, at the worst single x.
	 * `drop` is the upper stave's profile below its bottom line, `rise` the lower stave's above
	 * its top line, both columned by SPILL_COLUMN.
	 *
	 * Summed per column, not overall: the whole point is that a deep stem hanging over an empty
	 * patch of the stave below costs nothing. Taking the two maxima independently would size
	 * every gap for a collision that never happens — the run beamed low in bar 3 against the
	 * chord reaching high in bar 9. Columns absent from a map contribute 0, so a lone extreme
	 * still gets its own clearance and a gap with nothing in it comes out at 0 (the caller
	 * floors that at the planned spacing).
	 */
	private worstColumn(
		drop: ReadonlyMap<number, number>,
		rise: ReadonlyMap<number, number>,
	): number {
		let worst = 0;
		for (const [column, px] of drop) {
			worst = Math.max(worst, px + (rise.get(column) ?? 0));
		}
		for (const [column, px] of rise) {
			worst = Math.max(worst, px + (drop.get(column) ?? 0));
		}
		return worst;
	}
}
