import { MDocument } from '@stringsync/mdom';
import type { Gap, GapPosition } from './config';
import type { GapInserter } from './gap-inserter';

/*
 * The gap measures a render was configured with (`Config.gaps`): non-musical measures the rest
 * of the pipeline (layout, draw, elements, sequence) sees as ordinary measures with no voices.
 * A gap naming a `measure` is already in the document; a positioned one is inserted into
 * vexml's own parse (render() refuses positions for a caller's MDocument, which vexml never
 * edits). Constructed once from config and injected into every stage that must treat a gap
 * specially (width floor, no measure number, overlay, fixed-ms timing), so they all agree
 * about where the gaps are.
 */
export class Gaps {
	/* Each gap's document measure index, in config order; set by resolve. */
	private indexes: readonly number[] | null = null;

	constructor(
		private readonly gaps: readonly Gap[],
		private readonly inserter: GapInserter,
	) {}

	isEmpty(): boolean {
		return this.gaps.length === 0;
	}

	/* Whether any gap must be inserted (a position) rather than found (a measure). */
	inserts(): boolean {
		return this.gaps.some((gap) => gap.measure === undefined);
	}

	/* Whether any gap names a measure, which only a caller's own MDocument can hold. */
	names(): boolean {
		return this.gaps.some((gap) => gap.measure !== undefined);
	}

	/* Refuse gaps the input can't hold, before it is parsed: a caller's document is never
	 * edited, so its gaps are measures already in it, and a parse vexml makes holds none of the
	 * caller's measures. */
	check(input: string | Blob | MDocument): void {
		if (input instanceof MDocument ? this.inserts() : this.names()) {
			throw new Error(
				input instanceof MDocument
					? 'render: gaps for an MDocument must name measures in it (see insertGaps)'
					: 'render: a gap naming a measure needs its MDocument as input',
			);
		}
	}

	/*
	 * Find every gap's measure in the parsed document, inserting the positioned ones first
	 * (GapInserter: one empty, unnumbered measure per part, carrying its neighbor's
	 * signatures). Measure *numbers* (the printed labels) are untouched; a gap never gets one.
	 */
	resolve(document: MDocument): void {
		for (const gap of this.gaps) {
			if (!(gap.durationMs > 0)) {
				throw new RangeError(
					`render: gap durationMs must be positive, got ${gap.durationMs}`,
				);
			}
		}
		const positioned = this.gaps.flatMap((gap, i) =>
			gap.measure === undefined ? [i] : [],
		);
		const inserted = this.inserter.insert(
			document,
			positioned.map((i) => this.gaps[i] as GapPosition),
		);
		const insertedByGap = new Map(
			positioned.map((gapIndex, k) => [gapIndex, inserted[k]]),
		);
		const indexes = this.gaps.map((gap, i) => {
			const measure = gap.measure ?? insertedByGap.get(i);
			if (
				!measure ||
				measure.index < 0 ||
				measure.part.score !== document.score
			) {
				throw new Error(
					`render: gap ${i}'s measure is not in the rendered document (removed by an undo?)`,
				);
			}
			return measure.index;
		});
		if (new Set(indexes).size !== indexes.length) {
			throw new RangeError('render: two gaps name the same measure');
		}
		this.indexes = indexes;
	}

	/* Each gap paired with its document measure index, in the caller's config order
	 * (Score.getGaps' contract). Empty until resolve: a score with no parts never has one. */
	documentIndexes(): { gap: Gap; measureIndex: number }[] {
		const indexes = this.indexes ?? [];
		return indexes.flatMap((measureIndex, i) => {
			const gap = this.gaps[i];
			return gap ? [{ gap, measureIndex }] : [];
		});
	}

	/* Document measure index -> gap spec, for the pipeline stages that walk measures. */
	byMeasureIndex(): Map<number, Gap> {
		return new Map(
			this.documentIndexes().map(({ gap, measureIndex }) => [
				measureIndex,
				gap,
			]),
		);
	}
}
