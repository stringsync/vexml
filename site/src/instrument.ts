import { SplendidGrandPiano } from 'smplr';

// A pitched instrument the player drives. Pitches are vexflow keys ("C#/4", "Bb/3").
// Swap PianoInstrument for another implementation by satisfying this interface.
export interface Instrument {
	// Strike a pitch now and return a function that releases that specific voice. Each call is a
	// fresh attack, so re-struck pitches (and unisons) each get their own voice — the caller keys
	// the returned releaser by the Note it came from.
	play(pitch: string): () => void;
	// One-shot preview: sound a pitch for a fixed duration (e.g. clicking a note).
	pluck(pitch: string, durationMs: number): void;
	// Release every sounding voice at once (e.g. on pause).
	stopAll(): void;
	// Start fetching samples ahead of the first play so onsets aren't dropped while loading.
	preload(): void;
	setMuted(muted: boolean): void;
}

// smplr's volume scale is MIDI-style (0–127). 100 is a comfortable default.
const VOLUME = 100;

// vexflow key ("C#/4") → smplr note name ("C#4"). smplr handles enharmonics (Db4) itself.
const toNote = (pitch: string) => pitch.replace('/', '');

// Sampled grand piano via smplr. Samples stream from smplr's CDN; preload() warms them so notes
// aren't dropped on the first play. smplr tracks live voices itself — play() returns its stopper
// and stopAll() releases them all.
export class PianoInstrument implements Instrument {
	private ctx: AudioContext | null = null;
	private piano: ReturnType<typeof SplendidGrandPiano> | null = null;
	private ready = false;
	private muted = false;

	// Lazily created on first use so the AudioContext starts inside a user gesture (or on preload).
	private ensure(): ReturnType<typeof SplendidGrandPiano> | null {
		if (!this.piano) {
			const Ctor = window.AudioContext;
			if (!Ctor) {
				return null;
			}
			this.ctx = new Ctor();
			this.piano = SplendidGrandPiano(this.ctx);
			this.piano.output.volume = this.muted ? 0 : VOLUME;
			this.piano.ready.then(() => {
				this.ready = true;
			});
		}
		if (this.ctx?.state === 'suspended') {
			void this.ctx.resume();
		}
		return this.piano;
	}

	play(pitch: string): () => void {
		const piano = this.ensure();
		// Before samples load, an onset can't be recovered — drop it (preload() makes this rare).
		if (!piano || !this.ready) {
			return () => {};
		}
		return piano.start({ note: toNote(pitch) });
	}

	pluck(pitch: string, durationMs: number): void {
		this.ensure()?.start({ note: toNote(pitch), duration: durationMs / 1000 });
	}

	stopAll(): void {
		this.piano?.stop();
	}

	preload(): void {
		this.ensure();
	}

	setMuted(muted: boolean): void {
		this.muted = muted;
		if (this.piano) {
			this.piano.output.volume = muted ? 0 : VOLUME;
		}
	}
}
