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
  vexflow:
    | {
        type: 'stavenote';
        note: vexflow.StaveNote;
      }
    | {
        type: 'tabnote';
        note: vexflow.TabNote;
      };
};

/** A value that is scoped to a specific part. */
export type PartScoped<T> = { partId: string; value: T };

/** Describes the coordinates of a tablature component. */
export type TabPosition = {
  string: number;
  fret: number | 'X';
};

/** The different inputs a device could be interacting with a vexml rendering. */
export type InputType = 'auto' | 'mouse' | 'touch' | 'hybrid' | 'none';

// TODO: Support other types of jumps.
/** A directive to jump to a different measure in a musical piece. */
export type Jump =
  | { type: 'repeatstart' }
  | { type: 'repeatend'; times: number }
  | { type: 'repeatending'; times: number };

/** A directive to insert a non-musical measure with a message. */
export type MessageMeasure = {
  /** The **absolute** measure index accounting for any previous measures that have been removed or inserted. */
  absoluteMeasureIndex: number;

  /** The message to be displayed over the measure. */
  message: string;

  /** The duration that the message measure should play for. */
  durationMs: number;

  /** The width of the messeage measure in pixels. It will be clamped to the width of the score. */
  width: number;
};
