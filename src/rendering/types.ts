import * as vexflow from 'vexflow';
import * as musicxml from '@/musicxml';
import { Address } from './address';

/** Data for a spanner. */
export type SpannerData = {
  address: Address<'voice'>;
  keyIndex: number;
  musicXML: {
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

/** Describes the coordinates of a tablature component. */
export type TabPosition = {
  string: number;
  fret: number;
};
