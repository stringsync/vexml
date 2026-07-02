import type { Bounded } from '../elements/element';
import type { Note } from '../elements/note';
import { EventTarget, type Listenable } from '../event-target';
import type { CursorChangeEvent, CursorEventMap } from '../events';
import { Rect } from '../geometry';
import type { Scroller } from '../host/scroll-controller';
import type { Host } from '../host/stage';
import type { Sequence } from './sequence';

/*
 * A playback cursor: a position in a score's playback timeline that you step (next/previous) or seek
 * (any ms or beat), reporting where it is and what's sounding so a caller can sync an instrument or
 * audio UI. It holds an exact time, not just a step — the bar interpolates between onsets so it
 * follows audio smoothly. Optional visuals and scrolling attach to it (sync/follow) and detach
 * cleanly; it owns nothing of the score, so disposing it just unhooks. A pure state model — it
 * never draws (that's the CursorView, e.g. Playhead). Distinct from mdom's editing Cursor — this
 * never edits.
 */

/* A visual for the cursor, driven by the cursor on every change. vexml ships a vertical-bar default
 * (Score.createPlayhead); a caller can implement this to move a DOM element, draw on a layer, etc.
 * `render` gets the full change event but a position-only view just reads `e.position`. */
export interface CursorView {
	render(e: CursorChangeEvent): void;
	dispose(): void;
}

/* The host fires this whenever the viewport moves or resizes, so the cursor can re-test visibility
 * even though it hasn't moved. Payload-free — the cursor reads viewportRect()/clientRectOf() itself. */
export interface CursorHostEventMap {
	viewportchange: undefined;
}

/* What a CursorController needs from the rendered score's stage: score<->client mapping (to expose
 * the bar's page rect and test visibility), the visible scrollport box, and a viewport-change
 * subscription. CursorHostAdapter implements it over the Stage; a unit test injects a fake. */
export interface CursorHost extends Listenable<CursorHostEventMap> {
	clientRectOf(rect: Rect): DOMRect;
	viewportRect(): DOMRect;
}

/* Adapts the Stage host into a CursorController's CursorHost: passes through the rect methods and
 * turns the host's window-scroll + resize observers into a single `viewportchange` event. One per
 * cursor; the observers are bound only while the cursor is listening and torn down when it disposes
 * (its removeEventListener drops the last listener). */
export class CursorHostAdapter implements CursorHost {
	private readonly target = new EventTarget<CursorHostEventMap>();
	private unbind: (() => void) | null = null;

	constructor(private readonly host: Host) {}

	clientRectOf(rect: Rect): DOMRect {
		return this.host.clientRectOf(rect);
	}

	viewportRect(): DOMRect {
		return this.host.viewportRect();
	}

	addEventListener<K extends keyof CursorHostEventMap>(
		type: K,
		listener: (event: CursorHostEventMap[K]) => void,
	): void {
		this.target.addEventListener(type, listener);
		if (!this.unbind) {
			const fire = () => this.target.dispatchEvent('viewportchange', undefined);
			const offScroll = this.host.observeScroll(fire);
			const offResize = this.host.observeResize(fire);
			this.unbind = () => {
				offScroll();
				offResize();
			};
		}
	}

	removeEventListener<K extends keyof CursorHostEventMap>(
		type: K,
		listener: (event: CursorHostEventMap[K]) => void,
	): void {
		this.target.removeEventListener(type, listener);
		if (this.target.count('viewportchange') === 0) {
			this.unbind?.();
			this.unbind = null;
		}
	}
}

const EMPTY_RECT = new Rect(0, 0, 0, 0);

/* The cursor's current box, mapped to the page on demand (mirrors an element's Bounded). */
class CursorPosition implements Bounded {
	constructor(
		readonly rect: Rect,
		private readonly host: CursorHost,
	) {}
	getBoundingClientRect(): DOMRect {
		return this.host.clientRectOf(this.rect);
	}
}

export class CursorController implements Listenable<CursorEventMap> {
	private readonly target = new EventTarget<CursorEventMap>();
	// Unhook fns for sync/follow subscriptions, run on dispose; the views still attached at dispose,
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
		// The score's scroller: the default follow()/scrollIntoView() target, and what
		// cancelScroll() halts.
		private readonly scroller: Scroller & { cancel(): void },
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

	getActiveElements(): readonly Note[] {
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
	sync(view: CursorView): () => void {
		const listener = (e: CursorChangeEvent) => view.render(e);
		this.target.addEventListener('change', listener);
		this.views.add(view);
		const detach = () => {
			this.target.removeEventListener('change', listener);
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
		const target = scroller ?? this.scroller;
		const listener = () => {
			if (!this.isFullyVisible()) {
				target.scrollIntoView(this.barRect());
			}
		};
		this.target.addEventListener('change', listener);
		const unfollow = () => {
			this.target.removeEventListener('change', listener);
			this.cleanups.delete(unfollow);
		};
		this.cleanups.add(unfollow);
		listener();
		return unfollow;
	}

	/* Scroll the bar into view once, via the score's scroller. */
	scrollIntoView(opts?: { behavior?: ScrollBehavior }): void {
		this.scroller.scrollIntoView(this.barRect(), opts);
	}

	/* Halt any smooth scroll the score's scroller has pending or in flight (e.g. when the user
	 * grabs the scrollbar mid-follow). Only touches the score's scroller — a custom scroller given
	 * to follow() manages its own animations. */
	cancelScroll(): void {
		this.scroller.cancel();
	}

	addEventListener<K extends keyof CursorEventMap>(
		type: K,
		listener: (event: CursorEventMap[K]) => void,
	): void {
		this.target.addEventListener(type, listener);
	}

	removeEventListener<K extends keyof CursorEventMap>(
		type: K,
		listener: (event: CursorEventMap[K]) => void,
	): void {
		this.target.removeEventListener(type, listener);
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
			active: this.getActiveElements(),
			started,
			sustained,
			stopped,
			done: this.isDone(),
		};
	}

	private emit(from: number): void {
		this.target.dispatchEvent('change', this.snapshot(from));
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
			this.target.dispatchEvent('visibility', { fullyVisible });
		}
	}
}
