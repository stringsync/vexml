import * as data from '@/data';

export class Accidental {
  constructor(private code: data.AccidentalCode, private isCautionary: boolean) {}

  parse(): data.Accidental {
    return {
      type: 'accidental',
      code: this.code,
      isCautionary: this.isCautionary,
    };
  }
}
