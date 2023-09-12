import * as musicxml from '@/musicxml';
import { Stave, StaveRendering } from './stave';

type MeasureCreateOptions = {
  musicXml: {
    measure: musicxml.Measure;
  };
};

type MeasureConstructorOptions = {
  staves: Stave[];
};

type MeasureRenderOptions = {
  x: number;
  y: number;
  renderModifiers: boolean;
};

export type MeasureRendering = {
  type: 'measure';
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

    return new Measure({ staves });
  }

  private staves: Stave[];

  private constructor(opts: MeasureConstructorOptions) {
    this.staves = opts.staves;
  }

  getWidth(): number {
    return Math.max(0, ...this.staves.map((stave) => stave.getMinJustifyWidth()));
  }

  getStaves(): Stave[] {
    return this.staves;
  }

  render(opts: MeasureRenderOptions): MeasureRendering {
    const staveRenderings = new Array<StaveRendering>();

    for (const stave of this.staves) {
      const staveRendering = stave.render({ x: opts.x, y: opts.y, renderModifiers: opts.renderModifiers });
      staveRenderings.push(staveRendering);
    }

    return { type: 'measure', staves: staveRenderings };
  }
}
