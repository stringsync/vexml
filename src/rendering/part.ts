import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';
import { Measure } from './measure';

type CreateOptions = {
  musicXml: {
    part: musicxml.Part;
  };
};

type RenderOptions = {
  ctx: vexflow.RenderContext;
};

export class Part {
  static create(opts: CreateOptions): Part {
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

  getId(): string {
    return this.id;
  }

  render(opts: RenderOptions): void {
    // noop
  }
}
