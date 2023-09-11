import * as vexflow from 'vexflow';
import * as musicxml from '@/musicxml';
import { Stave } from './stave';

type MeasureCreateOptions = {
  musicXml: {
    measure: musicxml.Measure;
  };
  index: number;
};

type MeasureRenderOptions = {
  ctx: vexflow.RenderContext;
  x: number;
  y: number;
};

export type MeasureRenderResult = {
  measure: {
    components: Array<{
      vexflow: {
        stave: vexflow.Stave;
        voices: vexflow.Voice[];
      };
    }>;
  };
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

    for (let staffNumber = 1; staffNumber <= staveCount; staffNumber) {
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

  render(opts: MeasureRenderOptions): MeasureRenderResult {
    const components = new Array<{
      vexflow: {
        stave: vexflow.Stave;
        voices: vexflow.Voice[];
      };
    }>();

    for (const stave of this.staves) {
      const result = stave.render({ ctx: opts.ctx, x: opts.x, y: opts.y });

      const vfStave = result.vexflow.stave;
      const vfVoices = result.vexflow.voices;

      components.push({ vexflow: { stave: vfStave, voices: vfVoices } });
    }

    return { measure: { components } };
  }
}
