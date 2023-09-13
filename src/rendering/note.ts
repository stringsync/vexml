import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';
import { Beam } from './beam';
import { Accidental, AccidentalRendering } from './accidental';

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

export type NoteRendering = {
  type: 'note';
  vexflow: {
    staveNote: vexflow.StaveNote;
  };
  accidental: AccidentalRendering | null;
};

export class Note {
  static create(opts: NoteCreateOptions): Note {
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

  render(): NoteRendering {
    const accidentalRendering = this.accidental?.render() ?? null;
    const vfAccidental = accidentalRendering?.vexflow.accidental ?? null;

    const vfStaveNote = this.toVexflowStaveNote(vfAccidental);

    return { type: 'note', vexflow: { staveNote: vfStaveNote }, accidental: accidentalRendering };
  }

  private toVexflowStaveNote(vfAccidental: vexflow.Accidental | null): vexflow.StaveNote {
    const vfStaveNote = new vexflow.StaveNote({
      keys: [this.key],
      duration: this.durationDenominator,
      dots: this.dotCount,
      clef: this.clefType,
    });

    if (vfAccidental) {
      vfStaveNote.addModifier(vfAccidental);
    }

    switch (this.stem) {
      case 'up':
        vfStaveNote.setStemDirection(vexflow.Stem.UP);
        break;
      case 'down':
        vfStaveNote.setStemDirection(vexflow.Stem.DOWN);
        break;
      default:
        vfStaveNote.autoStem();
    }

    return vfStaveNote;
  }
}
