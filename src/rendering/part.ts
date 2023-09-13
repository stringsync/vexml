import * as musicxml from '@/musicxml';
import { Measure, MeasureRendering } from './measure';

export type PartRendering = {
  id: string;
  measures: MeasureRendering[];
};

export class Part {
  static create(opts: { musicXml: { part: musicxml.Part } }): Part {
    const id = opts.musicXml.part.getId();

    let previousMeasure: Measure | null = null;
    const measures = new Array<Measure>();
    for (const musicXmlMeasure of opts.musicXml.part.getMeasures()) {
      const measure = Measure.create({ musicXml: { measure: musicXmlMeasure }, previousMeasure });
      measures.push(measure);
      previousMeasure = measure;
    }

    return new Part({ id, measures });
  }

  private id: string;
  private measures: Measure[];

  private constructor(opts: { id: string; measures: Measure[] }) {
    this.id = opts.id;
    this.measures = opts.measures;
  }

  getWidth(): number {
    return Math.max(0, ...this.measures.map((measure, partMeasureIndex) => measure.getWidth(partMeasureIndex)));
  }

  getMeasures(): Measure[] {
    return this.measures;
  }

  getMeasureAt(measureIndex: number): Measure | null {
    return this.measures[measureIndex] ?? null;
  }

  slice(opts: { measureStartIndex: number; measureEndIndex: number }): Part {
    const measureStartIndex = opts.measureStartIndex;
    const measureEndIndex = opts.measureEndIndex;

    if (measureStartIndex < 0) {
      throw new Error(`measureStartIndex cannot be less than 0, got: ${measureStartIndex}`);
    }
    if (measureEndIndex > this.measures.length) {
      throw new Error(
        `measureEndIndex cannot be greater than measures length (${this.measures.length}), got: ${measureEndIndex}`
      );
    }

    const measures = this.measures.slice(opts.measureStartIndex, opts.measureEndIndex);

    return new Part({ id: this.id, measures });
  }

  render(opts: { x: number; y: number }): PartRendering {
    const measureRenderings = new Array<MeasureRendering>();

    let x = opts.x;
    const y = opts.y;

    for (let index = 0; index < this.measures.length; index++) {
      const measure = this.measures[index];

      const measureRendering = measure.render({ x, y, partMeasureIndex: index });
      measureRenderings.push(measureRendering);

      x += measure.getWidth(index);
    }

    return { id: this.id, measures: measureRenderings };
  }
}
