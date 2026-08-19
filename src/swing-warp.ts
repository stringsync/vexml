import type { Swing } from './score-reader';

/**
 * One measure's swung beat axis: the swing in force, warped onto that measure's played length
 * and meter. The identity when nothing is swinging.
 *
 * Each pair of swung notes spans `2 * unit` beats; the warp stretches the on-beat half to
 * `first / (first + second)` of that span and squeezes the off-beat half into what's left. The
 * pair boundaries are fixed points, so a measure keeps its length and only the off-beats move —
 * which means one warp maps a note's onset, its end, and the measure's own length without any of
 * them drifting apart.
 *
 * The grid is phased off the notated downbeat rather than off the measure's first beat. A full
 * measure starts on a boundary, but a pickup starts part-way through a pair, and without the
 * shift its off-beat eighth would be read as an on-beat and played LONG instead of short —
 * backwards, and audible on the very first note of any swung tune with an anacrusis.
 *
 * Exempt notes (see {@link Note.isSwingExempt}) skip the warp entirely and keep their written
 * beats. That stays consistent with their swung neighbors because the pair boundaries are fixed
 * points: a triplet filling a beat still starts and ends where the warp leaves that beat, and
 * only its interior stays even.
 */
export class SwingWarp {
	// Null when nothing swings — an even ratio is no swing at all — which makes at() the identity.
	private readonly swing: Swing | null;
	private readonly span: number;
	private readonly onBeatSpan: number;
	// How far into a swung pair this measure's first beat sits. A full measure starts on a pair
	// boundary; a pickup is short by exactly the beats the meter says are missing.
	private readonly phase: number;
	private readonly origin: number;

	constructor(swing: Swing | null, opts: SwingWarpOptions) {
		this.swing = swing && swing.first !== swing.second ? swing : null;
		this.span = this.swing ? 2 * this.swing.unit : 0;
		this.onBeatSpan = this.swing
			? (this.swing.first / (this.swing.first + this.swing.second)) * this.span
			: 0;
		this.phase =
			this.swing && opts.meterBeats > opts.playedBeats
				? (opts.meterBeats - opts.playedBeats) % this.span
				: 0;
		this.origin = this.warp(this.phase);
	}

	/** Where `beat` lands on this measure's swung axis. */
	at(beat: number): number {
		return this.swing ? this.warp(beat + this.phase) - this.origin : beat;
	}

	// The unphased warp: where `beat` lands measuring from a pair boundary.
	private warp(beat: number): number {
		const swing = this.swing;
		if (!swing) {
			return beat;
		}
		const pair = Math.floor(beat / this.span);
		const into = beat - pair * this.span;
		const warped =
			into <= swing.unit
				? (into / swing.unit) * this.onBeatSpan
				: this.onBeatSpan +
					((into - swing.unit) / swing.unit) * (this.span - this.onBeatSpan);
		return pair * this.span + warped;
	}
}

export interface SwingWarpOptions {
	/** The measure's played length in quarter-note beats — a pickup is short. */
	playedBeats: number;
	/** What the meter says a full measure of it holds. */
	meterBeats: number;
}
