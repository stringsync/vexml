import { Disposer, disposables, type Resource } from 'webappwiz/disposable';
import type { Bounded } from '../elements/decoration/decoration';
import type { Note } from '../elements/note';
import type { CursorChangeEvent, CursorEventMap } from '../events';
import { Rect } from '../geometry';
import type { Scroller, ScrollerOptions } from '../host/scroller/scroller';
import { EventTarget } from '../listenable/event-target';
import type { Listenable } from '../listenable/listenable';
import type { CursorHost } from './cursor-host/cursor-host';
import type { CursorView } from './cursor-view/cursor-view';
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

export class CursorController implements Listenable<CursorEventMap>, Resource {
	private readonly target = new EventTarget<CursorEventMap>();
	// The sync/follow subscriptions, released on dispose; the views still attached at dispose are
	// disposed with the cursor (a detached one is the caller's again).
	private readonly subscriptions = new Disposer();
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
	) {
		this.lastVisible = this.isFullyVisible();
		const onViewport = () => this.checkVisibility();
		this.host.addEventListener('viewportchange', onViewport);
		this.subscriptions.defer(() =>
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

	/* Notes to highlight: the active set expanded across ties (a whole tie chain stays lit while any
	 * of it sounds), blanked once playback is done so nothing stays lit past the end. Use this for
	 * visuals; `getActiveElements` for audio. */
	getHighlightedElements(): readonly Note[] {
		return this.isDone() ? [] : this.sequence.getHighlighted(this.index);
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

	/* Attach a visual, synced on every change. Renders once immediately. Disposing the returned
	 * Resource detaches without disposing the view (the caller gets it back); this cursor's own
	 * dispose() disposes whatever is still attached. */
	sync(view: CursorView): Resource {
		const listener = (e: CursorChangeEvent) => view.render(e);
		this.target.addEventListener('change', listener);
		this.views.add(view);
		const detach = disposables.callback(() => {
			this.target.removeEventListener('change', listener);
			this.views.delete(view);
		});
		this.subscriptions.use(detach);
		view.render(this.snapshot(null));
		return detach;
	}

	/* Auto-scroll: on every change, scroll the bar into view when it isn't fully visible. Uses the
	 * given scroller, or the score's. Scrolls once immediately if needed. Dispose the returned
	 * Resource to stop following. */
	follow(scroller?: Scroller): Resource {
		const target = scroller ?? this.scroller;
		const listener = () => {
			if (!this.isFullyVisible()) {
				target.scrollIntoView(this.barRect());
			}
		};
		this.target.addEventListener('change', listener);
		const unfollow = disposables.callback(() =>
			this.target.removeEventListener('change', listener),
		);
		this.subscriptions.use(unfollow);
		listener();
		return unfollow;
	}

	/* Scroll the bar into view once, via the score's scroller. */
	scrollIntoView(opts?: ScrollerOptions): void {
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
		// Snapshot the attached views first: releasing the subscriptions below detaches them
		// (removing them from the set), so capture who to dispose before doing it.
		const toDispose = [...this.views];
		this.subscriptions.dispose();
		for (const view of toDispose) {
			view.dispose();
		}
		this.views.clear();
		this.target.dispatchEvent('dispose', undefined);
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
			highlighted: this.getHighlightedElements(),
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
