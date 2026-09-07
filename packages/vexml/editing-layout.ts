import type { Measure } from '@stringsync/mdom';

/** Written measures grouped by rendered system; replaced when layout changes. */
export interface EditingLayout {
	getSystems(): readonly (readonly Measure[])[];
}
