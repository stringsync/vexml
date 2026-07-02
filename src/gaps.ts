import { Measure, type Part } from '@stringsync/mdom';
import type { Gap } from './config';

/*
 * Gap measures: non-musical measures declared via `Config.gaps` and inserted into the
 * parsed document right after parse, so the rest of the pipeline (layout, draw,
 * elements, sequence) sees them as ordinary measures with no voices. The consumers that
 * must treat a gap specially (width floor, no measure number, overlay, fixed-ms timing)
 * look it up through gapsByMeasureIndex.
 */

/* Each gap paired with the document measure index it lands on after insertion, in the
 * caller's config order (Score.getGaps' contract). Gaps insert in stable
 * beforeMeasureIndex order (ties keep config order), and each earlier insertion shifts
 * the later ones right by one — so the k-th inserted gap lands at
 * `beforeMeasureIndex + k`. Must mirror insertGapMeasures' order exactly. */
export function gapDocumentIndexes(
	gaps: readonly Gap[],
): { gap: Gap; measureIndex: number }[] {
	const order = gaps
		.map((_, i) => i)
		.sort(
			(a, b) =>
				(gaps[a]?.beforeMeasureIndex ?? 0) - (gaps[b]?.beforeMeasureIndex ?? 0),
		);
	const out: { gap: Gap; measureIndex: number }[] = [];
	order.forEach((original, k) => {
		const gap = gaps[original];
		if (gap) {
			out[original] = { gap, measureIndex: gap.beforeMeasureIndex + k };
		}
	});
	return out;
}

/* Document measure index -> gap spec, for the pipeline stages that walk measures. */
export function gapsByMeasureIndex(gaps: readonly Gap[]): Map<number, Gap> {
	return new Map(
		gapDocumentIndexes(gaps).map(({ gap, measureIndex }) => [
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
export function insertGapMeasures(parts: Part[], gaps: readonly Gap[]): void {
	const measureCount = parts[0]?.measures.length ?? 0;
	for (const gap of gaps) {
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
	const sorted = [...gaps].sort(
		(a, b) => a.beforeMeasureIndex - b.beforeMeasureIndex,
	);
	sorted.forEach((gap, k) => {
		for (const part of parts) {
			// beforeMeasureIndex + k: earlier gaps already shifted this position right.
			const ref = part.measures[gap.beforeMeasureIndex + k] ?? null;
			const measure = new Measure();
			// mdom requires a number on every measure; '' keeps it distinct from the real
			// printed labels and DrawPass never prints it.
			measure.setAttribute('number', '');
			part.insertBefore(measure, ref);
			if (ref) {
				for (let s = 1; s <= Math.max(part.staveCount, 1); s++) {
					const staff = String(s);
					const clef = ref.getClef(staff);
					if (clef) {
						measure.setClef({
							sign: clef.sign,
							line: clef.line ?? undefined,
							octaveChange: clef.octaveChange || undefined,
							staff,
						});
					}
					const fifths = ref.getKey(staff)?.fifths;
					if (fifths !== null && fifths !== undefined) {
						measure.setKey({ fifths, staff });
					}
					const time = ref.getTime(staff);
					if (time?.beats && time?.beatType) {
						measure.setTime({
							beats: Number(time.beats),
							beatType: Number(time.beatType),
							symbol: time.symbol ?? undefined,
						});
					}
				}
			}
		}
	});
}
