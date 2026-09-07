import type { ConfigInput, Layout, StandardLayout } from '@stringsync/vexml';
import { Disposer, type Resource } from 'webappwiz/disposable';
import { Dispatcher, type Eventful } from 'webappwiz/events';
import { Debouncer, Duration, SystemTimer } from 'webappwiz/time';
import { DEBOUNCE_MS, FAST_RENDER_MS } from './constants';

type RenderConfigEvents = { changed: undefined };

/*
 * The render configuration, in two versions that have to agree.
 *
 * `live` is what the sliders show and write, so dragging one responds instantly. `applied` is what
 * the score is actually rendered from, and lags `live` by a debounce so a drag re-renders once it
 * settles instead of on every step. When the last render was fast enough to keep up with input,
 * `applied` follows `live` immediately and there is no debounce at all.
 *
 * This is the pair that has to be kept in step, along with `debouncing` (the loading indicator) and
 * `renderMs` (the measurement that decides whether to debounce at all), which is why they live
 * together here rather than as four useStates and an effect.
 */
export class RenderConfig implements Eventful<RenderConfigEvents>, Resource {
	private readonly dispatcher = new Dispatcher<RenderConfigEvents>();
	readonly events = this.dispatcher.events;

	live: ConfigInput = {};
	applied: ConfigInput = {};
	debouncing = false;
	/* How long the last render took, or null if it failed or has not happened yet. */
	renderMs: number | null = null;

	// The standard layout's knobs while panoramic is showing. Panoramic has no room for them in
	// `live`, and dropping them would silently reset the width a user set before switching views.
	private stashedLayout: StandardLayoutInput | undefined;

	// The gap above the player, as the fit observer last measured it. Kept aside rather than in
	// `live` because it is a measurement, not a knob, and because which config key it lands in
	// depends on the layout: see `fit`.
	private measuredHeight: number | undefined;

	private readonly disposer = new Disposer();
	private readonly debouncer = new Debouncer(
		new SystemTimer(),
		Duration.ms(DEBOUNCE_MS),
	);

	constructor() {
		this.disposer.use(this.debouncer);
		this.disposer.use(this.dispatcher);
	}

	/* Write a patch over the live config, then schedule (or apply) the render config. */
	patch(patch: ConfigInput): void {
		this.set({ ...this.live, ...patch });
	}

	/* Clear the given top-level keys, so they fall back to vexml's defaults. */
	clear(...keys: ReadonlyArray<keyof ConfigInput>): void {
		const next = { ...this.live };
		for (const key of keys) {
			delete next[key];
		}
		this.set(next);
	}

	/* The layout knobs live in one nested object, so each writes through the others: setting the
	 * width must not silently reset the overflow mode. Standard-only — every knob it writes is
	 * ignored by a panoramic layout, and the panel hides them there rather than writing a patch
	 * that would flip the view back. */
	patchLayout(patch: Partial<StandardLayout>): void {
		if (this.layoutType() !== 'standard') {
			return;
		}
		this.set({
			...this.live,
			layout: {
				...(this.live.layout?.type === 'standard' ? this.live.layout : null),
				...patch,
				type: 'standard',
			},
		});
	}

	clearLayout(key: keyof StandardLayout): void {
		if (this.live.layout?.type !== 'standard') {
			return;
		}
		const { [key]: _dropped, ...rest } = this.live.layout;
		this.set({ ...this.live, layout: rest as StandardLayout });
	}

	/* Which layout the score is drawn with; standard unless panoramic was chosen. */
	layoutType(): Layout['type'] {
		return this.live.layout?.type ?? 'standard';
	}

	/* Switch views. The standard knobs are stashed rather than dropped, so a trip through
	 * panoramic and back leaves the reference width and overflow mode as the user left them. */
	setLayoutType(type: Layout['type']): void {
		if (this.layoutType() === type) {
			return;
		}
		if (type === 'standard') {
			this.set({
				...this.live,
				layout: this.stashedLayout ?? { type: 'standard' },
			});
			return;
		}
		this.stashedLayout =
			this.live.layout?.type === 'standard' ? this.live.layout : undefined;
		this.set({ ...this.live, layout: { type: 'panoramic' } });
	}

	/* Drop every override, including the whole layout object. */
	resetAll(): void {
		const { layout } = this.live;
		this.stashedLayout = undefined;
		// The layout type is a view the user is looking at rather than a knob: resetting the
		// sliders must not kick the score out of the panoramic view. The measured fit is put back
		// by `set`, so resetting cannot collapse the scroll box either.
		this.set({ ...(layout?.type === 'panoramic' ? { layout } : {}) });
	}

	/* The measured scroll-box height, from the fit observer. Same value is a no-op, which is what
	 * breaks the feedback loop: applying a height resizes the container, which re-measures. */
	setHeight(height: number): void {
		if (this.measuredHeight === height) {
			return;
		}
		this.measuredHeight = height;
		this.set(this.live);
	}

	/* Report how long a render took, so the next config change knows whether to debounce. Null
	 * after a failed render, which debounces (a broken document is not evidence of speed). */
	reportRenderMs(ms: number | null): void {
		this.renderMs = ms;
		this.dispatcher.dispatch('changed');
	}

	/* Whether any slider or layout knob differs from vexml's default. The stash counts: a
	 * reference width set before switching to panoramic is still there to be reset. */
	canReset(): boolean {
		const layout =
			this.live.layout?.type === 'standard'
				? this.live.layout
				: this.stashedLayout;
		return (
			SCALAR_KEYS.some((k) => this.live[k] !== undefined) ||
			LAYOUT_KEYS.some((k) => layout?.[k] !== undefined)
		);
	}

	dispose(): void {
		this.disposer.dispose();
	}

	/* Place the measured fit on whichever height knob the current layout wants.
	 *
	 * Stacked scores run past the bottom of the gap, so they take it as a fixed `height` and scroll
	 * within it. A panorama is a single system, and a fixed height would leave most of the card
	 * empty below the music, so it takes the same number as a `maxHeight` cap and keeps its natural
	 * height, scrolling only if one system somehow grows taller than the gap.
	 *
	 * Both keys are stripped first, so switching views moves the measurement across rather than
	 * leaving the old view's key behind to fight the new one. */
	private fit(config: ConfigInput): ConfigInput {
		const { height: _height, maxHeight: _maxHeight, ...rest } = config;
		if (this.measuredHeight === undefined) {
			return rest;
		}
		return config.layout?.type === 'panoramic'
			? { ...rest, maxHeight: this.measuredHeight }
			: { ...rest, height: this.measuredHeight };
	}

	// One write path, so `live`, `applied` and `debouncing` can only move together.
	private set(input: ConfigInput): void {
		const next = this.fit(input);
		this.live = next;
		this.debouncer.cancel();
		// A fast last render keeps up with the sliders, so skip the wait entirely.
		if (this.renderMs != null && this.renderMs <= FAST_RENDER_MS) {
			this.applied = next;
			this.debouncing = false;
			this.dispatcher.dispatch('changed');
			return;
		}
		this.debouncing = true;
		this.dispatcher.dispatch('changed');
		this.debouncer.call(() => {
			this.applied = this.live;
			this.debouncing = false;
			this.dispatcher.dispatch('changed');
		});
	}
}

/* A standard layout as the panel holds it: every knob optional, filled from vexml's defaults. */
type StandardLayoutInput = Partial<StandardLayout> & { type: 'standard' };

/* The scalar knobs a reset button clears, in panel order. */
export const SCALAR_KEYS = [
	'noteSpacing',
	'softmaxFactor',
	'systemSpacing',
	'maxSystemFill',
] as const;

/* The standard-layout knobs a reset button clears. */
export const LAYOUT_KEYS = [
	'referenceWidth',
	'honorSystemBreaks',
	'overflow',
] as const;
