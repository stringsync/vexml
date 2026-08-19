import { type Smplr, Soundfont } from 'smplr';
import { disposables, type Resource } from 'webappwiz/disposable';
import type { Instrument } from './instrument';
import { GRAND_PIANO } from './instruments';

// smplr's volume scale is MIDI-style (0–127). 100 is a comfortable default.
const VOLUME = 100;

// vexflow key ("C#/4") → smplr note name ("C#4"). smplr handles enharmonics (Db4) itself.
const toNote = (pitch: string) => pitch.replace('/', '');

/*
 * Sampled instrument via smplr: the named General MIDI instrument, loaded as a Soundfont.
 *
 * Samples stream from smplr's CDN and a note struck before they land cannot be recovered, so
 * preload() warms them. A Soundfont instrument is one file, which is what keeps that window
 * short — smplr's sampled SplendidGrandPiano sounds better and costs a file per note per
 * velocity layer, which reads as a piano that does not work.
 */
export class PianoInstrument implements Instrument {
	private ctx: AudioContext | null = null;
	private synth: Smplr | null = null;
	private ready = false;
	private muted = false;

	constructor(private readonly instrument = GRAND_PIANO) {}

	play(pitch: string): Resource {
		const synth = this.ensure();
		// Before samples load, an onset can't be recovered — drop it (preload() makes this rare).
		if (!synth || !this.ready) {
			return disposables.noop();
		}
		if (this.running()) {
			return disposables.callback(synth.start({ note: toNote(pitch) }));
		}
		// The context is still resuming (see whenRunning). Hold the note until it is, and let a
		// release that arrives first cancel it rather than sound a note nobody is waiting for.
		let stop: (() => void) | null = null;
		let released = false;
		this.whenRunning(() => {
			if (!released) {
				stop = synth.start({ note: toNote(pitch) });
			}
		});
		return disposables.callback(() => {
			released = true;
			stop?.();
		});
	}

	pluck(pitch: string, durationMs: number): void {
		const synth = this.ensure();
		if (!synth) {
			return;
		}
		this.whenRunning(() =>
			synth.start({ note: toNote(pitch), duration: durationMs / 1000 }),
		);
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

	private running(): boolean {
		return this.ctx?.state === 'running';
	}

	/*
	 * Run `start` once the context is actually running.
	 *
	 * preload() builds the AudioContext before the page has seen a user gesture, so the browser
	 * starts it suspended and resume() only takes effect a few ms later. A note started in
	 * between is scheduled against a currentTime that isn't advancing, and by the time the clock
	 * runs its whole envelope is in the past — the first chord of the first playback goes
	 * missing. Waiting costs those few ms and sounds the note.
	 */
	private whenRunning(start: () => void): void {
		if (this.running()) {
			start();
			return;
		}
		void this.ctx?.resume().then(start);
	}

	// Lazily created on first use so the AudioContext starts inside a user gesture (or on preload).
	private ensure(): Smplr | null {
		if (!this.synth) {
			const Ctor = window.AudioContext;
			if (!Ctor) {
				return null;
			}
			this.ctx = new Ctor();
			this.synth = Soundfont(this.ctx, { instrument: this.instrument });
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
