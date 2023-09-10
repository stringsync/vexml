import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';
import { Note } from './note';

type CreateOptions = {
  musicXml: {
    measure: musicxml.Measure;
  };
  staffNumber: number;
};

type RenderOptions = {
  ctx: vexflow.RenderContext;
};

export class Voice {
  static create(opts: CreateOptions): Voice {
    const notes = opts.musicXml.measure
      .getNotes()
      .filter((note) => note.getStaffNumber() === opts.staffNumber)
      .map((note) => Note.create({ musicXml: { note } }));

    return new Voice(notes);
  }

  private notes: Note[];

  private constructor(notes: Note[]) {
    this.notes = notes;
  }

  render(opts: RenderOptions): void {
    // noop
  }
}
