import type { MDocument, Measure } from '@stringsync/mdom';
import type { GapPosition } from './config';
import { MeasureSequenceIterator } from './measure-sequence-iterator';
import type { ScoreReader } from './score-reader';

/* A run of source measures [lo, hi] that playback enters once, at lo from lo - 1, and leaves
 * once, after hi (playing positions [p0, p1] of the unrolled order in between). A repeat with
 * its voltas is the multi-pass kind; a measure outside every repeat is a block of one. */
type Block = { lo: number; hi: number; p0: number; p1: number };

/*
 * Inserts gap measures into a document: one empty, unnumbered measure per part for each
 * position, carrying its right neighbor's signatures. A `beforeMeasureIndex` names where it
 * is written. A `beforeBarIndex` counts bars in playback order (MeasureSequenceIterator over
 * the score's repeats and voltas) and maps to the measure that bar plays, refusing one that
 * falls inside a repeat, where a plain measure would play on every pass or split a volta group.
 * Positions are all read against the document before any of them is inserted, so they never
 * count each other.
 */
export class GapInserter {
	constructor(private readonly reader: ScoreReader) {}

	/* The inserted gap measures of the first part, in `positions` order. Mutates `document`. */
	insert(document: MDocument, positions: readonly GapPosition[]): Measure[] {
		const parts = document.score.parts;
		const indexes = this.indexesOf(parts[0]?.measures ?? [], positions);
		// Insert in index order, ties in `positions` order; each insertion shifts the later
		// ones right by one, so the k-th inserted gap lands at `index + k`.
		const order = positions
			.map((_, i) => i)
			.sort((a, b) => (indexes[a] ?? 0) - (indexes[b] ?? 0));
		const inserted: Measure[] = [];
		order.forEach((original, k) => {
			const at = (indexes[original] ?? 0) + k;
			for (const [p, part] of parts.entries()) {
				// '' keeps the number distinct from the real printed labels; DrawPass never
				// prints it.
				const measure = part.insertMeasureAt(at, { number: '' });
				// A gap before measure 0 sits before every declaration, and would otherwise
				// render a bare, clefless stave. Mid-score this is redundant but harmless.
				const ref = part.measures[at + 1];
				if (ref) {
					measure.copySignaturesFrom(ref);
				}
				if (p === 0) {
					inserted[original] = measure;
				}
			}
		});
		return inserted;
	}

	/* Each position's measure index in the document as it stands (before any insertion). */
	private indexesOf(
		measures: readonly Measure[],
		positions: readonly GapPosition[],
	): number[] {
		const repeats = this.reader.measureRepeats(measures);
		const jumps = this.reader.measureJumps(measures);
		const order = [
			...new MeasureSequenceIterator(
				measures.map((_, index) => ({ index, jumps: jumps[index] ?? [] })),
			),
		];
		// A plain measure between two endings would split their volta group (or one ending's
		// run), so a block never cuts between them.
		const joined = (i: number): boolean =>
			!!repeats[i]?.ending && !!repeats[i - 1]?.ending;

		return positions.map((position) => {
			const byBar = position.beforeBarIndex !== undefined;
			if (byBar === (position.beforeMeasureIndex !== undefined)) {
				throw new TypeError(
					'insertGaps: a gap needs exactly one of beforeMeasureIndex or beforeBarIndex',
				);
			}
			const [name, index, max] = byBar
				? ['beforeBarIndex', position.beforeBarIndex, order.length]
				: ['beforeMeasureIndex', position.beforeMeasureIndex, measures.length];
			if (
				index === undefined ||
				!Number.isInteger(index) ||
				index < 0 ||
				index > max
			) {
				throw new RangeError(
					`insertGaps: ${name} must be an integer in [0, ${max}], got ${index}`,
				);
			}
			const measure = byBar ? order[index] : undefined;
			if (!byBar || measure === undefined) {
				// A measure index as written, or a bar past the last: append.
				return byBar ? measures.length : index;
			}
			// Only before a block's first bar does the gap play once, ahead of the repeat.
			const block = this.blockAround(order, joined, measure);
			if (index !== block.p0) {
				throw new RangeError(
					`insertGaps: beforeBarIndex ${index} falls inside a repeat (measures ${block.lo}-${block.hi})`,
				);
			}
			return block.lo;
		});
	}

	/* The smallest block holding source measure `m`: widen until every playback position between
	 * the first and last visit falls inside, playback enters only from lo - 1 and leaves only to
	 * hi + 1, and no volta group is cut. */
	private blockAround(
		order: readonly number[],
		joined: (i: number) => boolean,
		m: number,
	): Block {
		let lo = m;
		let hi = m;
		for (;;) {
			let p0 = -1;
			let p1 = -1;
			for (const [p, visited] of order.entries()) {
				if (visited >= lo && visited <= hi) {
					if (p0 < 0) {
						p0 = p;
					}
					p1 = p;
				}
			}
			let wideLo = lo;
			let wideHi = hi;
			const widen = (visited: number | undefined): void => {
				if (visited !== undefined) {
					wideLo = Math.min(wideLo, visited);
					wideHi = Math.max(wideHi, visited);
				}
			};
			for (let p = p0; p <= p1; p++) {
				widen(order[p]);
			}
			if (p0 > 0 && order[p0 - 1] !== lo - 1) {
				widen(order[p0 - 1]);
			}
			if (p1 + 1 < order.length && order[p1 + 1] !== hi + 1) {
				widen(order[p1 + 1]);
			}
			while (wideLo > 0 && joined(wideLo)) {
				wideLo--;
			}
			while (joined(wideHi + 1)) {
				wideHi++;
			}
			if (wideLo === lo && wideHi === hi) {
				return { lo, hi, p0, p1 };
			}
			lo = wideLo;
			hi = wideHi;
		}
	}
}
