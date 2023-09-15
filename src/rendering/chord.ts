import * as musicxml from '@/musicxml';
import { Config } from './config';
import { Note, NoteRendering } from './note';

/** The result of rendering a Chord. */
export type ChordRendering = {
  type: 'chord';
  notes: NoteRendering[];
};

/**
 * Represents a musical chord, consisting of multiple notes played simultaneously.
 *
 * The `Chord` class encapsulates the idea of harmony in music notation, where several notes come together to form a
 * collective sound. A chord, in essence, is a vertical stacking of notes, each with its pitch and duration, but played
 * concurrently.
 *
 * While individual notes carry melodic information, chords convey harmonic context, often forming the backbone of a
 * piece's structure and its emotional undertones. This class allows for the proper representation and manipulation of
 * such harmonies within a musical score.
 */
export class Chord {
  private config: Config;
  private notes: Note[];

  private constructor(opts: { config: Config; notes: Note[] }) {
    this.config = opts.config;
    this.notes = opts.notes;
  }

  /** Create the Chord. */
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

  /** Clones the Chord. */
  clone(): Chord {
    return new Chord({
      config: this.config,
      notes: this.notes.map((note) => note.clone()),
    });
  }

  /** Renders the Chord. */
  render(): ChordRendering {
    const noteRenderings = Note.render(this.notes);

    return {
      type: 'chord',
      notes: noteRenderings,
    };
  }
}
