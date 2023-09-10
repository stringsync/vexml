import * as musicxml from '@/musicxml';
import { Note } from './note';

export class Voice {
  static fromMusicXml(measure: musicxml.Measure): Voice {
    // TODO(jared) Figure out how to get multiple notes.

    return new Voice([]);
  }

  constructor(private notes: Note[]) {}
}
