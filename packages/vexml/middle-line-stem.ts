import { EPSILON } from './constants';

export type StemDirection = 'up' | 'down';

const MIDDLE_LINE = 3;

/* Behind Bars p. 48: the outermost head decides first. With equally distant
 * extremes, count the heads on each side, leaving middle-line heads neutral. */
export function stemFromKeyLines(lines: readonly number[]): StemDirection {
	const center = (Math.min(...lines) + Math.max(...lines)) / 2;
	if (center !== MIDDLE_LINE) {
		return center < MIDDLE_LINE ? 'up' : 'down';
	}
	const balance = lines.reduce(
		(total, line) => total + Math.sign(line - MIDDLE_LINE),
		0,
	);
	return balance < 0 ? 'up' : 'down';
}

export interface StemEntry<T> {
	readonly key: T;
	readonly onset: number;
	/** Known stem direction from an explicit `<stem>`, beam, or non-middle-line pitch. */
	readonly direction?: StemDirection;
	/** True for an unbeamed single note on the middle line whose stem is open. */
	readonly onMiddleLine: boolean;
}

export interface MeterGrouping {
	/** Quarter-note beats per beat (1 in 4/4, 1.5 in 6/8). */
	readonly beat: number;
	/** Quarter-note beats in the bar (0 when unmetered). */
	readonly bar: number;
}

/*
 * Choose the stem direction of each unbeamed middle-line note in one bar of a single voice
 * (Behind Bars pp. 13-14):
 * 1. Follow the nearest decided (non-middle-line or explicitly stemmed) notes either side
 *    within the bar when they agree or only one exists.
 * 2. When they disagree, follow the direction shared by the decided notes of the note's
 *    beat, or else its half-bar (in meters that divide into two equal whole-beat halves).
 * 3. Otherwise stem down.
 */
export function resolveMiddleLineStems<T>(
	entries: readonly StemEntry<T>[],
	meter: MeterGrouping,
): Map<T, StemDirection> {
	const stems = new Map<T, StemDirection>();
	if (!entries.some((entry) => entry.onMiddleLine)) {
		return stems;
	}
	const halfBar = halfBarOf(meter);
	for (let i = 0; i < entries.length; i++) {
		const entry = entries[i];
		if (!entry?.onMiddleLine) {
			continue;
		}
		const left = nearestDirection(entries, i, -1);
		const right = nearestDirection(entries, i, 1);
		let chosen: StemDirection | undefined;
		if (left && right) {
			if (left === right) {
				chosen = left;
			} else {
				chosen =
					groupDirection(entries, entry.onset, meter.beat) ??
					(halfBar !== undefined
						? groupDirection(entries, entry.onset, halfBar)
						: undefined);
			}
		} else {
			chosen = left ?? right;
		}
		stems.set(entry.key, chosen ?? 'down');
	}
	return stems;
}

function nearestDirection<T>(
	entries: readonly StemEntry<T>[],
	from: number,
	step: -1 | 1,
): StemDirection | undefined {
	for (let i = from + step; i >= 0 && i < entries.length; i += step) {
		const dir = entries[i]?.direction;
		if (dir) {
			return dir;
		}
	}
	return undefined;
}

function groupDirection<T>(
	entries: readonly StemEntry<T>[],
	onset: number,
	span: number,
): StemDirection | undefined {
	if (span <= 0) {
		return undefined;
	}
	const start = Math.floor((onset + EPSILON) / span) * span;
	const end = start + span;
	let shared: StemDirection | undefined;
	for (const entry of entries) {
		if (
			!entry.direction ||
			entry.onset < start - EPSILON ||
			entry.onset >= end - EPSILON
		) {
			continue;
		}
		if (shared === undefined) {
			shared = entry.direction;
		} else if (shared !== entry.direction) {
			return undefined;
		}
	}
	return shared;
}

function halfBarOf(meter: MeterGrouping): number | undefined {
	if (meter.bar <= 0 || meter.beat <= 0) {
		return undefined;
	}
	const beats = Math.round(meter.bar / meter.beat);
	if (
		beats < 4 ||
		beats % 2 !== 0 ||
		Math.abs(beats * meter.beat - meter.bar) > EPSILON
	) {
		return undefined;
	}
	return meter.bar / 2;
}
