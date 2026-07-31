import type { Measure } from '@stringsync/mdom';

/*
 * The repeat and volta (ending) structure a document's `<barline>`s describe, resolved for
 * every measure in one document-order pass.
 *
 * Shared by the renderer (which draws the repeat dots and the volta brackets) and the playback
 * sequence (which expands the measures into jump order), so the two can't disagree about where
 * a repeat block or an ending begins and ends.
 *
 * An ending spans measures and MusicXML only marks its edges, so the middle of a run is only
 * knowable in document order. Two encodings appear in the wild and both resolve here: the
 * standard one marks `start` on the run's first measure and `stop` on its last, while some
 * exporters restate `start`/`stop` on every measure of the run. A `stop` the next measure
 * immediately reopens with the same number is that restatement — one bracket over the whole
 * run, one ending for playback — not a pile of adjacent one-measure endings.
 */
export type MeasureRepeat = {
	/** A left `<repeat direction="forward"/>`: the measure opens a repeat block. */
	repeatBegin: boolean;
	/** A right `<repeat direction="backward"/>`: the measure closes one. */
	repeatEnd: boolean;
	/** How many times a backward repeat plays the block; null when there is no repeat end. */
	repeatTimes: number | null;
	/** The ending (volta) run covering this measure, or null when it's outside one. */
	ending: MeasureEnding | null;
};

export type MeasureEnding = {
	/** The raw `<ending number>` — a list or range like `"1"`, `"1,2"`, `"1-3"`. */
	number: string;
	/** Whether the run starts here (its bracket's left hook). */
	first: boolean;
	/** Whether the run ends here (its bracket's right hook, and where playback jumps). */
	last: boolean;
	/** The bracket stays open on the right, with no down hook. */
	open: boolean;
};

type Read = {
	repeatBegin: boolean;
	repeatEnd: boolean;
	repeatTimes: number | null;
	started: string | null;
	closed: 'stop' | 'discontinue' | null;
};

export function measureRepeats(measures: readonly Measure[]): MeasureRepeat[] {
	const read = measures.map(readBarlines);
	const out: MeasureRepeat[] = [];
	let open: string | null = null;
	for (const [i, r] of read.entries()) {
		// A measure with no `start` of its own inherits the run already open over it.
		const number: string | null = r.started ?? open;
		const first = number !== null && open === null;
		const restated: boolean =
			r.closed !== null && read[i + 1]?.started === number;
		const last: boolean = r.closed !== null && !restated;
		open = number === null || last ? null : number;
		out.push({
			repeatBegin: r.repeatBegin,
			repeatEnd: r.repeatEnd,
			repeatTimes: r.repeatTimes,
			ending:
				number === null
					? null
					: {
							number,
							first,
							last,
							// An ending closes with a down hook only when something jumps back from it, or
							// when the piece stops there. `discontinue` asks for an open bracket outright;
							// otherwise the backward repeat is the signal — a final ending runs on into
							// the music, so its bracket stays open even though exporters routinely still
							// write `type="stop"` on it. At the last measure there's nothing to run into.
							open:
								last &&
								(r.closed === 'discontinue' ||
									(!r.repeatEnd && i < read.length - 1)),
						},
		});
	}
	return out;
}

/* How many passes an ending covers, from its `<ending number>` ("1", "1,2", "1-3"). */
export function endingPasses(numberAttr: string | null): number {
	if (!numberAttr) {
		return 1;
	}
	let total = 0;
	for (const part of numberAttr.split(',')) {
		const range = part.trim().match(/^(\d+)\s*-\s*(\d+)$/);
		if (range) {
			total += Math.max(1, Number(range[2]) - Number(range[1]) + 1);
		} else if (part.trim()) {
			total += 1;
		}
	}
	return Math.max(1, total);
}

/* The FIRST pass an ending covers, from its `<ending number>` ("1" -> 1, "2,3" -> 2, "3-4" -> 3).
 * Playback compares this across adjacent runs: a number that doesn't climb means the volta group
 * restarted, i.e. the new run belongs to an enclosing repeat block. Defaults to 1 for a malformed
 * or absent attribute, which reads as a restart and so errs toward splitting rather than merging
 * two unrelated groups. */
export function endingFirstPass(numberAttr: string | null): number {
	return Number(numberAttr?.split(/[,-]/)[0]?.trim()) || 1;
}

/* One measure's `<barline>`s flattened: MusicXML allows several (a left repeat and a right one),
 * and the edge each sits on is already implied by its repeat direction and ending type. */
function readBarlines(measure: Measure): Read {
	const read: Read = {
		repeatBegin: false,
		repeatEnd: false,
		repeatTimes: null,
		started: null,
		closed: null,
	};
	for (const barline of measure.barlines) {
		if (barline.repeat === 'forward') {
			read.repeatBegin = true;
		} else if (barline.repeat === 'backward') {
			read.repeatEnd = true;
			read.repeatTimes = barline.repeatTimes;
		}
		const ending = barline.ending;
		if (ending?.type === 'start') {
			read.started = ending.number;
		} else if (ending) {
			read.closed = ending.type;
		}
	}
	return read;
}
