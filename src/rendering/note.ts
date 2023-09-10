import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';
import { Beam } from './beam';
import { Accidental } from './accidental';

type CreateOptions = {
  musicXml: {
    note: musicxml.Note;
  };
  clefType: musicxml.ClefType;
};

type ConstructorOptions = {
  stem: musicxml.Stem | null;
  beams: Beam[];
  accidental: Accidental | null;
  isRest: boolean;
  pitch: string;
  dotCount: number;
  durationDenominator: musicxml.NoteDurationDenominator;
  clefType: musicxml.ClefType;
};

type RenderOptions = {
  ctx: vexflow.RenderContext;
};

export class Note {
  static create(opts: CreateOptions): Note {
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
    const isRest = note.isRest();
    const pitch = isRest ? Note.getRestPitch(clefType) : Note.getAudibleNotePitch(note);
    const dotCount = note.getDotCount();
    const durationDenominator = note.getDurationDenominator();

    return new Note({ stem, beams, accidental, isRest, pitch, dotCount, durationDenominator, clefType });
  }

  private static getAudibleNotePitch(note: musicxml.Note): string {
    let pitch = note.getPitch();
    const suffix = note.getNoteheadSuffix();
    if (suffix) {
      pitch += `/${suffix}`;
    }
    return pitch;
  }

  private static getRestPitch(clefType: musicxml.ClefType): string {
    switch (clefType) {
      case 'bass':
        return 'D/2';
      default:
        return 'B/4';
    }
  }

  private stem: musicxml.Stem | null;
  private beams: Beam[];
  private accidental: Accidental | null;
  private isRest: boolean;
  private pitch: string;
  private dotCount: number;
  private durationDenominator: musicxml.NoteDurationDenominator;
  private clefType: musicxml.ClefType;

  private constructor(opts: ConstructorOptions) {
    this.stem = opts.stem;
    this.beams = opts.beams;
    this.accidental = opts.accidental;
    this.isRest = opts.isRest;
    this.pitch = opts.pitch;
    this.dotCount = opts.dotCount;
    this.durationDenominator = opts.durationDenominator;
    this.clefType = opts.clefType;
  }

  render(opts: RenderOptions): void {
    // noop
  }
}
