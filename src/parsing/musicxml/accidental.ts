import * as data from '@/data';
import { NoteContext } from './contexts';

export class Accidental {
  constructor(private code: data.AccidentalCode, private isCautionary: boolean) {}

  parse(noteCtx: NoteContext): data.Accidental {
    noteCtx.setActiveAccidental(this.code);

    return {
      type: 'accidental',
      code: this.code,
      isCautionary: this.isCautionary,
    };
  }
}
