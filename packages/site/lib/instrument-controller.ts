import { disposables, type Resource } from 'webappwiz/disposable';
import { Dispatcher, type Eventful } from 'webappwiz/events';
import { INSTRUMENT_KEY } from './constants';
import type { Instrument } from './instrument';
import { INSTRUMENTS, OPENING_INSTRUMENT } from './instruments';
import { SmplrInstrument } from './smplr-instrument';

type InstrumentControllerEvents = { changed: undefined };

/*
 * Owns the site's active instrument: which one is selected, whether it is muted, and the live
 * voice a caller plays through. Read current() for the Instrument to play, call setName() to
 * switch instruments, and setMuted() or toggleMuted() to mute. Dispose it when the site no
 * longer needs it.
 */
export class InstrumentController
	implements Eventful<InstrumentControllerEvents>, Resource
{
	private readonly dispatcher = new Dispatcher<InstrumentControllerEvents>();
	readonly events = this.dispatcher.events;

	name: string;
	muted = false;

	private instrument: Instrument;

	constructor(private readonly storage: Storage) {
		this.name = openingName(storage.getItem(INSTRUMENT_KEY));
		this.instrument = new SmplrInstrument(this.name);
	}

	/* The instrument to play through. Never null, so a caller does not have to check. */
	current(): Instrument {
		return this.instrument;
	}

	/* Warm the samples so the first play does not drop onsets while loading. */
	preload(): void {
		this.instrument.preload();
	}

	/*
	 * Rebuilds the instrument and disposes the one it replaces, or its AudioContext leaks (a
	 * page gets only a few dozen). The replacement inherits the current mute state so muting
	 * survives a swap; muting alone must not rebuild, because that re-downloads samples.
	 */
	setName(name: string): void {
		if (name === this.name) {
			return;
		}
		this.name = name;
		this.storage.setItem(INSTRUMENT_KEY, name);
		this.instrument.dispose();
		this.instrument = new SmplrInstrument(name);
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

/*
 * The instrument to open with, from whatever the last visit stored.
 *
 * A name the menu no longer offers falls back to OPENING_INSTRUMENT: smplr fetches samples by
 * name, so a stale one 404s and the site plays nothing at all, which looks exactly like broken
 * audio. '' is the one to expect: the grand piano was stored that way before it had a value of
 * its own.
 */
function openingName(stored: string | null): string {
	return INSTRUMENTS.some((i) => i.value === stored) && stored
		? stored
		: OPENING_INSTRUMENT;
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
