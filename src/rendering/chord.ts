import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';
import { Accidental, AccidentalRendering } from './accidental';
import { Beam } from './beam';

type ChordCreateOptions = {
  musicXml: {
    note: musicxml.Note;
  };
  clefType: musicxml.ClefType;
};

type ChordConstructorOptions = {
  keys: string[];
  stem: musicxml.Stem | null;
  beams: Beam[];
  accidental: Accidental | null;
  dotCount: number;
  durationDenominator: musicxml.NoteDurationDenominator;
  clefType: musicxml.ClefType;
};

export type ChordRendering = {
  type: 'chord';
  vexflow: {
    staveNote: vexflow.StaveNote;
  };
  accidental: AccidentalRendering | null;
};

export class Chord {
  static create(opts: ChordCreateOptions): Chord {
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

    const keys = [note, ...note.getChordTail()].map(Chord.getKey);

    return new Chord({ keys, stem, beams, accidental, dotCount, durationDenominator, clefType });
  }

  private static getKey(note: musicxml.Note): string {
    let key = note.getPitch();
    const suffix = note.getNoteheadSuffix();
    if (suffix) {
      key += `/${suffix}`;
    }
    return key;
  }

  private keys: string[];
  private stem: musicxml.Stem | null;
  private beams: Beam[];
  private accidental: Accidental | null;
  private dotCount: number;
  private durationDenominator: musicxml.NoteDurationDenominator;
  private clefType: musicxml.ClefType;

  private constructor(opts: ChordConstructorOptions) {
    this.keys = opts.keys;
    this.stem = opts.stem;
    this.beams = opts.beams;
    this.accidental = opts.accidental;
    this.dotCount = opts.dotCount;
    this.durationDenominator = opts.durationDenominator;
    this.clefType = opts.clefType;
  }

  render(): ChordRendering {
    const accidentalRendering = this.accidental?.render() ?? null;
    const vfAccidental = accidentalRendering?.vexflow.accidental ?? null;

    const vfStaveNote = this.toVexflowStaveNote(vfAccidental);

    return { type: 'chord', vexflow: { staveNote: vfStaveNote }, accidental: accidentalRendering };
  }

  private toVexflowStaveNote(vfAccidental: vexflow.Accidental | null): vexflow.StaveNote {
    const vfStaveNote = new vexflow.StaveNote({
      keys: this.keys,
      duration: this.durationDenominator,
      dots: this.dotCount,
      clef: this.clefType,
    });

    if (vfAccidental) {
      vfStaveNote.addModifier(vfAccidental);
    }

    return vfStaveNote;
  }
}
