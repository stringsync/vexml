import { type Smplr, Soundfont, SplendidGrandPiano } from 'smplr';
import { disposables, type Resource } from 'webappwiz/disposable';
import type { Instrument } from './instrument';

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

	play(pitch: string): Resource {
		const synth = this.ensure();
		// Before samples load, an onset can't be recovered — drop it (preload() makes this rare).
		if (!synth || !this.ready) {
			return disposables.noop();
		}
		return disposables.callback(synth.start({ note: toNote(pitch) }));
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

	// Releases the AudioContext this built. A browser allows only a few dozen live contexts per
	// page, so an instrument swapped out without this eventually starves the next one of audio.
	dispose(): void {
		this.stopAll();
		void this.ctx?.close();
		this.ctx = null;
		this.synth = null;
		this.ready = false;
	}

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
}
