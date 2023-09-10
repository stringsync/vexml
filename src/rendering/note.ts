import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';

export interface NoteModifier {
  src: Note;
}

type CreateOptions = {
  musicXml: {
    note: musicxml.Note;
  };
};

type RenderOptions = {
  ctx: vexflow.RenderContext;
};

export class Note {
  static create(opts: CreateOptions): Note {
    const mods = new Array<NoteModifier>();

    return new Note(mods);
  }

  private mods: NoteModifier[];

  private constructor(mods: NoteModifier[]) {
    this.mods = mods;
  }

  render(opts: RenderOptions): void {
    // noop
  }
}
