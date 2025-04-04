import * as rendering from '@/rendering';
import { Config } from '@/config';
import { Logger } from '@/debug';
import { Rect } from '@/spatial';
import { Stave } from './stave';
import { Fraction } from '@/util';

export class Part {
  private constructor(
    private config: Config,
    private log: Logger,
    private document: rendering.Document,
    private partRender: rendering.PartRender,
    private staves: Stave[]
  ) {}

  static create(config: Config, log: Logger, document: rendering.Document, partRender: rendering.PartRender): Part {
    const staves = partRender.staveRenders.map((staveRender) => Stave.create(config, log, document, staveRender));
    return new Part(config, log, document, partRender, staves);
  }

  /** The name of the element, which can be used as a type discriminant. */
  public readonly name = 'part';

  /** Returns the bounding box of the element. */
  rect(): Rect {
    return this.partRender.rect;
  }

  /** Returns the staves of the part. */
  getStaves(): Stave[] {
    return this.staves;
  }

  /** Returns the part index. */
  getIndex(): number {
    return this.partRender.key.partIndex;
  }

  /** Returns the system index. */
  getSystemIndex(): number {
    return this.partRender.key.systemIndex;
  }

  /** Returns the start measure beat for the part. */
  getStartMeasureBeat(): Fraction {
    return (
      this.staves
        .map((stave) => stave.getStartMeasureBeat())
        .sort((a, b) => a.toDecimal() - b.toDecimal())
        .at(0) ?? Fraction.zero()
    );
  }
}
