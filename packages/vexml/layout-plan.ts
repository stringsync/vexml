import type { MeasureBox, ScoreLayout } from './layout-planner';

/*
 * A layout planned a system at a time (see LazyLayoutPlan): `layout` is live, each system's
 * boxes appearing in it once the system is placed, and its width growing should a later system
 * spill past the page. A plan made whole is complete from the start (see WholeLayoutPlan). The
 * draw places systems through the one after the system it draws (see SystemDraw.drawNext).
 */
export interface LayoutPlan {
	readonly layout: ScoreLayout;
	placedSystems(): number;
	isComplete(): boolean;
	/* Place systems through `system`, or to the end of the score if it comes first. */
	placeThrough(system: number): void;
	/* Place every system and return the layout. */
	complete(): ScoreLayout;
	/* Where every measure is expected to land, exact for the placed systems. */
	forecast(): LayoutForecast;
	/* The system measure `m` is placed on, or forecast to land on; a measure with no box of its
	 * own (inside a multirest run) is on its lead's. */
	systemOfMeasure(m: number): number;
}

/*
 * Where every measure is expected to land, from a plan that is not yet complete: the placed
 * systems' boxes exactly, then the rest of the score packed from the areas estimated for its
 * measures (see LazyLayoutPlan.forecast). `version` changes whenever the plan advances.
 */
export interface LayoutForecast {
	readonly boxes: readonly (MeasureBox | undefined)[];
	readonly systemCount: number;
	readonly version: number;
}
