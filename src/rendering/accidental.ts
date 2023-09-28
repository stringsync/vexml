import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';
import { Enum, EnumValues } from '@/util';

/** The result of rendering an Accidental. */
export type AccidentalRendering = {
  type: 'accidental';
  vexflow: {
    accidental: vexflow.Accidental;
  };
};

/**
 * The accidental code from VexFlow. The list only contains typical accidentals from Western music and is currently not
 * exhaustive.
 *
 * See https://github.com/0xfe/vexflow/blob/17755d786eae1670ee20e8101463b3368f2c06e5/src/tables.ts#L169
 */
export type AccidentalCode = EnumValues<typeof ACCIDENTAL_CODES>;
export const ACCIDENTAL_CODES = new Enum(['#', '##', 'b', 'bb', 'n', 'd', '_', 'db', '++']);

/**
 * Represents a musical accidental, which alters the pitch of a note.
 *
 * The `Accidental` class encompasses the symbols used in music notation to modify the pitch of a note by raising or
 * lowering it. Accidental types include sharps, flats, naturals, double sharps, and double flats. In music, accidentals
 * play a crucial role in creating chromatic variations, modulations, and certain harmonic structures.
 *
 * They are essential for conveying the exact melodic and harmonic intentions of the composer and ensuring the performer
 * realizes them accurately.
 */
export class Accidental {
  private code: AccidentalCode;
  private isCautionary: boolean;

  private constructor(opts: { code: AccidentalCode; isCautionary: boolean }) {
    this.code = opts.code;
    this.isCautionary = opts.isCautionary;
  }

  /**
   * Creates an Accidental.
   *
   * It's the caller's responsibility to not create an accidental if the note doesn't have one. Otherwise, this method
   * will throw.
   */
  static create(opts: { accidentalType: musicxml.AccidentalType | null; alter: number | null; isCautionary: boolean }) {
    const code = Accidental.toAccidentalCode(opts.accidentalType, opts.alter);
    return new Accidental({ code, isCautionary: opts.isCautionary });
  }

  private static toAccidentalCode(
    accidentalType: musicxml.AccidentalType | null,
    alter: number | null
  ): AccidentalCode {
    // AccidentalType takes precedence over alter.
    switch (accidentalType) {
      case 'sharp':
        return '#';
      case 'double-sharp':
        return '##';
      case 'flat':
        return 'b';
      case 'flat-flat':
        return 'bb';
      case 'natural':
        return 'n';
      case 'quarter-sharp':
        return '+';
    }

    switch (alter) {
      case 1:
        return '#';
      case 2:
        return '##';
      case -1:
        return 'b';
      case -2:
        return 'bb';
      case 0:
        return 'n';
      case -0.5:
        return 'd';
      case 0.5:
        return '+';
      case -1.5:
        return 'db';
      case 1.5:
        return '++';
      default:
        throw new Error(`cannot handle alter: ${alter}`);
    }
  }

  /** Clones the Accidental. */
  clone(): Accidental {
    return new Accidental({
      code: this.code,
      isCautionary: this.isCautionary,
    });
  }

  /** Renders the Accidental. */
  render(): AccidentalRendering {
    const vfAccidental = this.toVexflowAccidental();
    return { type: 'accidental', vexflow: { accidental: vfAccidental } };
  }

  private toVexflowAccidental(): vexflow.Accidental {
    const vfAccidental = new vexflow.Accidental(this.code);
    if (this.isCautionary) {
      vfAccidental.setAsCautionary();
    }
    return vfAccidental;
  }
}
