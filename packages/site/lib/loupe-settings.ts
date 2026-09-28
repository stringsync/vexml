import type { Resource } from 'webappwiz/disposable';
import { Dispatcher, type Eventful } from 'webappwiz/events';
import { LOUPE } from './constants';

type LoupeSettingsEvents = { changed: undefined };

/* The magnifier a notation drag shows: whether it shows at all, its size and zoom, and its gap
 * from the playhead it floats above. Sizes are CSS px. */
export interface LoupeValues {
	enabled: boolean;
	width: number;
	height: number;
	zoom: number;
	gap: number;
}

/*
 * The drag loupe's settings, kept on the model rather than a session so they outlive a re-render.
 * The session reads `values` and rebuilds its loupe on `changed`.
 */
export class LoupeSettings implements Eventful<LoupeSettingsEvents>, Resource {
	private readonly dispatcher = new Dispatcher<LoupeSettingsEvents>();
	readonly events = this.dispatcher.events;

	values: LoupeValues = { ...LOUPE };

	patch(values: Partial<LoupeValues>): void {
		this.values = { ...this.values, ...values };
		this.dispatcher.dispatch('changed');
	}

	/* Whether anything differs from the defaults, so Reset has something to undo. */
	canReset(): boolean {
		const defaults: LoupeValues = LOUPE;
		return (Object.keys(defaults) as Array<keyof LoupeValues>).some(
			(key) => this.values[key] !== defaults[key],
		);
	}

	reset(): void {
		this.values = { ...LOUPE };
		this.dispatcher.dispatch('changed');
	}

	dispose(): void {
		this.dispatcher.dispose();
	}
}
