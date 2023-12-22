import * as vexflow from 'vexflow';
import * as musicxml from '@/musicxml';
import { Address } from './address';

/** Data for a spanner. */
export type SpannerData = {
  address: Address<'voice'>;
  keyIndex: number;
  musicXml: {
    note: musicxml.Note | null;
    directions: musicxml.Direction[];
    octaveShift: musicxml.OctaveShift | null;
  };
  vexflow: {
    staveNote: vexflow.StaveNote;
  };
};

/** A value that is scoped to a specific part. */
export type PartScoped<T> = { partId: string; value: T };

/** The width of a measure fragment. */
export type MeasureFragmentWidth = {
  measureIndex: number;
  measureFragmentIndex: number;
  value: number;
};
