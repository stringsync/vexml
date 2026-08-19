import type { Part } from '@stringsync/mdom';
import type { Gap } from './config';

/*
 * The gap measures a render was configured with (`Config.gaps`): non-musical measures
 * inserted into the parsed document right after parse, so the rest of the pipeline
 * (layout, draw, elements, sequence) sees them as ordinary measures with no voices.
 * Constructed once from config and injected into every stage that must treat a gap
 * specially (width floor, no measure number, overlay, fixed-ms timing), so they all
 * agree about where the gaps landed.
 */
export class Gaps {
	constructor(private readonly gaps: readonly Gap[]) {}

	/* Each gap paired with the document measure index it lands on after insertion, in the
	 * caller's config order (Score.getGaps' contract). Gaps insert in stable
	 * beforeMeasureIndex order (ties keep config order), and each earlier insertion shifts
	 * the later ones right by one — so the k-th inserted gap lands at
	 * `beforeMeasureIndex + k`. Must mirror insertInto's order exactly. */
	documentIndexes(): { gap: Gap; measureIndex: number }[] {
		const order = this.gaps
			.map((_, i) => i)
			.sort(
				(a, b) =>
					(this.gaps[a]?.beforeMeasureIndex ?? 0) -
					(this.gaps[b]?.beforeMeasureIndex ?? 0),
			);
		const out: { gap: Gap; measureIndex: number }[] = [];
		order.forEach((original, k) => {
			const gap = this.gaps[original];
			if (gap) {
				out[original] = { gap, measureIndex: gap.beforeMeasureIndex + k };
			}
		});
		return out;
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

	/*
	 * Mutate the parsed parts: insert one empty measure per part for each gap. Document
	 * measure indexes shift right of each insertion; measure *numbers* (the printed labels)
	 * are untouched — the gap's own number is '' and is never printed.
	 *
	 * The gap copies the effective clef/key/time of the measure it displaces (per staff).
	 * Mid-score that's redundant (signatures carry forward through an empty measure), but a
	 * gap inserted before measure 0 sits before every declaration and would otherwise render
	 * a bare, clefless stave; copying from its right neighbor gives it the signature the
	 * legacy "clone the template" approach did. A gap appended at the end copies nothing —
	 * carry-forward already covers it.
	 */
	insertInto(parts: Part[]): void {
		if (this.gaps.length === 0) {
			return;
		}
		const measureCount = parts[0]?.measures.length ?? 0;
		for (const gap of this.gaps) {
			if (
				!Number.isInteger(gap.beforeMeasureIndex) ||
				gap.beforeMeasureIndex < 0 ||
				gap.beforeMeasureIndex > measureCount
			) {
				throw new RangeError(
					`render: gap beforeMeasureIndex must be an integer in [0, ${measureCount}], got ${gap.beforeMeasureIndex}`,
				);
			}
			if (!(gap.durationMs > 0)) {
				throw new RangeError(
					`render: gap durationMs must be positive, got ${gap.durationMs}`,
				);
			}
		}
		const sorted = [...this.gaps].sort(
			(a, b) => a.beforeMeasureIndex - b.beforeMeasureIndex,
		);
		sorted.forEach((gap, k) => {
			for (const part of parts) {
				// beforeMeasureIndex + k: earlier gaps already shifted this position right.
				const at = gap.beforeMeasureIndex + k;
				// '' keeps the number distinct from the real printed labels; DrawPass never
				// prints it.
				const measure = part.insertMeasureAt(at, { number: '' });
				const ref = part.measures[at + 1];
				if (ref) {
					measure.copySignaturesFrom(ref);
				}
			}
		});
	}
}
