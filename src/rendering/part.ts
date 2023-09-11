import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';
import { Measure } from './measure';

type PartCreateOptions = {
  musicXml: {
    part: musicxml.Part;
  };
};

type PartRenderOptions = {
  x: number;
  y: number;
};

export type PartRenderResult = {
  measures: Array<{
    components: Array<{
      vexflow: {
        stave: vexflow.Stave;
        voices: vexflow.Voice[];
      };
    }>;
  }>;
};

export class Part {
  static create(opts: PartCreateOptions): Part {
    const id = opts.musicXml.part.getId();
    const measures = opts.musicXml.part
      .getMeasures()
      .map((measure, index) => Measure.create({ musicXml: { measure }, index }));

    return new Part(id, measures);
  }

  private id: string;
  private measures: Measure[];

  private constructor(id: string, measures: Measure[]) {
    this.id = id;
    this.measures = measures;
  }

  getWidth(): number {
    return Math.max(0, ...this.measures.map((measure) => measure.getWidth()));
  }

  render(opts: PartRenderOptions): PartRenderResult {
    const measures = new Array<{
      components: Array<{
        vexflow: {
          stave: vexflow.Stave;
          voices: vexflow.Voice[];
        };
      }>;
    }>();

    let x = opts.x;
    const y = opts.y;

    for (const measure of this.measures) {
      const result = measure.render({ x, y });

      measures.push({ components: result.measure.components });

      x += measure.getWidth();
    }

    return { measures };
  }
}
