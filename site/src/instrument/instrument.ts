import type { Resource } from 'webappwiz/disposable';

// A pitched instrument the player drives. Pitches are vexflow keys ("C#/4", "Bb/3").
// Swap PianoInstrument for another implementation by satisfying this interface.
export interface Instrument extends Resource {
	// Strike a pitch now and return the voice sounding it, which the caller disposes to release
	// that voice. Each call is a fresh attack, so re-struck pitches (and unisons) each get their
	// own voice: the caller keys the returned voice by the Note it came from.
	play(pitch: string): Resource;
	// One-shot preview: sound a pitch for a fixed duration (e.g. clicking a note).
	pluck(pitch: string, durationMs: number): void;
	// Release every sounding voice at once (e.g. on pause).
	stopAll(): void;
	// Start fetching samples ahead of the first play so onsets aren't dropped while loading.
	preload(): void;
	setMuted(muted: boolean): void;
}
