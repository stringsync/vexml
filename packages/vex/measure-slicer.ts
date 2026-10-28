import { MDOMParser, MElement, MusicXMLSerializer } from '@stringsync/mdom';
import { materializeSliceState } from './slice-state';

export type SlicePolicy = 'standalone' | 'raw';
export type SliceCoordinate = 'label' | 'position';

/**
 * Keeps only the measures named by a spec like `1,3-5,8`, matching on the
 * `<measure number>` label by default. `position` instead uses 1-based source
 * ordinals in every part, counting pickups and continuing across movements.
 * The kept opening measure inherits the signatures
 * that were in effect where the slice starts, so it still renders correctly on
 * its own.
 *
 * Standalone slices play every retained measure once in source order, including
 * all retained alternative endings. All repeats (even complete or nested ones),
 * endings, and D.C./D.S./Fine/To Coda navigation are removed rather than repaired
 * or expanded. `raw` preserves these for contextual reproductions. Other
 * direction spans are reopened and closed at each contiguous retained run.
 * Note-anchored spans (ties, slurs, tuplets, glissandi, etc.) retain their source
 * endpoints, including dangling endpoints: moving one would change its note.
 * Measure styles reopen at each run and may remain active through its end;
 * multiple-rest counts are clipped. Raw mode only materializes opening signatures.
 */
export class MeasureSlicer {
	private readonly wanted: Set<string>;

	/** Throws on a malformed spec. */
	constructor(
		private readonly spec: string,
		private readonly policy: SlicePolicy = 'standalone',
		private readonly coordinate: SliceCoordinate = 'label',
	) {
		if (coordinate === 'position') {
			for (const token of spec.split(',')) {
				if (
					!/^\d+(?:-\d+)?$/.test(token.trim()) ||
					token
						.trim()
						.split('-')
						.some((n) => !Number.isSafeInteger(Number(n)) || Number(n) < 1)
				) {
					throw new Error(
						`invalid measure position "${token}": use positive 1-based integers`,
					);
				}
			}
		}
		const wanted = parseMeasureSpec(spec);
		this.wanted =
			coordinate === 'position'
				? new Set([...wanted].map((n) => String(Number(n))))
				: wanted;
	}

	slice(xml: string): string {
		const doc = new MDOMParser().parseFromString(xml);
		if (this.coordinate === 'position') {
			const count = doc.score.parts[0]?.measures.length ?? 0;
			for (const part of doc.score.parts) {
				if (part.measures.length !== count) {
					throw new Error(
						'positional slicing requires the same measure count in every part',
					);
				}
			}
			for (const position of this.wanted) {
				if (Number(position) > count) {
					throw new Error(
						`measure position ${position} exceeds the score's ${count} measures`,
					);
				}
			}
		}

		for (const part of doc.score.parts) {
			const measures = part.measures;
			const selected = new Set(
				measures.filter((m, index) =>
					this.wanted.has(
						this.coordinate === 'position' ? String(index + 1) : m.number,
					),
				),
			);
			const [first] = selected;
			if (!first) {
				throw new Error(
					`part ${part.id} has no measures matching "${this.spec}"`,
				);
			}
			if (this.policy === 'standalone') {
				materializeSliceState(measures, selected);
			} else {
				first.materializeSignatures();
			}
			for (const measure of measures) {
				if (!selected.has(measure)) {
					measure.remove();
				} else if (this.policy === 'standalone') {
					this.removeNavigation(measure);
				}
			}
		}

		return new MusicXMLSerializer().serializeToString(doc);
	}

	private removeNavigation(element: MElement): void {
		for (const child of element.children) {
			if (child instanceof MElement) {
				this.removeNavigation(child);
			}
		}
		if (['repeat', 'ending', 'segno', 'coda'].includes(element.tag)) {
			element.remove();
		} else if (element.tag === 'sound') {
			for (const attr of [
				'dacapo',
				'dalsegno',
				'fine',
				'tocoda',
				'segno',
				'coda',
				'forward-repeat',
				'time-only',
			]) {
				element.removeAttribute(attr);
			}
			if (
				Object.keys(element.attributes).length === 0 &&
				element.children.length === 0
			) {
				element.remove();
			}
		} else if (
			element.tag === 'words' &&
			element.parent?.tag === 'direction-type'
		) {
			// Limit text matching to conventional navigation, so prose and tempo survive.
			const words = (element.text ?? '').replace(/[.\s]/g, '').toLowerCase();
			if (
				/^(?:d[cs](?:al(?:fine|coda))?|dacapo(?:al(?:fine|coda))?|dalsegno(?:al(?:fine|coda))?|fine|tocoda|alcoda|alsegno|segno|coda)$/.test(
					words,
				)
			) {
				element.remove();
			}
		} else if (
			element.tag === 'direction-type' &&
			element.children.length === 0
		) {
			element.remove();
		} else if (
			element.tag === 'direction' &&
			!element.child('direction-type')
		) {
			if (element.child('sound')) {
				// A direction requires a direction-type, even when only its tempo remains.
				const type = new MElement('direction-type');
				type.append(new MElement('words'));
				element.insertBefore(type, element.children[0] ?? null);
			} else {
				element.remove();
			}
		}
	}
}

/** `1,3-5,8` -> {1, 3, 4, 5, 8}. Ranges are numeric; bare tokens stay literal. */
export function parseMeasureSpec(spec: string): Set<string> {
	const out = new Set<string>();
	for (const token of spec.split(',')) {
		const part = token.trim();
		if (part === '') {
			throw new Error(`empty measure in "${spec}"`);
		}
		// Only a-b is a range; a bare token is a literal label, since <measure
		// number> is free-form (pickup measures are "0", repeats reuse numbers).
		const range = /^(\d+)-(\d+)$/.exec(part);
		if (!range) {
			out.add(part);
			continue;
		}
		const [from, to] = [Number(range[1]), Number(range[2])];
		if (!Number.isSafeInteger(from) || !Number.isSafeInteger(to)) {
			throw new Error(`unsafe measure range "${part}"`);
		}
		if (to < from) {
			throw new Error(`descending measure range "${part}"`);
		}
		for (let n = from; n <= to; n++) {
			out.add(String(n));
		}
	}
	return out;
}
