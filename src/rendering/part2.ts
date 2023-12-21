import * as util from '@/util';
import * as musicxml from '@/musicxml';
import { Stave, StaveRendering } from './stave';
import { MeasureEntry, StaveSignature } from './stavesignature';

/** The result of rendering a part. */
export type PartRendering = {
  type: 'part';
  id: string;
  staves: StaveRendering[];
};

/** A part in a musical score. */
export class Part {
  private id: string;
  private musicXml: {
    staveLayouts: musicxml.StaveLayout[];
    beginningBarStyle: musicxml.BarStyle;
    endBarStyle: musicxml.BarStyle;
  };
  private measureEntries: MeasureEntry[];
  private staveSignature: StaveSignature;

  constructor(opts: {
    id: string;
    musicXml: {
      staveLayouts: musicxml.StaveLayout[];
      beginningBarStyle: musicxml.BarStyle;
      endBarStyle: musicxml.BarStyle;
    };
    measureEntries: MeasureEntry[];
    staveSignature: StaveSignature;
  }) {
    this.id = opts.id;
    this.musicXml = opts.musicXml;
    this.measureEntries = opts.measureEntries;
    this.staveSignature = opts.staveSignature;
  }

  /** Renders the part. */
  render(): PartRendering {
    return {
      type: 'part',
      id: this.id,
      staves: [],
    };
  }

  @util.memoize()
  private getStaves(): Stave[] {
    return [];
  }
}
