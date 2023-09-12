import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';
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

  render(opts: PartRenderOptions): PartRendering {
    const measureRenderings = new Array<MeasureRendering>();

    let x = opts.x;
    const y = opts.y;

    for (const measure of this.measures) {
      const measureRendering = measure.render({ x, y });
      measureRenderings.push(measureRendering);
      x += measure.getWidth();
    }

    return { id: this.id, measures: measureRenderings };
  }
}
