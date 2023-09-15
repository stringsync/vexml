import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';
import { Accidental, AccidentalRendering } from './accidental';
import { Beam } from './beam';
import { Config } from './config';

export type ChordRendering = {
  type: 'chord';
  vexflow: {
    staveNote: vexflow.StaveNote;
  };
  accidental: AccidentalRendering | null;
};

export class Chord {
  private config: Config;
  private keys: string[];
  private stem: musicxml.Stem | null;
  private beams: Beam[];
  private accidental: Accidental | null;
  private dotCount: number;
  private durationDenominator: musicxml.NoteDurationDenominator;
  private clefType: musicxml.ClefType;

  private constructor(opts: {
    config: Config;
    keys: string[];
    stem: musicxml.Stem | null;
    beams: Beam[];
    accidental: Accidental | null;
    dotCount: number;
    durationDenominator: musicxml.NoteDurationDenominator;
    clefType: musicxml.ClefType;
  }) {
    this.config = opts.config;
    this.keys = opts.keys;
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
  }): Chord {
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

    return new Chord({
      config: opts.config,
      keys,
      stem,
      beams,
      accidental,
      dotCount,
      durationDenominator,
      clefType,
    });
  }

  private static getKey(note: musicxml.Note): string {
    let key = note.getPitch();
    const suffix = note.getNoteheadSuffix();
    if (suffix) {
      key += `/${suffix}`;
    }
    return key;
  }

  clone(): Chord {
    return new Chord({
      config: this.config,
      keys: [...this.keys],
      stem: this.stem,
      beams: this.beams.map((beam) => beam.clone()),
      accidental: this.accidental?.clone() ?? null,
      dotCount: this.dotCount,
      durationDenominator: this.durationDenominator,
      clefType: this.clefType,
    });
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
