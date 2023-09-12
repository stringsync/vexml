import * as musicxml from '@/musicxml';
import { Measure, MeasureRendering } from './measure';

type PartCreateOptions = {
  musicXml: {
    part: musicxml.Part;
  };
};

type PartRenderOptions = {
  x: number;
  y: number;
};

export type PartRendering = {
  id: string;
  measures: MeasureRendering[];
};

export class Part {
  static create(opts: PartCreateOptions): Part {
    const id = opts.musicXml.part.getId();
    const measures = opts.musicXml.part.getMeasures().map((measure) => Measure.create({ musicXml: { measure } }));

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

  render(opts: PartRenderOptions): PartRendering {
    const measureRenderings = new Array<MeasureRendering>();

    let x = opts.x;
    const y = opts.y;

    for (let index = 0; index < this.measures.length; index++) {
      const measure = this.measures[index];

      const renderModifiers = index === 0 || this.areModifiersDifferent(measure, this.measures[index - 1]);

      const measureRendering = measure.render({ x, y, renderModifiers });
      measureRenderings.push(measureRendering);

      x += measure.getWidth();
    }

    return { id: this.id, measures: measureRenderings };
  }

  private areModifiersDifferent(measure1: Measure, measure2: Measure): boolean {
    const staves1 = measure1.getStaves();
    const staves2 = measure2.getStaves();
    if (staves1.length !== staves2.length) {
      return true;
    }

    for (let index = 0; index < staves1.length; index++) {
      const stave1 = staves1[index];
      const stave2 = staves2[index];

      const clefType1 = stave1.getClefType();
      const clefType2 = stave2.getClefType();
      if (clefType1 !== clefType2) {
        return true;
      }

      const timeSignature1 = stave1.getTimeSignature().toString();
      const timeSignature2 = stave2.getTimeSignature().toString();
      if (timeSignature1 !== timeSignature2) {
        return true;
      }

      const keySignature1 = stave1.getKeySignature();
      const keySignature2 = stave2.getKeySignature();
      if (keySignature1 !== keySignature2) {
        return true;
      }
    }

    return false;
  }
}
