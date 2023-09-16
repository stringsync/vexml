import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';

/** The result of rendering an Accidental. */
export type AccidentalRendering = {
  type: 'accidental';
  vexflow: {
    accidental: vexflow.Accidental;
  };
};

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
  private code: musicxml.AccidentalCode;
  private isCautionary: boolean;

  constructor(opts: { code: musicxml.AccidentalCode; isCautionary: boolean }) {
    this.code = opts.code;
    this.isCautionary = opts.isCautionary;
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
