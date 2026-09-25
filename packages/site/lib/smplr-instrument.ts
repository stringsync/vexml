import { type Smplr, Soundfont } from 'smplr';
import { disposables, type Resource } from 'webappwiz/disposable';
import type { Instrument } from './instrument';

// smplr's volume scale is MIDI-style (0–127). 100 is a comfortable default.
const VOLUME = 100;

/*
 * Sampled instrument via smplr: the named General MIDI instrument, loaded as a Soundfont.
 *
 * Samples stream from smplr's CDN and a note struck before they land cannot be recovered, so
 * await load() before playing.
 */
export class SmplrInstrument implements Instrument {
	private ctx: AudioContext | null = null;
	private synth: Smplr | null = null;
	private ready = false;
	private loading: Promise<void> | null = null;
	private loaded = false;
	private muted = false;

	constructor(private readonly instrument: string) {}

	play(pitch: string): Resource {
		const synth = this.ensure();
		// Before samples load, an onset can't be recovered, so drop it (awaiting load() prevents it).
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

	/*
	 * Waits for the three slow things between a first play and a note that sounds: the samples
	 * decoding, the context resuming, and (on macOS especially) the output device actually
	 * starting, which can lag the context reading "running". A failed load is forgotten so the
	 * next call tries again.
	 */
	load(): Promise<void> {
		// Every call resumes a suspended context, so the one made inside a click is what starts it.
		const synth = this.ensure();
		const ctx = this.ctx;
		if (!synth || !ctx) {
			// No Web Audio at all: nothing will ever sound, so there is nothing to wait for.
			return Promise.resolve();
		}
		if (!this.loading) {
			const loading = (async () => {
				await synth.ready;
				await running(ctx);
				await rendered(ctx);
			})();
			this.loading = loading;
			loading.then(
				() => {
					if (this.loading === loading) {
						this.loaded = true;
					}
				},
				() => {
					if (this.loading === loading) {
						this.loading = null;
					}
				},
			);
		}
		return this.loading;
	}

	isLoaded(): boolean {
		return this.loaded;
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
		this.loading = null;
		this.loaded = false;
	}

	private running(): boolean {
		return this.ctx?.state === 'running';
	}

	/*
	 * Run `start` once the context is actually running.
	 *
	 * load() builds the AudioContext before the page has seen a user gesture, so the browser
	 * starts it suspended and resume() only takes effect a few ms later. A note started in
	 * between is scheduled against a currentTime that isn't advancing, and by the time the clock
	 * runs its whole envelope is in the past. The first chord of the first playback goes
	 * missing. Waiting costs those few ms and sounds the note.
	 */
	private whenRunning(start: () => void): void {
		if (this.running()) {
			start();
			return;
		}
		void this.ctx?.resume().then(start);
	}

	// Lazily created on first use so the AudioContext starts inside a user gesture (or on load).
	private ensure(): Smplr | null {
		if (!this.synth) {
			const Ctor = window.AudioContext;
			if (!Ctor) {
				return null;
			}
			this.ctx = new Ctor();
			// A Soundfont instrument is one file, which keeps the preload window short. smplr's
			// sampled SplendidGrandPiano sounds better but costs a file per note per velocity layer,
			// which reads as a piano that does not work.
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

/*
 * Resolves when the context reaches "running". Waits on statechange rather than on resume(),
 * whose promise can settle before the state does. Rejects if the context closes first (the
 * instrument was disposed mid-load), so a waiter is not left hanging.
 */
function running(ctx: AudioContext): Promise<void> {
	return new Promise((resolve, reject) => {
		const check = (): boolean => {
			if (ctx.state === 'running') {
				resolve();
				return true;
			}
			if (ctx.state === 'closed') {
				reject(new Error('AudioContext closed while loading'));
				return true;
			}
			return false;
		};
		if (check()) {
			return;
		}
		const onChange = () => {
			if (check()) {
				ctx.removeEventListener('statechange', onChange);
			}
		};
		ctx.addEventListener('statechange', onChange);
	});
}

// Plays one sample of silence. Its "ended" fires only once the output has really played it,
// which on macOS can be a beat after the context reads "running". A closed context never ends
// it, so closing rejects instead.
function rendered(ctx: AudioContext): Promise<void> {
	return new Promise((resolve, reject) => {
		const source = ctx.createBufferSource();
		source.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
		source.connect(ctx.destination);
		const onChange = () => {
			if (ctx.state === 'closed') {
				ctx.removeEventListener('statechange', onChange);
				reject(new Error('AudioContext closed while loading'));
			}
		};
		ctx.addEventListener('statechange', onChange);
		source.addEventListener('ended', () => {
			ctx.removeEventListener('statechange', onChange);
			source.disconnect();
			resolve();
		});
		source.start();
	});
}

// vexflow key ("C#/4") → smplr note name ("C#4"). smplr handles enharmonics (Db4) itself.
function toNote(pitch: string): string {
	return pitch.replace('/', '');
}
