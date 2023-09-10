import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';
import { Note } from './note';

type CreateOptions = {
  musicXml: {
    note: musicxml.Note;
  };
  clefType: musicxml.ClefType;
};

type RenderOptions = {
  ctx: vexflow.RenderContext;
};

export class VoiceEntry {
  static create(opts: CreateOptions): VoiceEntry {
    const note = opts.musicXml.note;

    let notes = new Array<Note>();
    if (note.isChordTail()) {
      // noop
    } else if (note.isChordHead()) {
      notes = [note, ...note.getChordTail()].map((note) =>
        Note.create({ musicXml: { note }, clefType: opts.clefType })
      );
    } else if (note.isGrace()) {
      // TODO: Handle grace notes properly.
    } else {
      notes = [Note.create({ musicXml: { note }, clefType: opts.clefType })];
    }

    return new VoiceEntry(notes);
  }

  private notes: Note[];

  private constructor(notes: Note[]) {
    this.notes = notes;
  }

  render(opts: RenderOptions): void {
    // noop
  }
}
