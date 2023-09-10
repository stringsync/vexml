import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';

type CreateOptions = {
  code: musicxml.AccidentalCode;
  isCautionary: boolean;
};

type RenderOptions = {
  ctx: vexflow.RenderContext;
};

export class Accidental {
  static create(opts: CreateOptions): Accidental {
    return new Accidental(opts.code, opts.isCautionary);
  }

  private code: musicxml.AccidentalCode;
  private isCautionary: boolean;

  private constructor(code: musicxml.AccidentalCode, isCautionary: boolean) {
    this.code = code;
    this.isCautionary = isCautionary;
  }

  render(opts: RenderOptions) {
    // noop
  }
}
