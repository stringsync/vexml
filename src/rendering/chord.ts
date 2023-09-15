import * as musicxml from '@/musicxml';
import { Config } from './config';
import { Note, NoteRendering } from './note';

export type ChordRendering = {
  type: 'chord';
  notes: NoteRendering[];
};

export class Chord {
  private config: Config;
  private notes: Note[];

  private constructor(opts: { config: Config; notes: Note[] }) {
    this.config = opts.config;
    this.notes = opts.notes;
  }

  static create(opts: {
    config: Config;
    musicXml: {
      note: musicxml.Note;
    };
    clefType: musicxml.ClefType;
  }): Chord {
    const config = opts.config;
    const clefType = opts.clefType;

    const head = opts.musicXml.note;
    const tail = head.getChordTail();
    const notes = [head, ...tail].map((note) => Note.create({ config, musicXml: { note }, clefType }));

    return new Chord({ config, notes });
  }

  clone(): Chord {
    return new Chord({
      config: this.config,
      notes: this.notes.map((note) => note.clone()),
    });
  }

  render(): ChordRendering {
    const noteRenderings = Note.render(this.notes);

    return {
      type: 'chord',
      notes: noteRenderings,
    };
  }
}
