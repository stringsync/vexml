import * as data from '@/data';
import * as util from '@/util';
import * as musicxml from '@/musicxml';
import { Fraction } from './fraction';
import { Pitch } from './pitch';

export class Rest {
  constructor(
    private measureBeat: util.Fraction,
    private duration: util.Fraction,
    private displayStep: string | null,
    private displayOctave: number | null
  ) {}

  static fromMusicXML(measureBeat: util.Fraction, duration: util.Fraction, musicXML: { note: musicxml.Note }): Rest {
    util.assert(musicXML.note.isRest(), 'Expected note to be a rest');

    const displayStep = musicXML.note.getRestDisplayStep();
    const displayOctave = musicXML.note.getRestDisplayOctave();

    return new Rest(measureBeat, duration, displayStep, displayOctave);
  }

  parse(): data.Rest {
    return {
      type: 'rest',
      measureBeat: this.getMeasureBeat().parse(),
      duration: this.getDuration().parse(),
      displayPitch: this.getDisplayPitch()?.parse() ?? null,
    };
  }

  getMeasureBeat(): Fraction {
    return new Fraction(this.measureBeat);
  }

  getDuration(): Fraction {
    return new Fraction(this.duration);
  }

  getDisplayPitch(): Pitch | null {
    if (this.displayStep === null || this.displayOctave === null) {
      return null;
    }

    return new Pitch(this.displayStep, this.displayOctave);
  }
}
