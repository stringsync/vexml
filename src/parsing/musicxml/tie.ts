import * as data from '@/data';
import * as musicxml from '@/musicxml';
import { NoteContext } from './contexts';

export class Tie {
  static fromMusicXML(musicXML: { tie: musicxml.Tie }): Tie {
    return new Tie();
  }

  parse(noteCtx: NoteContext): data.CurveRef {
    return {
      type: 'curveref',
      curveId: '',
    };
  }
}
