import * as data from '@/data';
import * as util from '@/util';
import * as musicxml from '@/musicxml';
import { Fraction } from './fraction';

export class Rest {
  constructor(private measureBeat: util.Fraction, private duration: util.Fraction) {}

  static fromMusicXML(measureBeat: util.Fraction, duration: util.Fraction, musicXML: { note: musicxml.Note }): Rest {
    util.assert(musicXML.note.isRest(), 'Expected note to be a rest');
    return new Rest(measureBeat, duration);
  }

  parse(): data.Rest {
    return {
      type: 'rest',
      measureBeat: this.getMeasureBeat().parse(),
      duration: this.getDuration().parse(),
      displayPitch: null,
    };
  }

  getMeasureBeat(): Fraction {
    return new Fraction(this.measureBeat);
  }

  getDuration(): Fraction {
    return new Fraction(this.duration);
  }
}
