import { disposables, type Resource } from 'webappwiz/disposable';
import { Dispatcher, type Eventful } from 'webappwiz/events';
import { INSTRUMENT_KEY } from './constants';
import type { Instrument } from './instrument';
import { INSTRUMENTS, OPENING_INSTRUMENT } from './instruments';
import { PianoInstrument } from './piano-instrument';

type InstrumentHolderEvents = { changed: undefined };

/*
 * The instrument to open with, from whatever the last visit stored.
 *
 * A name the menu no longer offers falls back to OPENING_INSTRUMENT: smplr fetches samples by
 * name, so a stale one 404s and the site plays nothing at all, which looks exactly like broken
 * audio. '' is the one to expect — the grand piano was stored that way before it had a value of
 * its own.
 */
function openingName(stored: string | null): string {
	return INSTRUMENTS.some((i) => i.value === stored) && stored
		? stored
		: OPENING_INSTRUMENT;
}

/*
 * The live synth voice, its persisted name, and the mute toggle.
 *
 * The three have to agree: changing the name builds a new instrument, which has to inherit the
 * current mute state, and the old one has to be disposed or its AudioContext leaks (a page gets
 * only a few dozen). Muting must not rebuild, because that re-downloads samples. Holding them
 * together is what makes both true without a mirror ref.
 */
export class InstrumentHolder
	implements Eventful<InstrumentHolderEvents>, Resource
{
	private readonly dispatcher = new Dispatcher<InstrumentHolderEvents>();
	readonly events = this.dispatcher.events;

	name: string;
	muted = false;

	private instrument: Instrument;

	constructor(private readonly storage: Storage) {
		this.name = openingName(storage.getItem(INSTRUMENT_KEY));
		this.instrument = new PianoInstrument(this.name);
	}

	/* The instrument to play through. Never null, so a caller does not have to check. */
	current(): Instrument {
		return this.instrument;
	}

	/* Warm the samples so the first play does not drop onsets while loading. */
	preload(): void {
		this.instrument.preload();
	}

	/* Swap the instrument, disposing the one it replaces. */
	setName(name: string): void {
		if (name === this.name) {
			return;
		}
		this.name = name;
		this.storage.setItem(INSTRUMENT_KEY, name);
		this.instrument.dispose();
		this.instrument = new PianoInstrument(name);
		this.instrument.setMuted(this.muted);
		this.instrument.preload();
		this.dispatcher.dispatch('changed');
	}

	setMuted(muted: boolean): void {
		if (muted === this.muted) {
			return;
		}
		this.muted = muted;
		this.instrument.setMuted(muted);
		this.dispatcher.dispatch('changed');
	}

	toggleMuted(): void {
		this.setMuted(!this.muted);
	}

	dispose(): void {
		this.instrument.dispose();
		this.dispatcher.dispose();
	}
}

/* For a caller that wants an Instrument-shaped nothing (no Web Audio available). */
export const SILENT: Instrument = {
	play: () => disposables.noop(),
	pluck: () => {},
	stopAll: () => {},
	preload: () => {},
	setMuted: () => {},
	dispose: () => {},
};
