import {
	Cursor,
	type CursorHost,
	type CursorHostEventMap,
	type CursorView,
	type Scroller,
} from './cursor';
import { BarCursorView, type BarCursorViewOptions } from './cursor-view';
import type { Decorations } from './decorations';
import { EventTarget } from './events/event-target';
import type { ScoreEventMap } from './events/events';
import type { Listenable } from './events/listenable';
import type { Rect } from './geometry';
import type { TargetIndex } from './hit';
import type { Sequence } from './sequence';
import type { Host, Layer, LayerKind } from './stage';
import type { Measure, Note, PointerTarget } from './targets';

/* Adapts the Stage host into a Cursor's CursorHost: passes through the rect/scroller methods and
 * turns the host's window-scroll + resize observers into a single `viewportchange` event. One per
 * cursor; the observers are bound only while the cursor is listening and torn down when it disposes
 * (its removeEventListener drops the last listener). */
class CursorHostAdapter implements CursorHost {
	private readonly target = new EventTarget<CursorHostEventMap>();
	private unbind: (() => void) | null = null;

	constructor(private readonly host: Host) {}

	clientRectOf(rect: Rect): DOMRect {
		return this.host.clientRectOf(rect);
	}

	viewportRect(): DOMRect {
		return this.host.viewportRect();
	}

	get scroller(): Scroller {
		return this.host.scroller;
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

/*
 * A rendered score: the handle render() returns. Owns the DOM vexml built (the Stage/Host) and
 * lets callers subscribe to pointer/scroll/resize events through the Listenable interface,
 * and stack their own drawing layers over the score. Pointer events are hit-tested against the
 * index to the target under the pointer. dispose() tears the whole thing down so a caller can
 * re-render or unmount cleanly.
 *
 * Pointer/scroll DOM listeners are bound lazily: the underlying source is attached only while at
 * least one caller is subscribed, so an unobserved score does no per-pointer hit-testing. Resize
 * is observed from construction instead — it also resizes viewport layers, which must happen even
 * with no resize subscriber.
 */
export class Score implements Listenable<ScoreEventMap> {
	private readonly target = new EventTarget<ScoreEventMap>();
	// The live DOM listeners backing each Score event, so unbind can remove the exact references.
	// Most events map to one DOM listener; hover maps to several (move/down/leave). Resize isn't
	// here — it's a ResizeObserver, set up once below.
	private readonly bound = new Map<
		keyof ScoreEventMap,
		Array<[string, EventListener]>
	>();
	private readonly unobserveResize: () => void;
	// Hover state: the target last reported and the last pointer position (client coords) to
	// re-hit-test on scroll. unobserveScroll is hover's window-scroll subscription.
	private hovered: PointerTarget | null = null;
	private lastClient: { x: number; y: number } | null = null;
	private unobserveScroll: (() => void) | null = null;
	// Live playback cursors, disposed with the score; each removes itself on its own dispose.
	private readonly cursors = new Set<Cursor>();

	constructor(
		private readonly host: Host,
		private readonly index: TargetIndex,
		private readonly decorations: Decorations,
		private readonly sequence: Sequence,
	) {
		// On resize: re-sync the layers (viewport layers are refit and cleared; content layers just
		// re-track the base canvas) before telling the caller, so a viewport-layer redraw in the
		// resize handler lands on a correctly sized, cleared surface.
		this.unobserveResize = host.observeResize((size) => {
			host.relayoutLayers();
			this.target.dispatchEvent('resize', size);
		});
	}

	/* The container's current scroll offset (score space and client space differ only by it and
	 * any zoom — getBoundingClientRect already folds scroll into hit-testing). */
	get scroll(): { left: number; top: number } {
		return this.host.scroll;
	}

	/* Add a caller-owned drawing layer over the score; returns it for drawing (via ctx) and removal
	 * (via dispose, or removeLayer). A content layer spans the engraved score; a viewport layer
	 * spans the visible box and is re-fit on resize.
	 *
	 * zIndex (an integer, may be negative) orders the layer relative to the canvas the score is drawn
	 * on, which sits at zIndex 0: positive draws in front, negative behind (showing through the
	 * score's transparent pixels). Layers with the same zIndex stack in creation order. Omit it to
	 * use the kind's default (background behind, everything else in front). */
	addLayer(kind: LayerKind, zIndex?: number): Layer {
		if (zIndex !== undefined && !Number.isInteger(zIndex)) {
			throw new Error('vexml: layer zIndex must be an integer');
		}
		return this.host.createLayer(kind, zIndex);
	}

	/* Remove a layer added with addLayer (a shorthand for layer.dispose()). */
	removeLayer(layer: Layer): void {
		layer.dispose();
	}

	/* Add a playback cursor over this score's timeline. Headless by default — attach a view
	 * (createCursorView) and/or follow the scroller for visuals. Disposed when the score is. */
	addCursor(): Cursor {
		const cursor = new Cursor(
			this.sequence,
			new CursorHostAdapter(this.host),
			() => this.cursors.delete(cursor),
		);
		this.cursors.add(cursor);
		return cursor;
	}

	/* vexml's default cursor visual — a vertical bar on its own content layer. Hand it to a cursor
	 * with cursor.attach(view). Style it with `color`/`widthPx`, or implement CursorView for your own. */
	createCursorView(options?: BarCursorViewOptions): CursorView {
		return new BarCursorView(this.host.createLayer('content'), options);
	}

	/* The score's scroller, to give a cursor (cursor.follow) or scroll a rect into view directly. */
	get scroller(): Scroller {
		return this.host.scroller;
	}

	/* Total playback time of the score, repeats and voltas expanded. */
	getDurationMs(): number {
		return this.sequence.getDurationMs();
	}

	/* Total playback length in quarter-note beats, repeats and voltas expanded. */
	getDurationBeats(): number {
		return this.sequence.getDurationBeats();
	}

	/* The total number of measures in document order (not repeat-expanded). */
	getMeasureCount(): number {
		return this.sequence.getMeasureCount();
	}

	/* The document measure index playing at `ms` (before the first onset clamps to 0). */
	getMeasureIndexAtMs(ms: number): number {
		return this.sequence.getMeasureIndexAtMs(ms);
	}

	/* Every note in the score, in document order — including grace notes (reachable here though they
	 * stay out of hit-testing) and every chord member. The same Note identities hit-testing and the
	 * playback timeline return, so a caller can color/inspect them or build an editing selection. */
	getNotes(): Note[] {
		return [...this.index.notes.values()];
	}

	/* Every measure, in document order (one per index, not repeat-expanded). */
	getMeasures(): Measure[] {
		return [...this.index.measures.values()];
	}

	/* Every target whose box covers a score-space point, topmost first — a note/fret before the
	 * measure it sits on, tighter boxes before looser. Overlapping rects (chord neighbors, a note
	 * over its measure) all come back; getTargetsAt(point)[0] is the one a click/hover reports. */
	getTargetsAt(point: { x: number; y: number }): PointerTarget[] {
		return this.index.hitTester.hitTestAll(point);
	}

	/* Every target whose box lies fully within a score-space rect — a marquee/lasso selection.
	 * Same topmost-first order as getTargetsAt. Partially-covered targets are excluded. */
	getTargetsWithin(rect: Rect): PointerTarget[] {
		return this.index.hitTester.hitTestWithin(rect);
	}

	/* The playback time at a score-space point (jump-aware: a repeated spot maps to its first pass),
	 * or null on empty space. Hit-tests the point, then interpolates the exact time/beat under it —
	 * a note/fret within its onset step, a measure across its full width (see Sequence.resolveX). The
	 * `step*` fields are the closest onset (the step the point lands in), for snap-to-note callers. */
	getTimeAt(point: { x: number; y: number }): {
		ms: number;
		beat: number;
		stepMs: number;
		stepBeat: number;
		stepIndex: number;
	} | null {
		const range = this.stepRangeAt(point);
		if (!range) {
			return null;
		}
		const resolved = this.sequence.resolveX(point.x, range.start, range.end);
		const step = resolved && this.sequence.getStep(resolved.stepIndex);
		if (!resolved || !step) {
			return null;
		}
		return {
			ms: this.sequence.beatsToMs(resolved.beat),
			beat: resolved.beat,
			stepMs: step.startMs,
			stepBeat: step.startBeat,
			stepIndex: resolved.stepIndex,
		};
	}

	// The step range a target spans: a note/fret is its single onset step; a measure is its first
	// occurrence's contiguous run, so a point maps across the whole bar.
	private stepRangeAt(point: {
		x: number;
		y: number;
	}): { start: number; end: number } | null {
		const target = this.index.hitTester.hitTest(point);
		if (!target) {
			return null;
		}
		switch (target.type) {
			case 'note':
			case 'tab-position': {
				const note = target.type === 'note' ? target : target.getNote();
				const index = this.sequence.getFirstStepOfNote(note);
				return index === null ? null : { start: index, end: index };
			}
			case 'measure':
				return this.sequence.getStepRangeOfMeasure(target.getIndex());
		}
	}

	addEventListener<K extends keyof ScoreEventMap>(
		type: K,
		listener: (event: ScoreEventMap[K]) => void,
	): void {
		const first = this.target.count(type) === 0;
		this.target.addEventListener(type, listener);
		if (first) {
			this.bind(type);
		}
	}

	removeEventListener<K extends keyof ScoreEventMap>(
		type: K,
		listener: (event: ScoreEventMap[K]) => void,
	): void {
		this.target.removeEventListener(type, listener);
		if (this.target.count(type) === 0) {
			this.unbind(type);
		}
	}

	dispose(): void {
		for (const cursor of [...this.cursors]) {
			cursor.dispose();
		}
		this.cursors.clear();
		for (const handlers of this.bound.values()) {
			for (const [domType, handler] of handlers) {
				this.host.events.removeEventListener(domType, handler);
			}
		}
		this.bound.clear();
		this.unobserveScroll?.();
		this.unobserveScroll = null;
		this.unobserveResize();
		this.decorations.dispose();
		this.host.dispose();
	}

	// Attach the underlying source for a Score event on its first subscriber. Pointer events
	// hit-test the point under them; scroll carries the new offset; hover tracks the target under
	// the pointer (recomputed on move/down/leave and scroll); resize is already observed from
	// construction (for the layers), so there's nothing to bind here.
	private bind(type: keyof ScoreEventMap): void {
		switch (type) {
			case 'resize':
				return;
			case 'scroll': {
				this.listen(type, 'scroll', (native) => {
					this.target.dispatchEvent('scroll', { ...this.host.scroll, native });
				});
				return;
			}
			case 'hover': {
				const track: EventListener = (native) => {
					const pointer = native as PointerEvent;
					this.lastClient = { x: pointer.clientX, y: pointer.clientY };
					this.recomputeHover();
				};
				this.listen(type, 'pointermove', track);
				this.listen(type, 'pointerdown', track);
				// Clear on leave and on cancel: a touch pointer ceases to exist on lift (pointerleave
				// follows pointerup) or when the UA steals the gesture to scroll (pointercancel) — drop
				// the stale position so a momentum-scroll recompute doesn't relight a phantom target.
				const clear: EventListener = () => {
					this.lastClient = null;
					this.recomputeHover();
				};
				this.listen(type, 'pointerleave', clear);
				this.listen(type, 'pointercancel', clear);
				this.unobserveScroll = this.host.observeScroll(() =>
					this.recomputeHover(),
				);
				return;
			}
			default: {
				this.listen(type, type, (native) => {
					const pointer = native as PointerEvent;
					const point = this.host.toScoreSpace(
						pointer.clientX,
						pointer.clientY,
					);
					this.target.dispatchEvent(type, {
						target: this.index.hitTester.hitTest(point),
						point,
						native: pointer,
					});
				});
			}
		}
	}

	// Detach the underlying source when the last subscriber for a Score event leaves. Resize stays
	// observed (it serves the layers), so it's a no-op here.
	private unbind(type: keyof ScoreEventMap): void {
		if (type === 'resize') {
			return;
		}
		const handlers = this.bound.get(type);
		if (handlers) {
			for (const [domType, handler] of handlers) {
				this.host.events.removeEventListener(domType, handler);
			}
			this.bound.delete(type);
		}
		if (type === 'hover') {
			this.unobserveScroll?.();
			this.unobserveScroll = null;
			this.hovered = null;
			this.lastClient = null;
		}
	}

	// Bind a DOM listener for a Score event and record it for later removal.
	private listen(
		type: keyof ScoreEventMap,
		domType: string,
		handler: EventListener,
	): void {
		this.host.events.addEventListener(domType, handler);
		const handlers = this.bound.get(type) ?? [];
		handlers.push([domType, handler]);
		this.bound.set(type, handlers);
	}

	// Re-hit-test the last pointer position and emit hover only when the target changes — so a
	// scroll or a move within the same target stays quiet, but sliding onto/off a target fires.
	private recomputeHover(): void {
		const point = this.lastClient
			? this.host.toScoreSpace(this.lastClient.x, this.lastClient.y)
			: null;
		const target = point ? this.index.hitTester.hitTest(point) : null;
		if (target !== this.hovered) {
			this.hovered = target;
			this.target.dispatchEvent('hover', { target, point });
		}
	}
}
