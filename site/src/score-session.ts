import type {
	CursorController,
	CursorEventMap,
	Element,
	Score,
	ScoreEventMap,
} from '@stringsync/vexml';
import { Note, TabPosition } from '@stringsync/vexml';
import { Disposer, disposables, type Resource } from 'webappwiz/disposable';
import { Dispatcher, type Eventful } from 'webappwiz/events';
import { ACTIVE_COLOR, GRACE_MS, HALO_COLOR, HOVER_COLOR } from './constants';
import { describe } from './format';
import type { Instrument } from './instrument/instrument';

type ScoreSessionEvents = {
	/* Anything a component reads has moved: time, playing, tooltip, duration. */
	changed: undefined;
};

/* Where the hover tooltip sits and what it says, in client coordinates. */
export interface Tooltip {
	x: number;
	y: number;
	text: string;
}

/*
 * Everything that happens to a rendered score while the user is looking at it: playback position,
 * which notes are sounding and which voices are sounding them, which note is hovered or pinned, and
 * the tooltip that follows.
 *
 * These are one model, not several. Cursor coloring and the hover halo share a single color channel
 * per note, so `recolor` has to resolve both; a voice has to be released exactly when its note
 * leaves the sounding set; the tooltip follows whatever `apply` last resolved. Splitting them would
 * mean each half reaching into the other.
 *
 * One session owns one Score. Disposing it detaches every listener, releases every voice, and
 * disposes the score.
 */
export class ScoreSession implements Eventful<ScoreSessionEvents>, Resource {
	private readonly dispatcher = new Dispatcher<ScoreSessionEvents>();
	readonly events = this.dispatcher.events;

	readonly cursor: CursorController;
	readonly durationMs: number;
	timeMs = 0;
	playing = false;
	tooltip: Tooltip | null = null;

	private readonly disposer = new Disposer();
	// The notes currently sounding, so a change can tell what newly started and what stopped.
	private readonly lit = new Set<Note>();
	// The voice each sounding note owns, keyed by Note (not pitch) so a re-struck pitch, which a
	// transition reports in both `stopped` and `started`, releases the old voice and attacks fresh.
	private readonly voices = new Map<Note, Resource>();
	// A click pins a target; hover is transient. The pinned one wins, so hovering elsewhere never
	// clears the pin.
	private pinned: Element | null = null;
	private hovered: Element | null = null;
	// The note whose halo is lit, so the next move can turn it back off.
	private halo: Note | null = null;
	private raf = 0;

	constructor(
		readonly score: Score,
		private readonly container: HTMLDivElement,
		private readonly instrument: () => Instrument | null,
	) {
		this.durationMs = score.getDurationMs();
		this.disposer.use(this.dispatcher);
		this.disposer.adopt(score, (s) => s.dispose());
		this.disposer.defer(() => this.stop());
		this.disposer.defer(() => this.clearHighlight());

		// Headless cursor plus the built-in bar view. Page-turn scrolling: when the bar crosses out
		// of the scroll box (by moving, or the user scrolling it away), bring it back.
		this.cursor = score.createCursor();
		this.disposer.use(this.cursor.sync(score.createPlayhead()));
		this.onCursor('visibility', (e) => {
			if (!e.fullyVisible && this.playing) {
				this.cursor.scrollIntoView();
			}
		});
		this.onCursor('change', (e) => {
			this.timeMs = e.timeMs;
			this.paint(e.highlighted);
			// Release stopped notes, then attack started ones (only while playing, so seeking and
			// scrubbing stay silent). Stop before start so a re-strike re-attacks cleanly.
			for (const n of e.stopped) {
				this.voices.get(n)?.dispose();
				this.voices.delete(n);
			}
			if (this.playing) {
				for (const n of e.started) {
					this.attack(n);
				}
			}
			this.dispatcher.dispatch('changed');
		});

		this.onScore('hover', (e) => {
			this.hovered = e.target;
			this.apply();
		});
		this.onScore('click', (e) => {
			// Only notes and frets are pinnable; clicking a measure or empty space unpins.
			const target =
				e.target instanceof Note || e.target instanceof TabPosition
					? e.target
					: null;
			this.pinned = this.pinned === target ? null : target;
			this.apply();
		});
		// Click or drag anywhere on the score scrubs the cursor to that position's time.
		this.onScore('pointerdown', (e) => this.seekTo(e.point));
		this.onScore('pointermove', (e) => {
			// buttons === 1 means the primary button is held, so this continues the scrub during a
			// drag and ignores a plain hover: no manual drag-state flag needed.
			if (e.native.buttons === 1) {
				this.seekTo(e.point);
				this.follow();
			}
		});
		// Finishing a scrub-drag: if the cursor landed off-screen, bring it into view (the
		// playing-gated visibility listener above stays quiet while paused).
		this.onScore('pointerup', () => this.follow());

		this.paint(this.cursor.getHighlightedElements());
	}

	/* Start or stop the play loop. Starting from the end restarts from the top. */
	togglePlay(): void {
		if (this.playing) {
			this.stop();
			return;
		}
		if (this.cursor.isDone()) {
			this.cursor.seekMs(0);
		}
		// Bring the cursor into view when starting (e.g. after scrolling away while paused).
		this.follow();
		this.start();
	}

	setPlaying(playing: boolean): void {
		if (playing === this.playing) {
			return;
		}
		if (playing) {
			this.start();
		} else {
			this.stop();
		}
	}

	/* Step to the previous onset, pausing first: stepping is a paused-only move. */
	previous(): void {
		this.stop();
		this.cursor.previous();
	}

	next(): void {
		this.stop();
		this.cursor.next();
	}

	seekMs(ms: number): void {
		this.cursor.seekMs(ms);
	}

	dispose(): void {
		this.disposer.dispose();
	}

	// ponytail: wall-clock RAF, not an audio clock. Good enough for a demo; swap in the
	// AudioContext's currentTime if drift against the synth ever shows.
	private start(): void {
		this.playing = true;
		// The note under the cursor fired its `started` event while paused (during load or a seek),
		// so the loop, which moves within that note's duration, never sees it start. Attack the
		// already-sounding notes here so the first (or resumed) note actually sounds.
		for (const n of this.cursor.getActiveElements()) {
			this.attack(n);
		}
		let last = performance.now();
		const tick = (now: number) => {
			const next = this.cursor.getTimeMs() + (now - last);
			last = now;
			if (next >= this.durationMs) {
				this.cursor.seekMs(this.durationMs);
				this.stop();
				return;
			}
			this.cursor.seekMs(next);
			this.raf = requestAnimationFrame(tick);
		};
		this.raf = requestAnimationFrame(tick);
		this.dispatcher.dispatch('changed');
	}

	private stop(): void {
		cancelAnimationFrame(this.raf);
		this.raf = 0;
		if (!this.playing) {
			return;
		}
		this.playing = false;
		// Cut the sounding voices: pause, end and teardown all land here.
		for (const voice of this.voices.values()) {
			voice.dispose();
		}
		this.voices.clear();
		this.instrument()?.stopAll();
		this.dispatcher.dispatch('changed');
	}

	private seekTo(point: { x: number; y: number }): void {
		const at = this.score.getTimeAt(point);
		if (at) {
			this.stop();
			this.cursor.seekMs(at.ms);
		}
	}

	private follow(): void {
		if (!this.cursor.isFullyVisible()) {
			this.cursor.scrollIntoView({ behavior: 'smooth' });
		}
	}

	// Cursor coloring and the hover halo share one color channel, so this resolves both: hover wins
	// while a note is hovered, otherwise the active color shows, otherwise it clears.
	private recolor(n: Note): void {
		if (n === this.halo) {
			n.color.on(HOVER_COLOR);
		} else if (this.lit.has(n)) {
			n.color.on(ACTIVE_COLOR);
		} else {
			n.color.off();
		}
	}

	// Rests never enter `lit` (no pitch), so only sounding notes get the active color.
	private paint(active: readonly Note[]): void {
		const sounding = active.filter((n) => n.getPitch() !== null);
		for (const n of [...this.lit]) {
			if (!sounding.includes(n)) {
				this.lit.delete(n);
				this.recolor(n);
			}
		}
		for (const n of sounding) {
			if (!this.lit.has(n)) {
				this.lit.add(n);
				this.recolor(n);
			}
		}
	}

	// Attack one sounding note, registering its voice. No-op if already voiced, so a re-attack of a
	// still-sounding note is skipped.
	private attack(n: Note): void {
		const instrument = this.instrument();
		const pitch = n.getPitch();
		if (!instrument || !pitch || this.voices.has(n)) {
			return;
		}
		const graces = n.getGraceNotes();
		if (graces.length === 0) {
			this.voices.set(n, instrument.play(pitch));
			return;
		}
		// Grace notes steal no timeline time, so sound them as quick plucks staggered just before
		// the main note, then attack the main note after the run. The returned voice cancels a
		// still-pending main attack (clearTimeout) or releases the live one; stopAll is the backstop.
		let offset = 0;
		for (const g of graces) {
			const gp = g.getPitch();
			if (gp) {
				const at = offset;
				// Light the grace while it sounds, then clear it as the next one (or the main note)
				// takes over.
				setTimeout(() => {
					instrument.pluck(gp, GRACE_MS);
					g.color.on(ACTIVE_COLOR);
				}, at);
				setTimeout(() => g.color.off(), at + GRACE_MS);
				offset += GRACE_MS;
			}
		}
		let voice: Resource = disposables.noop();
		const id = setTimeout(() => {
			voice = instrument.play(pitch);
		}, offset);
		this.voices.set(
			n,
			disposables.callback(() => {
				clearTimeout(id);
				voice.dispose();
			}),
		);
	}

	// Resolve the pinned-or-hovered target into the lit halo, the cursor shape and the tooltip.
	private apply(): void {
		const target = this.pinned ?? this.hovered;
		const note =
			target instanceof Note
				? target
				: target instanceof TabPosition
					? target.getNote()
					: null;
		if (note !== this.halo) {
			const prev = this.halo;
			this.halo = note;
			prev?.halo.off();
			// recolor reads this.halo, so it is updated first: prev falls back to its active color
			// (or clears), note picks up the hover color.
			if (prev) {
				this.recolor(prev);
			}
			note?.halo.on(HALO_COLOR);
			if (note) {
				this.recolor(note);
			}
		}
		this.container.style.cursor = note ? 'pointer' : '';
		// Only note-bearing targets get a tooltip; describe() is empty for a measure.
		if (note && target) {
			const r = target.getBoundingClientRect();
			this.tooltip = {
				x: r.left + r.width / 2,
				y: r.top,
				text: describe(target),
			};
		} else {
			this.tooltip = null;
		}
		this.dispatcher.dispatch('changed');
	}

	private clearHighlight(): void {
		this.halo?.halo.off();
		this.halo?.color.off();
		this.halo = null;
		this.container.style.cursor = '';
		this.tooltip = null;
	}

	// Subscribe to the cursor for the session's lifetime, releasing on dispose. Typed per source
	// rather than generically: vexml's Listenable is generic in its event map, which TypeScript
	// cannot infer through, so one helper for both would erase the payload types.
	private onCursor<K extends keyof CursorEventMap>(
		type: K,
		listener: (event: CursorEventMap[K]) => void,
	): void {
		this.cursor.addEventListener(type, listener);
		this.disposer.defer(() => this.cursor.removeEventListener(type, listener));
	}

	private onScore<K extends keyof ScoreEventMap>(
		type: K,
		listener: (event: ScoreEventMap[K]) => void,
	): void {
		this.score.addEventListener(type, listener);
		this.disposer.defer(() => this.score.removeEventListener(type, listener));
	}
}
