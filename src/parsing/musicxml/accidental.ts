import * as data from '@/data';
import * as musicxml from '@/musicxml';
import * as conversions from './conversions';

export class Accidental {
  constructor(private isExplicit: boolean, private code: data.AccidentalCode, private isCautionary: boolean) {}

  static fromMusicXML(musicXML: { note: musicxml.Note }): Accidental {
    const code =
      conversions.fromAccidentalTypeToAccidentalCode(musicXML.note.getAccidentalType()) ??
      conversions.fromAlterToAccidentalCode(musicXML.note.getAlter()) ??
      'n';
    const isExplicit = musicXML.note.getAccidentalType() !== null;
    const isCautionary = musicXML.note.hasAccidentalCautionary();
    return new Accidental(isExplicit, code, isCautionary);
  }

  parse(
    keyAccidentalCode: data.AccidentalCode,
    currentAccidentalCode: data.AccidentalCode | null
  ): data.Accidental | null {
    if (!this.isExplicit && keyAccidentalCode === this.code) {
      return null;
    }

    if (currentAccidentalCode !== null && currentAccidentalCode === this.code) {
      return null;
    }

    return {
      type: 'accidental',
      code: this.code,
      isCautionary: this.isCautionary,
    };
  }
}
