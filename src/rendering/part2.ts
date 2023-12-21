import * as util from '@/util';
import * as musicxml from '@/musicxml';
import { Stave, StaveRendering } from './stave';
import { MeasureEntry, StaveSignature } from './stavesignature';
import { Config } from './config';

/** The result of rendering a part. */
export type PartRendering = {
  type: 'part';
  id: string;
  staves: StaveRendering[];
};

/** A part in a musical score. */
export class Part {
  private config: Config;
  private id: string;
  private musicXml: {
    staveLayouts: musicxml.StaveLayout[];
    beginningBarStyle: musicxml.BarStyle;
    endBarStyle: musicxml.BarStyle;
  };
  private measureEntries: MeasureEntry[];
  private staveSignature: StaveSignature;

  constructor(opts: {
    config: Config;
    id: string;
    musicXml: {
      staveLayouts: musicxml.StaveLayout[];
      beginningBarStyle: musicxml.BarStyle;
      endBarStyle: musicxml.BarStyle;
    };
    measureEntries: MeasureEntry[];
    staveSignature: StaveSignature;
  }) {
    this.config = opts.config;
    this.id = opts.id;
    this.musicXml = opts.musicXml;
    this.measureEntries = opts.measureEntries;
    this.staveSignature = opts.staveSignature;
  }

  @util.memoize()
  getStaves(): Stave[] {
    const result = new Array<Stave>();

    const staveCount = this.staveSignature.getStaveCount();

    for (let staveIndex = 0; staveIndex < staveCount; staveIndex++) {
      const staveNumber = staveIndex + 1;

      const measureEntries = this.measureEntries.filter((entry) => {
        if (entry instanceof musicxml.Note) {
          return entry.getStaveNumber() === staveNumber;
        }
        return true;
      });

      result.push(
        new Stave({
          config: this.config,
          staveSignature: this.staveSignature,
          number: staveNumber,
          musicXml: {
            beginningBarStyle: this.musicXml.beginningBarStyle,
            endBarStyle: this.musicXml.endBarStyle,
          },
          measureEntries,
        })
      );
    }

    return result;
  }

  /** Renders the part. */
  render(): PartRendering {
    return {
      type: 'part',
      id: this.id,
      staves: [],
    };
  }
}
