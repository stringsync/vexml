import * as musicxml from '@/musicxml';
import { Measure, MeasureRendering } from './measure';

export type PartRendering = {
  id: string;
  measures: MeasureRendering[];
};

export class Part {
  private id: string;
  private systemId: symbol;
  private measures: Measure[];

  private constructor(opts: { id: string; systemId: symbol; measures: Measure[] }) {
    this.id = opts.id;
    this.systemId = opts.systemId;
    this.measures = opts.measures;
  }

  static create(opts: { musicXml: { part: musicxml.Part }; systemId: symbol }): Part {
    const id = opts.musicXml.part.getId();

    const measures = new Array<Measure>();
    for (const musicXmlMeasure of opts.musicXml.part.getMeasures()) {
      const measure = Measure.create({
        musicXml: { measure: musicXmlMeasure },
        systemId: opts.systemId,
      });
      measures.push(measure);
    }

    return new Part({ id, systemId: opts.systemId, measures });
  }

  clone(): Part {
    return new Part({
      id: this.id,
      systemId: this.systemId,
      measures: this.measures.map((measure) => measure.clone()),
    });
  }

  getMeasures(): Measure[] {
    return this.measures;
  }

  getMeasureAt(measureIndex: number): Measure | null {
    return this.measures[measureIndex] ?? null;
  }

  slice(opts: { systemId: symbol; measureStartIndex: number; measureEndIndex: number }): Part {
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
    const measures = this.measures
      .slice(opts.measureStartIndex, opts.measureEndIndex)
      .map((measure) => measure.clone().setSystemId(opts.systemId));

    return new Part({ id: this.id, systemId: opts.systemId, measures });
  }

  render(opts: {
    x: number;
    y: number;
    targetSystemWidth: number;
    minRequiredSystemWidth: number;
    isLastSystem: boolean;
  }): PartRendering {
    const measureRenderings = new Array<MeasureRendering>();

    let x = opts.x;
    const y = opts.y;

    for (let index = 0; index < this.measures.length; index++) {
      const measure = this.measures[index];
      const previousMeasure = this.measures[index - 1] ?? null;

      const measureRendering = measure.render({
        x,
        y,
        isLastSystem: opts.isLastSystem,
        previousMeasure,
        minRequiredSystemWidth: opts.minRequiredSystemWidth,
        targetSystemWidth: opts.targetSystemWidth,
      });
      measureRenderings.push(measureRendering);

      x += measureRendering.staves[0]?.width ?? 0;
    }

    return { id: this.id, measures: measureRenderings };
  }
}
