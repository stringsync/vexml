import type { GapInfo } from './score';
import type { TempoMap } from './tempo-map';

/** One pass through a measure in playback order (see {@link Timeline.getBars}). */
export interface TimelineBar {
	readonly measureIndex: number;
	readonly startMs: number;
	readonly endMs: number;
}

/**
 * A score's playback timing without its engraving (see `readTimeline`): the same duration,
 * beat-to-ms mapping, bar times and gaps the rendered Score reports for the same document and
 * gaps, built without laying the score out or drawing it.
 */
export class Timeline {
	constructor(
		private readonly tempo: TempoMap,
		private readonly durationBeats: number,
		private readonly bars: readonly TimelineBar[],
		private readonly gaps: readonly GapInfo[],
	) {}

	/** The whole playback in ms, repeats unrolled (Score.getDurationMs). */
	getDurationMs(): number {
		return this.tempo.msAt(this.durationBeats);
	}

	/** The whole playback in quarter-note beats, repeats unrolled. */
	getDurationBeats(): number {
		return this.durationBeats;
	}

	/** Quarter-note beats from the start to ms, through the score's tempo marks and gaps
	 * (Sequence.beatsToMs). */
	beatsToMs(beats: number): number {
		return this.tempo.msAt(beats);
	}

	/** Every measure pass in playback order, repeats and voltas unrolled: a measure that
	 * plays twice, even back to back, has two entries. */
	getBars(): readonly TimelineBar[] {
		return this.bars;
	}

	/** Each configured gap's timing, in config order (Score.getGaps). */
	getGaps(): readonly GapInfo[] {
		return this.gaps;
	}
}
