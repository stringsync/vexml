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
export const ACCIDENTAL_CODES = new Enum(['#', '##', 'b', 'bb', 'n', 'd', '_', 'db', '+', '++'] as const);

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

  /** Creates an Accidental. */
  static create(opts: { code: AccidentalCode; isCautionary: boolean }) {
    return new Accidental({ code: opts.code, isCautionary: opts.isCautionary });
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
