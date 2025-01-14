import * as rendering from '@/rendering';
import { Config } from '@/config';
import { Logger } from '@/debug';
import { Rect } from '@/spatial';
import { Fraction } from '@/util';

export class Note {
  private constructor(
    private config: Config,
    private log: Logger,
    private document: rendering.Document,
    private noteRender: rendering.NoteRender
  ) {}

  static create(config: Config, log: Logger, document: rendering.Document, noteRender: rendering.NoteRender): Note {
    return new Note(config, log, document, noteRender);
  }

  /** The name of the element, which can be used as a type discriminant. */
  public readonly name = 'note';

  /** Returns the bounding box of the element. */
  rect(): Rect {
    return this.noteRender.rect;
  }

  /** Returns the measure beat that this note starts on. */
  getStartMeasureBeat(): Fraction {
    return Fraction.fromFractionLike(this.document.getVoiceEntry(this.noteRender.key).measureBeat);
  }

  /** Returns the number of beats that this note takes. */
  getBeatCount(): Fraction {
    return Fraction.fromFractionLike(this.document.getVoiceEntry(this.noteRender.key).duration);
  }

  /** Returns the system index that this note resides in. */
  getSystemIndex(): number {
    return this.noteRender.key.systemIndex;
  }

  /** Returns the absolute measure index that this note resides in. */
  getAbsoluteMeasureIndex(): number {
    return this.document.getAbsoluteMeasureIndex(this.noteRender.key);
  }
}
