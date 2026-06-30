import { EventBus, type EventListenable } from './events';
import { Rect } from './geometry';
import type { Sequence } from './sequence';
import type { Bounded, Note } from './targets';

/*
 * A playback cursor: a position in a score's playback timeline that you step (next/previous) or seek
 * (any ms or beat), reporting where it is and what's sounding so a caller can sync an instrument or
 * audio UI. It holds an exact time, not just a step — the bar interpolates between onsets so it
 * follows audio smoothly. Optional visuals and scrolling attach to it (attach/follow) and detach
 * cleanly; it owns nothing of the score, so disposing it just unhooks. Distinct from mdom's editing
 * Cursor — this never edits.
 */

/* What changed entering the current position. `started` are (re)attacks (a re-struck pitch shows in
 * both `started` and `stopped`); `sustained` are notes held or tied through (do not re-press);
 * `stopped` are releases (a note tied into this step is excluded — it keeps ringing). `active` is the
 * full sounding set. `position` is the bar in score space, mappable to the page. */
export interface CursorChangeEvent {
	readonly timeMs: number;
	readonly timeBeats: number;
	readonly index: number;
	readonly position: Bounded;
	readonly active: readonly Note[];
	readonly started: readonly Note[];
	readonly sustained: readonly Note[];
	readonly stopped: readonly Note[];
	readonly done: boolean;
}

/* The cursor's bar crossed the viewport edge: `fullyVisible` is true when the whole bar sits inside
 * the viewport, false when any part is off-screen. Fires on a transition only — driven by the
 * cursor's own moves and by viewport scroll/resize (see CursorHost.viewportchange), so it also fires
 * while paused if the user scrolls the bar away. */
export interface CursorVisibilityEvent {
	readonly fullyVisible: boolean;
}

export interface CursorEventMap {
	change: CursorChangeEvent;
	visibility: CursorVisibilityEvent;
}

/* A visual for the cursor, driven by the cursor on every change. vexml ships a vertical-bar default
 * (Score.createCursorView); a caller can implement this to move a DOM element, draw on a layer, etc.
 * `render` gets the full change event but a position-only view just reads `e.position`. */
export interface CursorView {
	render(e: CursorChangeEvent): void;
	dispose(): void;
}

/* Scrolls a score-space rect into the viewport. vexml's Stage provides one (Score.scroller); a caller
 * may pass their own to follow(). */
export interface Scroller {
	scrollIntoView(rect: Rect, opts?: { behavior?: ScrollBehavior }): void;
}

/* The host fires this whenever the viewport moves or resizes, so the cursor can re-test visibility
 * even though it hasn't moved. Payload-free — the cursor reads viewportRect()/clientRectOf() itself. */
export interface CursorHostEventMap {
	viewportchange: undefined;
}

/* What a Cursor needs from the rendered score's stage: score<->client mapping (to expose the bar's
 * page rect and test visibility), the visible scrollport box, the default scroller, and a
 * viewport-change subscription. Stage's adapter implements it; a unit test injects a fake. */
export interface CursorHost extends EventListenable<CursorHostEventMap> {
	clientRectOf(rect: Rect): DOMRect;
	viewportRect(): DOMRect;
	readonly scroller: Scroller;
}

const EMPTY_RECT = new Rect(0, 0, 0, 0);

/* The cursor's current box, mapped to the page on demand (mirrors a target's Bounded). */
class CursorPosition implements Bounded {
	constructor(
		readonly rect: Rect,
		private readonly host: CursorHost,
	) {}
	getBoundingClientRect(): DOMRect {
		return this.host.clientRectOf(this.rect);
	}
}

export class Cursor implements EventListenable<CursorEventMap> {
	private readonly bus = new EventBus<CursorEventMap>();
	// Unhook fns for attach/follow subscriptions, run on dispose; the views still attached at dispose,
	// disposed with the cursor (a detached one is the caller's again).
	private readonly cleanups = new Set<() => void>();
	private readonly views = new Set<CursorView>();
	private index = 0;
	private ms = 0;
	private disposed = false;
	// Last reported full-visibility, to fire `visibility` on transitions only. Seeded from the
	// current state so the first move/scroll doesn't emit a spurious "unchanged" event.
	private lastVisible: boolean;

	constructor(
		private readonly sequence: Sequence,
		private readonly host: CursorHost,
		// Called from dispose so the Score can forget this cursor (avoids a leak / double dispose).
		private readonly onDispose?: () => void,
	) {
		this.lastVisible = this.isFullyVisible();
		const onViewport = () => this.checkVisibility();
		this.host.addEventListener('viewportchange', onViewport);
		this.cleanups.add(() =>
			this.host.removeEventListener('viewportchange', onViewport),
		);
	}

	/* Snap to the next tickable in playback order; a no-op on the last one. */
	next(): void {
		if (this.disposed || this.index >= this.sequence.length - 1) {
			return;
		}
		const from = this.index;
		this.index++;
		this.ms = this.sequence.getStep(this.index)?.startMs ?? this.ms;
		this.emit(from);
	}

	/* Snap to the previous tickable; a no-op on the first one. */
	previous(): void {
		if (this.disposed || this.index <= 0) {
			return;
		}
		const from = this.index;
		this.index--;
		this.ms = this.sequence.getStep(this.index)?.startMs ?? this.ms;
		this.emit(from);
	}

	/* Go to any wall-clock time (ms), clamped to [0, durationMs]. The position is kept exactly (the
	 * bar interpolates within its step), so this is how you follow an audio clock. */
	seekMs(timeMs: number): void {
		if (this.disposed) {
			return;
		}
		const clamped = Math.min(
			Math.max(0, timeMs),
			this.sequence.getDurationMs(),
		);
		const from = this.index;
		this.ms = clamped;
		this.index = this.sequence.getStepIndexAtMs(clamped) ?? 0;
		this.emit(from);
	}

	/* Go to any time expressed in quarter-note beats. */
	seekBeats(beats: number): void {
		this.seekMs(this.sequence.beatsToMs(beats));
	}

	getTimeMs(): number {
		return this.ms;
	}

	getTimeBeats(): number {
		return this.sequence.msToBeats(this.ms);
	}

	getIndex(): number {
		return this.index;
	}

	getActiveNotes(): readonly Note[] {
		return this.sequence.getStep(this.index)?.active ?? [];
	}

	isDone(): boolean {
		return this.ms >= this.sequence.getDurationMs();
	}

	/* Whether the bar's page box lies entirely within the viewport. True when there's nothing to show. */
	isFullyVisible(): boolean {
		const rect = this.sequence.positionAt(this.ms);
		if (!rect) {
			return true;
		}
		const bar = this.host.clientRectOf(rect);
		const vp = this.host.viewportRect();
		return (
			bar.left >= vp.left &&
			bar.right <= vp.right &&
			bar.top >= vp.top &&
			bar.bottom <= vp.bottom
		);
	}

	/* Attach a visual, synced on every change. Renders once immediately. Returns an unsubscribe that
	 * detaches without disposing the view (the caller gets it back); dispose() disposes whatever's
	 * still attached. */
	attach(view: CursorView): () => void {
		const listener = (e: CursorChangeEvent) => view.render(e);
		this.bus.addEventListener('change', listener);
		this.views.add(view);
		const detach = () => {
			this.bus.removeEventListener('change', listener);
			this.views.delete(view);
			this.cleanups.delete(detach);
		};
		this.cleanups.add(detach);
		view.render(this.snapshot(null));
		return detach;
	}

	/* Auto-scroll: on every change, scroll the bar into view when it isn't fully visible. Uses the
	 * given scroller, or the score's. Scrolls once immediately if needed. Returns an unsubscribe. */
	follow(scroller?: Scroller): () => void {
		const target = scroller ?? this.host.scroller;
		const listener = () => {
			if (!this.isFullyVisible()) {
				target.scrollIntoView(this.barRect());
			}
		};
		this.bus.addEventListener('change', listener);
		const unfollow = () => {
			this.bus.removeEventListener('change', listener);
			this.cleanups.delete(unfollow);
		};
		this.cleanups.add(unfollow);
		listener();
		return unfollow;
	}

	/* Scroll the bar into view once, via the score's scroller. */
	scrollIntoView(opts?: { behavior?: ScrollBehavior }): void {
		this.host.scroller.scrollIntoView(this.barRect(), opts);
	}

	addEventListener<K extends keyof CursorEventMap>(
		type: K,
		listener: (event: CursorEventMap[K]) => void,
	): void {
		this.bus.addEventListener(type, listener);
	}

	removeEventListener<K extends keyof CursorEventMap>(
		type: K,
		listener: (event: CursorEventMap[K]) => void,
	): void {
		this.bus.removeEventListener(type, listener);
	}

	dispose(): void {
		if (this.disposed) {
			return;
		}
		this.disposed = true;
		// Snapshot the attached views first: the cleanups below detach them (removing them from the
		// set), so capture who to dispose before running them.
		const toDispose = [...this.views];
		for (const cleanup of [...this.cleanups]) {
			cleanup();
		}
		this.cleanups.clear();
		for (const view of toDispose) {
			view.dispose();
		}
		this.views.clear();
		this.onDispose?.();
	}

	private barRect(): Rect {
		return this.sequence.positionAt(this.ms) ?? EMPTY_RECT;
	}

	// Build the change payload, classifying note deltas against `from` (the step the cursor came from,
	// or null for an initial full-state snapshot).
	private snapshot(from: number | null): CursorChangeEvent {
		const { started, sustained, stopped } = this.sequence.classify(
			from,
			this.index,
		);
		return {
			timeMs: this.ms,
			timeBeats: this.sequence.msToBeats(this.ms),
			index: this.index,
			position: new CursorPosition(this.barRect(), this.host),
			active: this.getActiveNotes(),
			started,
			sustained,
			stopped,
			done: this.isDone(),
		};
	}

	private emit(from: number): void {
		this.bus.emit('change', this.snapshot(from));
		this.checkVisibility();
	}

	// Fire `visibility` if the bar crossed the viewport edge since the last check. Called after every
	// move and on every viewport change, so it catches both the cursor moving off-screen and the user
	// scrolling it away.
	private checkVisibility(): void {
		if (this.disposed) {
			return;
		}
		const fullyVisible = this.isFullyVisible();
		if (fullyVisible !== this.lastVisible) {
			this.lastVisible = fullyVisible;
			this.bus.emit('visibility', { fullyVisible });
		}
	}
}
