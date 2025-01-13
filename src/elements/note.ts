import * as rendering from '@/rendering';
import { Logger } from '@/debug';
import { Rect } from '@/spatial';

export class Note {
  private constructor(
    private config: rendering.Config,
    private log: Logger,
    private document: rendering.Document,
    private noteRender: rendering.NoteRender
  ) {}

  static create(
    config: rendering.Config,
    log: Logger,
    document: rendering.Document,
    noteRender: rendering.NoteRender
  ): Note {
    return new Note(config, log, document, noteRender);
  }

  /** The name of the element, which can be used as a type discriminant. */
  public readonly name = 'note';

  /** Returns the bounding box of the element. */
  get rect(): Rect {
    return this.noteRender.rect;
  }
}
