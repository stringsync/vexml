import * as rendering from '@/rendering';
import { Config } from '@/config';
import { Logger } from '@/debug';
import { Rect } from '@/spatial';
import { Fraction } from '@/util';

export class Rest {
  private constructor(
    private config: Config,
    private log: Logger,
    private document: rendering.Document,
    private restRender: rendering.RestRender
  ) {}

  static create(config: Config, log: Logger, document: rendering.Document, restRender: rendering.RestRender): Rest {
    return new Rest(config, log, document, restRender);
  }

  /** The name of the element, which can be used as a type discriminant. */
  public readonly name = 'rest';

  /** Returns the bounding box of the element. */
  rect(): Rect {
    return this.restRender.rect;
  }

  /** Returns the measure beat that this note starts on. */
  getStartMeasureBeat(): Fraction {
    return Fraction.fromFractionLike(this.document.getVoiceEntry(this.restRender.key).measureBeat);
  }

  /** Returns the number of beats that this note takes. */
  getBeatCount(): Fraction {
    return Fraction.fromFractionLike(this.document.getVoiceEntry(this.restRender.key).duration);
  }

  /** Returns the system index that this rest resides in. */
  getSystemIndex(): number {
    return this.restRender.key.systemIndex;
  }

  /** Returns the absolute measure index that this rest resides in. */
  getAbsoluteMeasureIndex(): number {
    return this.document.getAbsoluteMeasureIndex(this.restRender.key);
  }
}
