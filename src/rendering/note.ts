import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';
import { Beam } from './beam';
import { Accidental } from './accidental';

type NoteCreateOptions = {
  musicXml: {
    note: musicxml.Note;
  };
  clefType: musicxml.ClefType;
};

type NoteConstructorOptions = {
  key: string;
  stem: musicxml.Stem | null;
  beams: Beam[];
  accidental: Accidental | null;
  dotCount: number;
  durationDenominator: musicxml.NoteDurationDenominator;
  clefType: musicxml.ClefType;
};

export type NoteRenderResult = Record<string, never>;

export class Note {
  static create(opts: NoteCreateOptions): Note {
    const note = opts.musicXml.note;

    let accidental: Accidental | null = null;
    const code = note.getAccidentalCode();
    if (musicxml.ACCIDENTAL_CODES.includes(code)) {
      const isCautionary = note.hasAccidentalCautionary();
      accidental = Accidental.create({ code, isCautionary });
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

    return new Note({ key, stem, beams, accidental, dotCount, durationDenominator, clefType });
  }

  private key: string;
  private stem: musicxml.Stem | null;
  private beams: Beam[];
  private accidental: Accidental | null;
  private dotCount: number;
  private durationDenominator: musicxml.NoteDurationDenominator;
  private clefType: musicxml.ClefType;

  private constructor(opts: NoteConstructorOptions) {
    this.key = opts.key;
    this.stem = opts.stem;
    this.beams = opts.beams;
    this.accidental = opts.accidental;
    this.dotCount = opts.dotCount;
    this.durationDenominator = opts.durationDenominator;
    this.clefType = opts.clefType;
  }

  toVexflowStaveNote(): vexflow.StaveNote {
    return new vexflow.StaveNote({
      keys: [this.key],
      duration: this.durationDenominator,
      dots: this.dotCount,
      clef: this.clefType,
    });
  }
}
