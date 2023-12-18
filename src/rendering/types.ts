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

/** Part IDs mapped to arbitrary objects. */
export type PartMap<T> = { [partId: string]: T };
