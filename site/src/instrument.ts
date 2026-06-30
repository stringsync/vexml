import { type Smplr, Soundfont, SplendidGrandPiano } from 'smplr';

// Popular options for the instrument picker. '' uses smplr's high-quality SplendidGrandPiano;
// every other value is a General MIDI name loaded via smplr's Soundfont. Order is the menu order.
export const INSTRUMENTS: ReadonlyArray<{ label: string; value: string }> = [
	{ label: 'Grand Piano', value: '' },
	{ label: 'Electric Piano', value: 'electric_piano_1' },
	{ label: 'Harpsichord', value: 'harpsichord' },
	{ label: 'Acoustic Guitar', value: 'acoustic_guitar_nylon' },
	{ label: 'Vibraphone', value: 'vibraphone' },
	{ label: 'Marimba', value: 'marimba' },
	{ label: 'Church Organ', value: 'church_organ' },
	{ label: 'Violin', value: 'violin' },
	{ label: 'Cello', value: 'cello' },
	{ label: 'Flute', value: 'flute' },
	{ label: 'Trumpet', value: 'trumpet' },
];

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

// Sampled instrument via smplr. An empty name loads the high-quality SplendidGrandPiano; any other
// name loads that General MIDI instrument via Soundfont. Both share smplr's player surface (start /
// stop / ready / output), so the rest is identical. Samples stream from smplr's CDN; preload() warms
// them so notes aren't dropped on the first play.
export class PianoInstrument implements Instrument {
	private ctx: AudioContext | null = null;
	private synth: Smplr | null = null;
	private ready = false;
	private muted = false;

	constructor(private readonly instrument = '') {}

	// Lazily created on first use so the AudioContext starts inside a user gesture (or on preload).
	private ensure(): Smplr | null {
		if (!this.synth) {
			const Ctor = window.AudioContext;
			if (!Ctor) {
				return null;
			}
			this.ctx = new Ctor();
			this.synth = this.instrument
				? Soundfont(this.ctx, { instrument: this.instrument })
				: SplendidGrandPiano(this.ctx);
			this.synth.output.volume = this.muted ? 0 : VOLUME;
			this.synth.ready.then(() => {
				this.ready = true;
			});
		}
		if (this.ctx?.state === 'suspended') {
			void this.ctx.resume();
		}
		return this.synth;
	}

	play(pitch: string): () => void {
		const synth = this.ensure();
		// Before samples load, an onset can't be recovered — drop it (preload() makes this rare).
		if (!synth || !this.ready) {
			return () => {};
		}
		return synth.start({ note: toNote(pitch) });
	}

	pluck(pitch: string, durationMs: number): void {
		this.ensure()?.start({ note: toNote(pitch), duration: durationMs / 1000 });
	}

	stopAll(): void {
		this.synth?.stop();
	}

	preload(): void {
		this.ensure();
	}

	setMuted(muted: boolean): void {
		this.muted = muted;
		if (this.synth) {
			this.synth.output.volume = muted ? 0 : VOLUME;
		}
	}
}
