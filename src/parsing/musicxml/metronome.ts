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

  static fromMusicXML(musicXML: { metronome: musicxml.Metronome; mark: musicxml.MetronomeMark }): Metronome {
    const parenthesis = musicXML.metronome.parentheses() ?? undefined;
    const duration = conversions.fromNoteTypeToNoteDurationDenominator(musicXML.mark.left.unit) ?? undefined;
    const dots = musicXML.mark.left.dotCount;

    switch (musicXML.mark.right.type) {
      case 'note':
        const duration2 = conversions.fromNoteTypeToNoteDurationDenominator(musicXML.mark.right.unit) ?? undefined;
        const dots2 = musicXML.mark.right.dotCount;
        return new Metronome({ parenthesis, duration, dots, duration2, dots2 });
      case 'bpm':
        const bpm = musicXML.mark.right.bpm;
        return new Metronome({ parenthesis, duration, dots, bpm });
    }
  }

  getName(): string | undefined {
    return this.opts.name;
  }

  getParenthesis(): boolean | undefined {
    return this.opts.parenthesis;
  }

  getDuration(): string | undefined {
    return this.opts.duration;
  }

  getDots(): number | undefined {
    return this.opts.dots;
  }

  getBpm(): number | string | undefined {
    return this.opts.bpm;
  }

  getDuration2(): string | undefined {
    return this.opts.duration2;
  }

  getDots2(): number | undefined {
    return this.opts.dots2;
  }

  isEqual(metronome: Metronome): boolean {
    return (
      this.getName() === metronome.getName() &&
      this.getParenthesis() === metronome.getParenthesis() &&
      this.getDuration() === metronome.getDuration() &&
      this.getDots() === metronome.getDots() &&
      this.getBpm() === metronome.getBpm() &&
      this.getDuration2() === metronome.getDuration2() &&
      this.getDots2() === metronome.getDots2()
    );
  }
}
