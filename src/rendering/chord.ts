import * as musicxml from '@/musicxml';
import * as util from '@/util';
import { Config } from './config';
import { Note, NoteRendering } from './note';
import { NoteDurationDenominator, StemDirection } from './enums';
import { Clef } from './clef';
import { KeySignature } from './keysignature';
import { Token } from './token';

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
  private musicXml: {
    note: musicxml.Note;
    directions: musicxml.Direction[];
  };
  private stem: StemDirection;
  private clef: Clef;
  private keySignature: KeySignature;
  private durationDenominator: NoteDurationDenominator;

  constructor(opts: {
    config: Config;
    musicXml: {
      note: musicxml.Note;
      directions: musicxml.Direction[];
    };
    stem: StemDirection;
    clef: Clef;
    keySignature: KeySignature;
    durationDenominator: NoteDurationDenominator;
  }) {
    this.config = opts.config;
    this.musicXml = opts.musicXml;
    this.stem = opts.stem;
    this.clef = opts.clef;
    this.keySignature = opts.keySignature;
    this.durationDenominator = opts.durationDenominator;
  }

  /** Renders the Chord. */
  render(): ChordRendering {
    const notes = this.getNotes();
    const noteRenderings = Note.render(notes);

    return {
      type: 'chord',
      notes: noteRenderings,
    };
  }

  @util.memoize()
  private getNotes(): Note[] {
    const head = this.musicXml.note;
    const tail = head.getChordTail();

    return [
      new Note({
        config: this.config,
        musicXml: { note: head, directions: this.musicXml.directions },
        stem: this.stem,
        clef: this.clef,
        keySignature: this.keySignature,
        durationDenominator: this.durationDenominator,
      }),
      ...tail.map(
        (note) =>
          new Note({
            config: this.config,
            // We don't want the `<directions>` to be handled multiple times, since it's already handled by the head
            // note.
            musicXml: { note, directions: [] },
            stem: this.stem,
            clef: this.clef,
            keySignature: this.keySignature,
            durationDenominator: this.durationDenominator,
          })
      ),
    ];
  }
}
