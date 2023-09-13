import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';

export type AccidentalRendering = {
  type: 'accidental';
  vexflow: {
    accidental: vexflow.Accidental;
  };
};

export class Accidental {
  private code: musicxml.AccidentalCode;
  private isCautionary: boolean;

  constructor(opts: { code: musicxml.AccidentalCode; isCautionary: boolean }) {
    this.code = opts.code;
    this.isCautionary = opts.isCautionary;
  }

  getCode(): musicxml.AccidentalCode {
    return this.code;
  }

  getIsCautionary(): boolean {
    return this.isCautionary;
  }

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
