import type { RenderContext } from 'vexflow/core';
import { LYRIC_PADDING } from './constants';
import type { PinnedSyllable } from './lyric-placer';

/* One rest's horizontal position and duration (in VexFlow ticks), for hyphen-across-rest placement. */
export interface RestSpan {
	readonly x: number;
	readonly ticks: number;
}

// Half rest in VexFlow ticks (RESOLUTION / 2 = 8192): rests summing to at least this
// duration are treated as an extended rest passage, getting hyphens before and after the
// rests rather than running hyphens through them (Behind Bars p. 449).
const EXTENDED_REST_TICKS = 8192;

// Offset (px) of a hyphen placed beside a syllable next to an extended rest or system edge.
const HYPHEN_EDGE_OFFSET = 12;

export interface SystemHyphenInput {
	readonly system: number;
	readonly pinned: readonly PinnedSyllable[];
	readonly restsByRow: ReadonlyMap<number, readonly RestSpan[]> | undefined;
	readonly hyphenDistance: number | null;
	readonly notationColor: string;
	readonly context: RenderContext;
}

/*
 * Draw hyphens across all verses of `system` once every measure in the system has been
 * pinned (Behind Bars p. 449).
 *
 * - Between two syllables on the same system with no extended rest in between (including
 *   across a short rest like an eighth or quarter rest): centre one hyphen (or evenly
 *   spaced hyphens when `<distance type="hyphen">` is set) in the gap.
 * - Across an extended rest passage (total rest duration >= half rest): place one hyphen
 *   after the preceding syllable and one before the following syllable, leaving the rest
 *   passage clear of hyphens.
 * - Across a system break: place one hyphen after the trailing syllable on the outgoing
 *   system, and a leading hyphen before the continuing syllable on the incoming system.
 */
export function drawSystemHyphens(input: SystemHyphenInput): void {
	const { system, pinned, restsByRow, hyphenDistance, notationColor, context } =
		input;
	const groups = new Map<string, PinnedSyllable[]>();
	for (const p of pinned) {
		if (p.system !== system) {
			continue;
		}
		const key = `${p.row}:${p.verseIndex}`;
		let list = groups.get(key);
		if (!list) {
			list = [];
			groups.set(key, list);
		}
		list.push(p);
	}
	if (groups.size === 0) {
		return;
	}
	context.save();
	context.setFillStyle(notationColor);
	for (const list of groups.values()) {
		list.sort((a, b) => a.left - b.left);
		const first = list[0];
		if (
			first &&
			system > 0 &&
			first.lyric.continues &&
			endedHyphenated(pinned, system - 1, first.row, first.verseIndex)
		) {
			const to = first.left + LYRIC_PADDING;
			const staveLeft =
				typeof first.stave.getX === 'function'
					? first.stave.getX() + 4
					: to - HYPHEN_EDGE_OFFSET;
			first.lyric.drawHyphen(
				context,
				Math.max(to - HYPHEN_EDGE_OFFSET, staveLeft),
			);
		}
		const rowRests = (first ? restsByRow?.get(first.row) : undefined) ?? [];
		for (let i = 0; i < list.length; i++) {
			const cur = list[i];
			if (!cur?.lyric.hyphenated) {
				continue;
			}
			const from = Math.max(
				cur.left + cur.width - LYRIC_PADDING,
				cur.melismaEndX ?? -Infinity,
			);
			const next = list[i + 1];
			if (!next) {
				const staveRight =
					typeof cur.stave.getX === 'function' &&
					typeof cur.stave.getWidth === 'function'
						? cur.stave.getX() + cur.stave.getWidth()
						: from + HYPHEN_EDGE_OFFSET * 2;
				const x =
					from +
					Math.min(HYPHEN_EDGE_OFFSET, Math.max(4, (staveRight - from) / 2));
				cur.lyric.drawHyphen(context, x);
				continue;
			}
			const to = next.left + LYRIC_PADDING;
			const gap = to - from;
			if (gap <= 0) {
				continue;
			}
			const restTicks = rowRests.reduce(
				(sum, r) => (r.x > from && r.x < to ? sum + r.ticks : sum),
				0,
			);
			if (
				restTicks >= EXTENDED_REST_TICKS &&
				gap > 2 * HYPHEN_EDGE_OFFSET + 10
			) {
				const curStaveRight =
					typeof cur.stave.getX === 'function' &&
					typeof cur.stave.getWidth === 'function'
						? cur.stave.getX() + cur.stave.getWidth() - 4
						: from + HYPHEN_EDGE_OFFSET;
				const nextStaveLeft =
					typeof next.stave.getX === 'function'
						? next.stave.getX() + 4
						: to - HYPHEN_EDGE_OFFSET;
				cur.lyric.drawHyphen(
					context,
					Math.min(from + HYPHEN_EDGE_OFFSET, curStaveRight),
				);
				next.lyric.drawHyphen(
					context,
					Math.max(to - HYPHEN_EDGE_OFFSET, nextStaveLeft),
				);
				continue;
			}
			const count =
				hyphenDistance !== null
					? Math.max(1, Math.floor(gap / hyphenDistance))
					: 1;
			for (let k = 1; k <= count; k++) {
				cur.lyric.drawHyphen(context, from + (gap * k) / (count + 1));
			}
		}
	}
	context.restore();
}

/* Whether the last syllable of `(system, row, verseIndex)` opened or continued a word. */
function endedHyphenated(
	pinned: readonly PinnedSyllable[],
	system: number,
	row: number,
	verseIndex: number,
): boolean {
	let last: PinnedSyllable | undefined;
	for (const p of pinned) {
		if (
			p.system === system &&
			p.row === row &&
			p.verseIndex === verseIndex &&
			(!last || p.left >= last.left)
		) {
			last = p;
		}
	}
	return last?.lyric.hyphenated === true;
}
