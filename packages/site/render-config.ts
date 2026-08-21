import type { ConfigInput, StandardLayout } from '@stringsync/vexml';
import { Disposer, type Resource } from 'webappwiz/disposable';
import { Dispatcher, type Eventful } from 'webappwiz/events';
import { Duration, SystemTimer } from 'webappwiz/time';
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

	private readonly disposer = new Disposer();
	private readonly timer = new SystemTimer();
	private pending: Resource | undefined;

	constructor() {
		this.disposer.defer(() => this.pending?.dispose());
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
	 * width must not silently reset the overflow mode. */
	patchLayout(patch: Partial<StandardLayout>): void {
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

	/* Drop every override, including the whole layout object. */
	resetAll(): void {
		const { height } = this.live;
		// height is measured, not chosen: resetting the sliders must not collapse the scroll box.
		this.set(height === undefined ? {} : { height });
	}

	/* The measured scroll-box height, from the fit observer. Same value is a no-op, which is what
	 * breaks the feedback loop: applying a height resizes the container, which re-measures. */
	setHeight(height: number): void {
		if (this.live.height === height) {
			return;
		}
		this.set({ ...this.live, height });
	}

	/* Report how long a render took, so the next config change knows whether to debounce. Null
	 * after a failed render, which debounces (a broken document is not evidence of speed). */
	reportRenderMs(ms: number | null): void {
		this.renderMs = ms;
		this.dispatcher.dispatch('changed');
	}

	/* Whether any slider or layout knob differs from vexml's default. */
	canReset(): boolean {
		const layout =
			this.live.layout?.type === 'standard' ? this.live.layout : undefined;
		return (
			SCALAR_KEYS.some((k) => this.live[k] !== undefined) ||
			LAYOUT_KEYS.some((k) => layout?.[k] !== undefined)
		);
	}

	dispose(): void {
		this.disposer.dispose();
	}

	// One write path, so `live`, `applied` and `debouncing` can only move together.
	private set(next: ConfigInput): void {
		this.live = next;
		this.pending?.dispose();
		// A fast last render keeps up with the sliders, so skip the wait entirely.
		if (this.renderMs != null && this.renderMs <= FAST_RENDER_MS) {
			this.applied = next;
			this.debouncing = false;
			this.dispatcher.dispatch('changed');
			return;
		}
		this.debouncing = true;
		this.dispatcher.dispatch('changed');
		this.pending = this.timer.setTimeout(() => {
			this.applied = this.live;
			this.debouncing = false;
			this.dispatcher.dispatch('changed');
		}, Duration.ms(DEBOUNCE_MS));
	}
}

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
