import type {
	CursorController,
	EditingController,
	EditingKey,
	EditingSession,
	Element,
	Score,
} from '@stringsync/vexml';
import { Note, TabPosition } from '@stringsync/vexml';
import { AnimationLoop } from 'webappwiz/browser';
import { Disposer, disposables, type Resource } from 'webappwiz/disposable';
import { Dispatcher, type Eventful, type Events } from 'webappwiz/events';
import { Duration, SystemClock, SystemTimer } from 'webappwiz/time';
import {
	ACTIVE_COLOR,
	CURSOR_COLOR,
	CURSOR_WIDTH_PX,
	GRACE_MS,
	HALO_COLOR,
	HOVER_COLOR,
} from './constants';
import type { EditingVoices } from './editing-voices';
import { formatPitch } from './format';
import type { Instrument } from './instrument';
import { PlayheadFollow } from './playhead-follow';
import { SiteEditingBindings } from './site-editing-bindings';

type ScoreSessionEvents = {
	/* Anything a component reads has moved: time, playing, selection, duration. */
	changed: undefined;
};

/*
 * Everything that happens to a rendered score while the user is looking at it: playback position,
 * which notes are sounding and which voices are sounding them, which note is hovered, and
 * the selected document note.
 *
 * One session owns one Score. Disposing it detaches every listener, releases every voice, and
 * disposes the score.
 */
export class ScoreSession implements Eventful<ScoreSessionEvents>, Resource {
	// Playback and hover share decoration state: a note's cursor
	// color and its hover halo share a single color channel, and a voice has to be released exactly
	// when its note leaves the sounding set. Splitting them would mean each half reaching into the
	// other.
	private readonly dispatcher = new Dispatcher<ScoreSessionEvents>();
	readonly events = this.dispatcher.events;

	readonly cursor: CursorController;
	readonly durationMs: number;
	readonly editing: EditingController;
	private readonly follower: PlayheadFollow;
	feedback: {
		action: 'previous-note' | 'next-note' | 'previous-measure' | 'next-measure';
		revision: number;
	} | null = null;
	timeMs = 0;
	playing = false;

	private readonly disposer = new Disposer();
	private readonly timer = new SystemTimer();
	private readonly loop = new AnimationLoop(new SystemClock());
	// Every frame of a drag calls beginSeek, so the flag latches the gesture: the second frame
	// would otherwise read the state the first one just paused and forget a resume was owed.
	private seeking = false;
	private resumeAfterSeek = false;
	// The notes currently sounding, so a change can tell what newly started and what stopped.
	private readonly lit = new Set<Note>();
	// The voice each sounding note owns, keyed by Note (not pitch) so a re-struck pitch, which a
	// transition reports in both `stopped` and `started`, releases the old voice and attacks fresh.
	private readonly voices = new Map<Note, Resource>();
	private hovered: Element | null = null;
	// The note whose halo is lit, so the next move can turn it back off.
	private halo: Note | null = null;

	constructor(
		readonly score: Score,
		private readonly container: HTMLDivElement,
		private readonly instrument: () => Instrument | null,
		readonly editingVoices: EditingVoices,
	) {
		this.durationMs = score.getDurationMs();
		this.disposer.use(this.dispatcher);
		this.disposer.use(this.loop);
		this.disposer.adopt(score, (s) => s.dispose());
		this.disposer.defer(() => this.stop());
		this.disposer.defer(() => this.clearHighlight());

		// Headless cursor plus the built-in bar view. Page-turn scrolling: when the bar crosses out
		// of the scroll box (by moving, or the user scrolling it away), bring it back.
		this.cursor = score.createCursor();
		this.follower = new PlayheadFollow(this.cursor);
		this.disposer.use(
			this.cursor.sync(
				score.createPlayhead({
					color: CURSOR_COLOR,
					widthPx: CURSOR_WIDTH_PX,
				}),
			),
		);
		this.watch(this.cursor.events, 'visibility', (e) => {
			if (!e.fullyVisible) {
				this.follower.update(this.playing);
			}
		});
		// The loop only runs between start() and stop(), so a frame here means playing.
		this.watch(this.loop.events, 'frame', ({ dt }) => {
			const next = this.cursor.getTimeMs() + dt.ms;
			if (next >= this.durationMs) {
				this.cursor.seekMs(this.durationMs);
				this.stop();
				return;
			}
			this.cursor.seekMs(next);
		});

		this.watch(this.cursor.events, 'change', (e) => {
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

		this.watch(this.score.events, 'hover', (e) => {
			this.hovered = e.target;
			this.apply();
		});
		this.editing = score.createEditingController(this.editor, {
			bindings: new SiteEditingBindings(
				this.editor,
				score.getSequence(),
				this.cursor,
			),
			selection: { color: HOVER_COLOR },
			toggleOnClick: true,
		});
		this.watch(this.editor.events, 'voicechange', () =>
			this.dispatcher.dispatch('changed'),
		);
		this.watch(this.editing.events, 'change', () => {
			this.setPlaying(false);
			this.syncPlayhead();
			this.dispatcher.dispatch('changed');
		});
		this.watch(this.editing.events, 'command', ({ command, moved }) => {
			this.setPlaying(false);
			if (
				moved &&
				command.type === 'move' &&
				(command.move.unit === 'note' || command.move.unit === 'measure')
			) {
				const action =
					`${command.move.direction === 1 ? 'next' : 'previous'}-${command.move.unit}` as NonNullable<
						ScoreSession['feedback']
					>['action'];
				this.feedback = {
					action,
					revision: (this.feedback?.revision ?? 0) + 1,
				};
				this.dispatcher.dispatch('changed');
			}
		});

		// Scrubbing opens on pointerdown rather than click so a press that becomes a drag seeks from
		// its first frame instead of waiting for the release.
		this.watch(this.score.events, 'pointerdown', (e) => {
			this.beginSeek();
			this.seekTo(e.point);
		});
		this.watch(this.score.events, 'pointermove', (e) => {
			// buttons === 1 means the primary button is held, so this continues the scrub during a
			// drag and ignores a plain hover: no manual drag-state flag needed. beginSeek also
			// catches a drag that started off the score and moved onto it.
			if (e.native.buttons === 1) {
				this.beginSeek();
				this.seekTo(e.point);
				this.follow();
			}
		});
		// Finishing a scrub-drag: hand playback back if the drag took it, and if the cursor landed
		// off-screen bring it into view (the playing-gated visibility listener above stays quiet
		// while paused).
		this.watch(this.score.events, 'pointerup', () => {
			this.endSeek();
			this.follow();
		});
		// A drag released off the score never reaches the score's own pointerup, so the window's
		// is what guarantees the gesture closes. endSeek does nothing when none is open.
		const onPointerUp = () => this.endSeek();
		window.addEventListener('pointerup', onPointerUp);
		this.disposer.defer(() =>
			window.removeEventListener('pointerup', onPointerUp),
		);

		this.paint(this.cursor.getHighlightedElements());
		this.syncPlayhead();
	}

	get editor(): EditingSession {
		return this.editingVoices.editor;
	}

	selectVoice(value: string): void {
		const voice = this.editingVoices.options.find(
			(option) => option.value === value,
		);
		if (voice) {
			this.editing.selectVoice(voice);
		}
	}

	get selectionDescription(): string {
		const focus = this.editor.getFocus();
		if (!focus) {
			return 'No selection';
		}
		const pitch = focus.pitch;
		let label = focus.isRest ? 'R' : 'Unpitched note';
		if (pitch) {
			label = formatPitch(pitch);
		}
		return `${label} · Measure ${focus.measure.number} · Beat ${focus.measureBeat === null ? '?' : focus.measureBeat + 1} · Voice ${focus.voice}`;
	}

	handleKey(key: EditingKey | string, shiftKey = false): boolean {
		const input =
			typeof key === 'string'
				? { key, shiftKey, altKey: false, ctrlKey: false, metaKey: false }
				: key;
		return this.editing.handleKey(input);
	}

	private syncPlayhead(): void {
		const focus = this.editing.getPresentation().focus;
		const target = focus
			? this.score
					.getSequence()
					.getNoteNearMs(this.cursor.getTimeMs(), { note: focus })
			: null;
		if (target) {
			this.cursor.seekMs(target.timeMs);
		}
	}

	/* Start or stop the play loop. Starting from the end restarts from the top. */
	togglePlay(): void {
		this.forgetSeek();
		if (this.playing) {
			this.stop();
			return;
		}
		if (this.cursor.isDone()) {
			this.cursor.seekMs(0);
		}
		// Bring the cursor into view when starting (e.g. after scrolling away while paused).
		this.start();
	}

	setPlaying(playing: boolean): void {
		this.forgetSeek();
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

	/*
	 * Step to the first onset of the previous measure, or to the start of the current one when the
	 * cursor is somewhere inside it: the usual transport behavior, where "back" first rewinds the
	 * bar you are in. Pauses first, like the note steps.
	 */
	previousMeasure(): void {
		this.stop();
		const steps = this.score.getSequence().getSteps();
		const index = this.stepIndex();
		const start = this.measureStart(index);
		// Already parked on the downbeat, so "back" means the measure before this one.
		const target = start === index ? this.measureStart(start - 1) : start;
		const step = steps[target];
		if (step) {
			this.cursor.seekMs(step.startMs);
		}
	}

	/* Step to the first onset of the next measure in playback order, if there is one. */
	nextMeasure(): void {
		this.stop();
		const steps = this.score.getSequence().getSteps();
		const index = this.stepIndex();
		const here = steps[index]?.measureIndex;
		for (let i = index + 1; i < steps.length; i++) {
			const step = steps[i];
			if (step && step.measureIndex !== here) {
				this.cursor.seekMs(step.startMs);
				return;
			}
		}
	}

	seekMs(ms: number): void {
		this.cursor.seekMs(ms);
	}

	/*
	 * Opens a scrub gesture. Seeking pauses, so the gesture records whether it interrupted
	 * playback and `endSeek` hands it back. Both the notation drag and the transport's seek bar
	 * go through this pair, so a drag behaves the same wherever it started. Calling it again
	 * mid-gesture is a no-op: every frame of a drag arrives here, and only the first has the
	 * pre-seek state to read.
	 */
	beginSeek(): void {
		if (this.seeking) {
			return;
		}
		const wasPlaying = this.playing;
		this.stop();
		this.seeking = true;
		this.resumeAfterSeek = wasPlaying;
	}

	/* Closes the gesture, resuming if it was playing when the gesture began. */
	endSeek(): void {
		if (!this.seeking) {
			return;
		}
		this.seeking = false;
		if (this.resumeAfterSeek) {
			this.resumeAfterSeek = false;
			this.start();
			this.dispatcher.dispatch('changed');
		}
	}

	/* The step the cursor sits on, clamped to the first (before the first onset there is none). */
	private stepIndex(): number {
		const sequence = this.score.getSequence();
		return sequence.getStepIndexAtMs(this.cursor.getTimeMs()) ?? 0;
	}

	/*
	 * Walk back to the first step of the measure `index` is in. Measure runs are scanned rather than
	 * looked up by measure number because a repeated measure has one number and several runs, and
	 * the one wanted is whichever the cursor is playing now.
	 */
	private measureStart(index: number): number {
		const steps = this.score.getSequence().getSteps();
		const measureIndex = steps[index]?.measureIndex;
		if (measureIndex === undefined) {
			return 0;
		}
		let start = index;
		while (start > 0 && steps[start - 1]?.measureIndex === measureIndex) {
			start--;
		}
		return start;
	}

	dispose(): void {
		this.disposer.dispose();
	}

	// ponytail: wall-clock RAF, not an audio clock. Good enough for a demo; swap in the
	// AudioContext's currentTime if drift against the synth ever shows.
	private start(): void {
		this.playing = true;
		this.follower.update(true);
		// The note under the cursor fired its `started` event while paused (during load or a seek),
		// so the loop, which moves within that note's duration, never sees it start. Attack the
		// already-sounding notes here so the first (or resumed) note actually sounds.
		for (const n of this.cursor.getActiveElements()) {
			this.attack(n);
		}
		this.loop.start();
		this.dispatcher.dispatch('changed');
	}

	private stop(): void {
		this.loop.stop();
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

	/* Drops a pending resume, so an explicit play or pause is the last word on the matter. */
	private forgetSeek(): void {
		this.seeking = false;
		this.resumeAfterSeek = false;
	}

	private follow(): void {
		this.follower.update(this.playing);
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
		// the main note, then attack the main note after the run. The returned voice cancels the
		// pending plucks and a still-pending main attack, or releases the live one; stopAll is the
		// backstop.
		const flashes = new Disposer();
		let offset = 0;
		for (const g of graces) {
			const gp = g.getPitch();
			if (gp) {
				const at = offset;
				// Light the grace while it sounds, then clear it as the next one (or the main note)
				// takes over.
				flashes.use(
					this.timer.setTimeout(() => {
						instrument.pluck(gp, GRACE_MS);
						g.color.on(ACTIVE_COLOR);
					}, Duration.ms(at)),
				);
				flashes.use(
					this.timer.setTimeout(
						() => g.color.off(),
						Duration.ms(at + GRACE_MS),
					),
				);
				// Cancelling mid-flash skips the timer that would have cleared the color, so clear it
				// here too.
				flashes.defer(() => g.color.off());
				offset += GRACE_MS;
			}
		}
		let voice: Resource = disposables.noop();
		const scheduled = this.timer.setTimeout(() => {
			voice = instrument.play(pitch);
		}, Duration.ms(offset));
		this.voices.set(
			n,
			disposables.callback(() => {
				flashes.dispose();
				scheduled.dispose();
				voice.dispose();
			}),
		);
	}

	// A fret marker stands in for its note, so a TabPosition target lights that note's halo rather
	// than one of its own.
	private apply(): void {
		const target = this.hovered;
		let note: Note | null = null;
		if (target instanceof Note) {
			note = target;
		} else if (target instanceof TabPosition) {
			note = target.getNote();
		}
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
		this.dispatcher.dispatch('changed');
	}

	// Subscribe for the session's lifetime, releasing on dispose. One helper serves both sources
	// now that Events is generic in its map: TypeScript infers the payload type from the source
	// and the event name.
	private watch<M extends Record<string, unknown>, K extends keyof M>(
		events: Events<M>,
		type: K,
		listener: (event: M[K]) => void,
	): void {
		this.disposer.defer(events.on(type, listener));
	}

	private clearHighlight(): void {
		this.halo?.halo.off();
		this.halo?.color.off();
		this.halo = null;
		this.container.style.cursor = '';
	}
}
