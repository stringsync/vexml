import * as data from '@/data';
import * as musicxml from '@/musicxml';
import * as conversions from './conversions';

export class Metronome {
  constructor(
    private opts: {
      name?: string;
      parenthesis?: boolean;
      duration?: string;
      dots?: number;
      bpm?: number | string;
      duration2?: string;
      dots2?: number;
    }
  ) {}

  static default(): Metronome {
    return new Metronome({ bpm: 120 });
  }

  static create(musicXML: { metronome: musicxml.Metronome; mark: musicxml.MetronomeMark }): Metronome {
    const parenthesis = musicXML.metronome.parentheses() ?? undefined;
    const duration = conversions.fromNoteTypeToDurationType(musicXML.mark.left.unit) ?? undefined;
    const dots = musicXML.mark.left.dotCount;

    switch (musicXML.mark.right.type) {
      case 'note':
        const duration2 = conversions.fromNoteTypeToDurationType(musicXML.mark.right.unit) ?? undefined;
        const dots2 = musicXML.mark.right.dotCount;
        return new Metronome({ parenthesis, duration, dots, duration2, dots2 });
      case 'bpm':
        const bpm = musicXML.mark.right.bpm;
        return new Metronome({ parenthesis, duration, dots, bpm });
    }
  }

  parse(): data.Metronome {
    return {
      type: 'metronome',
      ...this.opts,
    };
  }

  isEqual(metronome: Metronome): boolean {
    return (
      this.opts.name === metronome.opts.name &&
      this.opts.parenthesis === metronome.opts.parenthesis &&
      this.opts.duration === metronome.opts.duration &&
      this.opts.dots === metronome.opts.dots &&
      this.opts.bpm === metronome.opts.bpm &&
      this.opts.duration2 === metronome.opts.duration2 &&
      this.opts.dots2 === metronome.opts.dots2
    );
  }
}
