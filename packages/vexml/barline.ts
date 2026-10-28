import type { Barline as MBarline } from '@stringsync/mdom';
import type { Rect } from 'webappwiz/geometry';
import { Element } from './element';
import type { BarlineLocation } from './geometry-collector';
import type { Measure } from './measure';
import type { Viewport } from './viewport';

/* A visible barline's pointer target in one part's measure. */
export class Barline extends Element {
	readonly type = 'barline';

	constructor(
		rect: Rect,
		viewport: Viewport,
		private readonly measure: Measure,
		private readonly location: BarlineLocation,
		/* Null for an implicit edge or a snapshot, which carries no document. */
		private readonly source: MBarline | null,
	) {
		super(rect, viewport);
	}

	getMeasure(): Measure {
		return this.measure;
	}

	getLocation(): BarlineLocation {
		return this.location;
	}

	getSources(): readonly MBarline[] {
		return this.source ? [this.source] : [];
	}
}
