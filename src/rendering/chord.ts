import * as musicxml from '@/musicxml';
import { Config } from './config';
import { Note, NoteRendering } from './note';
import { NoteDurationDenominator, StemDirection } from './enums';
import { Clef } from './clef';
import { KeySignature } from './keysignature';
import { Spanners } from './spanners';
import { Address } from './address';

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
  private musicXML: {
    note: musicxml.Note;
    directions: musicxml.Direction[];
    octaveShift: musicxml.OctaveShift | null;
  };
  private stem: StemDirection;
  private clef: Clef;
  private keySignature: KeySignature;
  private durationDenominator: NoteDurationDenominator;
  private graceNotes: Note[];

  constructor(opts: {
    config: Config;
    musicXML: {
      note: musicxml.Note;
      directions: musicxml.Direction[];
      octaveShift: musicxml.OctaveShift | null;
    };
    stem: StemDirection;
    clef: Clef;
    keySignature: KeySignature;
    durationDenominator: NoteDurationDenominator;
    graceNotes: Note[];
  }) {
    this.config = opts.config;
    this.musicXML = opts.musicXML;
    this.stem = opts.stem;
    this.clef = opts.clef;
    this.keySignature = opts.keySignature;
    this.durationDenominator = opts.durationDenominator;
    this.graceNotes = opts.graceNotes;
  }

  /** Renders the Chord. */
  render(opts: { spanners: Spanners; address: Address<'voice'> }): ChordRendering {
    const noteRenderings = Note.render({
      notes: this.getNotes(),
      spanners: opts.spanners,
      address: opts.address,
    });

    return {
      type: 'chord',
      notes: noteRenderings,
    };
  }

  private getNotes(): Note[] {
    const head = this.musicXML.note;
    const tail = head.getChordTail();
    const graceNotes = this.graceNotes;

    return [
      new Note({
        config: this.config,
        musicXML: {
          note: head,
          directions: this.musicXML.directions,
          octaveShift: this.musicXML.octaveShift,
        },
        stem: this.stem,
        clef: this.clef,
        keySignature: this.keySignature,
        durationDenominator: this.durationDenominator,
        graceNotes,
      }),
      ...tail.map(
        (note) =>
          new Note({
            config: this.config,
            // We don't want the `<directions>` to be handled multiple times, since it's already handled by the head
            // note.
            musicXML: {
              note,
              directions: [],
              octaveShift: this.musicXML.octaveShift,
            },
            stem: this.stem,
            clef: this.clef,
            keySignature: this.keySignature,
            durationDenominator: this.durationDenominator,
            graceNotes,
          })
      ),
    ];
  }
}
