import * as musicxml from '@/musicxml';
import { Stave, StaveRendering } from './stave';

type MeasureCreateOptions = {
  musicXml: {
    measure: musicxml.Measure;
  };
  index: number;
};

type MeasureRenderOptions = {
  x: number;
  y: number;
};

export type MeasureRendering = {
  type: 'measure';
  index: number;
  staves: StaveRendering[];
};

/**
 * Represents a Measure in a musical score, corresponding to the <measure> element in MusicXML.
 * A Measure contains a specific segment of musical content, defined by its beginning and ending beats,
 * and is the primary unit of time in a score. Measures are sequenced consecutively within a system.
 */
export class Measure {
  static create(opts: MeasureCreateOptions): Measure {
    const attributes = opts.musicXml.measure.getAttributes();

    const staveCount = Math.max(1, ...attributes.map((attribute) => attribute.getStaveCount()));
    const staves = new Array<Stave>(staveCount);

    for (let staffNumber = 1; staffNumber <= staveCount; staffNumber++) {
      staves[staffNumber - 1] = Stave.create({
        staffNumber,
        musicXml: {
          measure: opts.musicXml.measure,
        },
      });
    }

    return new Measure(opts.index, staves);
  }

  private index: number;
  private staves: Stave[];

  private constructor(index: number, staves: Stave[]) {
    this.index = index;
    this.staves = staves;
  }

  getWidth(): number {
    return Math.max(0, ...this.staves.map((stave) => stave.getWidth()));
  }

  render(opts: MeasureRenderOptions): MeasureRendering {
    const staveRenderings = new Array<StaveRendering>();

    for (const stave of this.staves) {
      const staveRendering = stave.render({ x: opts.x, y: opts.y });
      staveRenderings.push(staveRendering);
    }

    return { type: 'measure', index: this.index, staves: staveRenderings };
  }
}
