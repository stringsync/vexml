import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';
import { Beam } from './beam';
import { Accidental, AccidentalRendering } from './accidental';
import { Config } from './config';

export type ModifierRendering = AccidentalRendering | null;

export type NoteRendering = {
  type: 'note';
  keys: string[];
  vexflow: {
    staveNote: vexflow.StaveNote;
  };
  modifierGroups: ModifierRendering[][];
};

export class Note {
  private config: Config;
  private key: string;
  private stem: musicxml.Stem | null;
  private beams: Beam[];
  private accidental: Accidental | null;
  private dotCount: number;
  private durationDenominator: musicxml.NoteDurationDenominator;
  private clefType: musicxml.ClefType;

  private constructor(opts: {
    config: Config;
    key: string;
    stem: musicxml.Stem | null;
    beams: Beam[];
    accidental: Accidental | null;
    dotCount: number;
    durationDenominator: musicxml.NoteDurationDenominator;
    clefType: musicxml.ClefType;
  }) {
    this.config = opts.config;
    this.key = opts.key;
    this.stem = opts.stem;
    this.beams = opts.beams;
    this.accidental = opts.accidental;
    this.dotCount = opts.dotCount;
    this.durationDenominator = opts.durationDenominator;
    this.clefType = opts.clefType;
  }

  static create(opts: {
    config: Config;
    musicXml: {
      note: musicxml.Note;
    };
    clefType: musicxml.ClefType;
  }): Note {
    const note = opts.musicXml.note;

    let accidental: Accidental | null = null;
    const code = note.getAccidentalCode();
    if (musicxml.ACCIDENTAL_CODES.includes(code)) {
      const isCautionary = note.hasAccidentalCautionary();
      accidental = new Accidental({ code, isCautionary });
    }

    const clefType = opts.clefType;
    const stem = note.getStem();
    const beams = note.getBeams().map((beam) => Beam.create({ musicXml: { beam } }));
    const dotCount = note.getDotCount();
    const durationDenominator = note.getDurationDenominator();

    let key = note.getPitch();
    const suffix = note.getNoteheadSuffix();
    if (suffix) {
      key += `/${suffix}`;
    }

    return new Note({
      config: opts.config,
      key,
      stem,
      beams,
      accidental,
      dotCount,
      durationDenominator,
      clefType,
    });
  }

  /**
   * Renders multiple notes as a single vexflow.StaveNote.
   *
   * This exists to dedup code with rendering.Chord without exposing private members in this class.
   */
  static render(notes: Note[]): NoteRendering {
    if (notes.length === 0) {
      throw new Error('cannot render empty notes');
    }

    const durationDenominators = new Set(notes.map((note) => note.durationDenominator));
    if (durationDenominators.size > 1) {
      throw new Error('all notes must have the same durationDenominator');
    }

    const dotCounts = new Set(notes.map((note) => note.dotCount));
    if (dotCounts.size > 1) {
      throw new Error('all notes must have the same dotCount');
    }

    const clefTypes = new Set(notes.map((note) => note.clefType));
    if (clefTypes.size > 1) {
      throw new Error('all notes must have the same clefTypes');
    }

    const keys = notes.map((note) => note.key);

    const vfStaveNote = new vexflow.StaveNote({
      keys: notes.map((note) => note.key),
      duration: notes[0].durationDenominator,
      dots: notes[0].dotCount,
      clef: notes[0].clefType,
    });

    const modifierRenderingGroups = notes.map<ModifierRendering[]>((note) => {
      const renderings = new Array<ModifierRendering>();
      if (note.accidental) {
        renderings.push(note.accidental.render());
      }
      return renderings;
    });

    modifierRenderingGroups.forEach((modifierRenderings, index) => {
      for (const modifierRendering of modifierRenderings) {
        switch (modifierRendering?.type) {
          case 'accidental':
            vfStaveNote.addModifier(modifierRendering.vexflow.accidental, index);
        }
      }
    });

    return { type: 'note', keys, vexflow: { staveNote: vfStaveNote }, modifierGroups: modifierRenderingGroups };
  }

  clone(): Note {
    return new Note({
      config: this.config,
      key: this.key,
      stem: this.stem,
      beams: this.beams.map((beam) => beam.clone()),
      accidental: this.accidental?.clone() ?? null,
      dotCount: this.dotCount,
      durationDenominator: this.durationDenominator,
      clefType: this.clefType,
    });
  }

  render(): NoteRendering {
    return Note.render([this]);
  }
}
