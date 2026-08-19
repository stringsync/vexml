import { DEFAULT_TEMPO_BPM } from './constants';

/** One stretch of the timeline played at a constant rate, in quarter-note beats. */
export type TempoSegment = { startBeat: number; endBeat: number; bpm: number };

/**
 * The score's tempo map: the contiguous, ordered rate segments playback runs on, and the two
 * conversions between beats and milliseconds they define.
 *
 * SequenceFactory builds one while it walks playback order and hands it to the Sequence, which
 * is why this is its own object rather than a pair of Sequence methods — the factory has to date
 * its own steps before there is a Sequence to ask.
 */
export class TempoMap {
	constructor(private readonly segments: readonly TempoSegment[]) {}

	/**
	 * Quarter-note beats -> milliseconds. Folds the elapsed time of every segment the beat spans,
	 * plus the partial of the segment it lands in. A beat past the last segment extrapolates at
	 * the last segment's rate.
	 */
	msAt(beats: number): number {
		const last = this.segments.at(-1);
		if (!last) {
			return (beats / DEFAULT_TEMPO_BPM) * 60000;
		}
		let ms = 0;
		for (const seg of this.segments) {
			if (beats <= seg.startBeat) {
				break;
			}
			const upto = Math.min(beats, seg.endBeat);
			ms += ((upto - seg.startBeat) / seg.bpm) * 60000;
		}
		if (beats > last.endBeat) {
			ms += ((beats - last.endBeat) / last.bpm) * 60000;
		}
		return ms;
	}

	/** Milliseconds -> quarter-note beats: the monotonic inverse of {@link msAt}. */
	beatsAt(ms: number): number {
		const last = this.segments.at(-1);
		if (!last) {
			return (ms / 60000) * DEFAULT_TEMPO_BPM;
		}
		let elapsed = 0;
		for (const seg of this.segments) {
			const segMs = ((seg.endBeat - seg.startBeat) / seg.bpm) * 60000;
			if (ms <= elapsed + segMs) {
				return seg.startBeat + ((ms - elapsed) / 60000) * seg.bpm;
			}
			elapsed += segMs;
		}
		return last.endBeat + ((ms - elapsed) / 60000) * last.bpm;
	}
}
