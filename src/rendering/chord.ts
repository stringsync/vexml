import * as debug from '@/debug';
import * as musicxml from '@/musicxml';
import { Config } from '@/config';
import { GraceNoteRendering, Note, StaveNoteRendering, TabGraceNoteRendering, TabNoteRendering } from './note';
import { NoteDurationDenominator, StemDirection } from './enums';
import { Clef } from './clef';
import { KeySignature } from './keysignature';
import { Spanners } from './spanners';
import { Address } from './address';

/** The result of rendering a Chord. */
export type ChordRendering = StaveChordRendering | GraceChordRendering | TabChordRendering | TabGraceChordRendering;

/** The result of rendering a stave Chord. */
export type StaveChordRendering = {
  type: 'stavechord';
  address: Address<'voice'>;
  notes: StaveNoteRendering[];
};

/** The result of rendering a grace Chord. */
export type GraceChordRendering = {
  type: 'gracechord';
  address: Address<'voice'>;
  graceNotes: GraceNoteRendering[];
};

/** The result of rendering a grace Tab Chord. */
export type TabChordRendering = {
  type: 'tabchord';
  address: Address<'voice'>;
  tabNotes: TabNoteRendering[];
};

/** The result of rendering a tab grace chord. */
export type TabGraceChordRendering = {
  type: 'tabgracechord';
  address: Address<'voice'>;
  tabGraceNotes: TabGraceNoteRendering[];
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
  private log: debug.Logger;
  private musicXML: {
    note: musicxml.Note;
    directions: musicxml.Direction[];
    octaveShift: musicxml.OctaveShift | null;
  };
  private stem: StemDirection;
  private clef: Clef;
  private keySignature: KeySignature;
  private durationDenominator: NoteDurationDenominator;

  constructor(opts: {
    config: Config;
    log: debug.Logger;
    musicXML: {
      note: musicxml.Note;
      directions: musicxml.Direction[];
      octaveShift: musicxml.OctaveShift | null;
    };
    stem: StemDirection;
    clef: Clef;
    keySignature: KeySignature;
    durationDenominator: NoteDurationDenominator;
  }) {
    this.config = opts.config;
    this.log = opts.log;
    this.musicXML = opts.musicXML;
    this.stem = opts.stem;
    this.clef = opts.clef;
    this.keySignature = opts.keySignature;
    this.durationDenominator = opts.durationDenominator;
  }

  /** Renders the Chord. */
  render(opts: { spanners: Spanners; address: Address<'voice'> }): ChordRendering {
    const noteRenderings = Note.render({
      config: this.config,
      log: this.log,
      notes: this.getNotes(),
      spanners: opts.spanners,
      address: opts.address,
    });

    const isTabGrace = noteRenderings.every(
      (noteRendering): noteRendering is TabGraceNoteRendering => noteRendering.type === 'tabgracenote'
    );
    const isTab = noteRenderings.every(
      (noteRendering): noteRendering is TabNoteRendering => noteRendering.type === 'tabnote'
    );
    const isStave = noteRenderings.every(
      (noteRendering): noteRendering is StaveNoteRendering => noteRendering.type === 'stavenote'
    );
    const isGrace = noteRenderings.every(
      (noteRendering): noteRendering is GraceNoteRendering => noteRendering.type === 'gracenote'
    );

    if (isTabGrace) {
      return {
        type: 'tabgracechord',
        address: opts.address,
        tabGraceNotes: noteRenderings,
      };
    } else if (isTab) {
      return {
        type: 'tabchord',
        address: opts.address,
        tabNotes: noteRenderings,
      };
    } else if (isStave) {
      return {
        type: 'stavechord',
        address: opts.address,
        notes: noteRenderings,
      };
    } else if (isGrace) {
      return {
        type: 'gracechord',
        address: opts.address,
        graceNotes: noteRenderings,
      };
    } else {
      throw new Error('chord renderings cannot contain both grace notes and stave notes');
    }
  }

  private getNotes(): Note[] {
    const head = this.musicXML.note;
    const tail = head.getChordTail();

    return [
      new Note({
        config: this.config,
        log: this.log,
        musicXML: {
          note: head,
          directions: this.musicXML.directions,
          octaveShift: this.musicXML.octaveShift,
        },
        stem: this.stem,
        clef: this.clef,
        keySignature: this.keySignature,
        durationDenominator: this.durationDenominator,
      }),
      ...tail.map(
        (note) =>
          new Note({
            config: this.config,
            log: this.log,
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
          })
      ),
    ];
  }
}
