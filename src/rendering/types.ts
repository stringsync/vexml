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

/** A value that is scoped to a specific stave. */
export type StaveScoped<T> = { staveNumber: number; value: T };

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

/** Gap is a non-musical section with an optional message. */
export type Gap = {
  /** The **absolute** measure index accounting for any previous measures that have been removed or inserted. */
  absoluteMeasureIndex: number;

  /** The duration that the message measure should play for. */
  durationMs: number;

  /** The width of the messeage measure in pixels. It will be clamped to the width of the score. */
  width: number;

  /** The message to be displayed over the measure. */
  message?: string;

  /** The barline type at the beginning of the gap. */
  startBarlineType?: 'single' | 'none';

  /** The barline type at the end of the gap. */
  endBarlineType?: 'single' | 'none';

  /** The stroke style of the message measure rect. */
  strokeStyle?: string | null;

  /** The fill style of the message measure rect. */
  fillStyle?: string | null;

  /** The font size of the message. */
  fontSize?: string;

  /** The font family of the message. */
  fontFamily?: string;
};
