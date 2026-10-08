import { Element } from 'vexflow/core';
import type { PaintProbe } from './paint-probe';
import { PaintState } from './paint-state';

/*
 * The measuring canvas vexflow reads every element's text metrics from (each notehead,
 * accidental and flag measures its glyph once, as it is built), answered by the render's
 * PaintProbe instead. vexflow's own canvas measures uncached, so a score that builds thirty
 * thousand noteheads measures the same handful of glyphs thirty thousand times; the probe
 * caches them, under the same key and bound as the recording's own measurements.
 *
 * Shaped like the canvas and its 2D context at once, since all vexflow does with either is
 * `getContext('2d')`, `font = ...` and `measureText(text)`.
 */
export class ProbeTextCanvas {
	private state = PaintState.INITIAL;

	constructor(private readonly probe: PaintProbe) {}

	/** Make this the canvas vexflow measures text on, from now until the next install. */
	install(): void {
		// vexflow types the slot as a real canvas; its two readers only use what this has.
		Element.setTextMeasurementCanvas(this as unknown as HTMLCanvasElement);
	}

	getContext(_kind: '2d'): this {
		return this;
	}

	get font(): string {
		return String(this.state.props.font);
	}

	set font(font: string) {
		this.state = this.state.with('font', font);
	}

	measureText(text: string): TextMetrics {
		return this.probe.measureText(this.state, text);
	}
}
