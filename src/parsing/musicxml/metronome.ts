import * as musicxml from '@/musicxml';

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

  merge(musicXML: { metronome: musicxml.Metronome; metronomeMark: musicxml.MetronomeMark }): Metronome {
    // TODO: Implement this.
    return new Metronome(this.opts);
  }
}
