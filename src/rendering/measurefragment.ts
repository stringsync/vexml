import { Config } from './config';
import { Stave, StaveRendering } from './stave';
import * as musicxml from '@/musicxml';

/** The result of rendering a measure fragment. */
export type MeasureFragmentRendering = {
  type: 'measurefragment';
  staves: StaveRendering[];
};

/** Represents a fragment of a measure. */
export class MeasureFragment {
  private config: Config;
  private clefType: musicxml.ClefType;
  private timeSignature: musicxml.TimeSignature;
  private keySignature: string;
  private beginningBarStyle: musicxml.BarStyle;
  private endBarStyle: musicxml.BarStyle;
  private staves: Stave[];

  private constructor(opts: {
    config: Config;
    clefType: musicxml.ClefType;
    timeSignature: musicxml.TimeSignature;
    keySignature: string;
    beginningBarStyle: musicxml.BarStyle;
    endBarStyle: musicxml.BarStyle;
    staves: Stave[];
  }) {
    this.config = opts.config;
    this.clefType = opts.clefType;
    this.timeSignature = opts.timeSignature;
    this.keySignature = opts.keySignature;
    this.beginningBarStyle = opts.beginningBarStyle;
    this.endBarStyle = opts.endBarStyle;
    this.staves = opts.staves;
  }

  /** Creates a MeasureFragment. */
  static create(opts: {
    config: Config;
    musicXml: {
      attributes: musicxml.Attributes;
      measureEntries: musicxml.MeasureEntry[];
      beginningBarStyle: musicxml.BarStyle;
      endBarStyle: musicxml.BarStyle;
    };
    staffNumber: number;
    previousMeasureFragment: MeasureFragment | null;
  }): MeasureFragment {
    const config = opts.config;
    const attributes = opts.musicXml.attributes;
    const staffNumber = opts.staffNumber;
    const previousMeasureFragment = opts.previousMeasureFragment;
    const beginningBarStyle = opts.musicXml.beginningBarStyle;
    const endBarStyle = opts.musicXml.endBarStyle;

    const clefType =
      attributes
        .getClefs()
        .find((clef) => clef.getStaffNumber() === staffNumber)
        ?.getClefType() ??
      previousMeasureFragment?.clefType ??
      'treble';

    const timeSignature =
      attributes
        .getTimes()
        .find((time) => time.getStaffNumber() === opts.staffNumber)
        ?.getTimeSignatures()[0] ??
      previousMeasureFragment?.timeSignature ??
      new musicxml.TimeSignature(4, 4);

    const keySignature =
      attributes
        .getKeys()
        .find((key) => key.getStaffNumber() === opts.staffNumber)
        ?.getKeySignature() ??
      previousMeasureFragment?.keySignature ??
      'C';

    return new MeasureFragment({
      config,
      clefType,
      timeSignature,
      keySignature,
      beginningBarStyle,
      endBarStyle,
      staves: [],
    });
  }

  /** Clones the MeasureFragment. */
  clone(): MeasureFragment {
    return new MeasureFragment({
      config: this.config,
      clefType: this.clefType,
      timeSignature: this.timeSignature.clone(),
      keySignature: this.keySignature,
      beginningBarStyle: this.beginningBarStyle,
      endBarStyle: this.endBarStyle,
      staves: this.staves.map((stave) => stave.clone()),
    });
  }

  /** Renders the MeasureFragment. */
  render(): MeasureFragmentRendering {
    return {
      type: 'measurefragment',
      staves: [],
    };
  }
}
