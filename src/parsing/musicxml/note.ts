import { Fraction } from '@/util';
import { Notehead, StemDirection } from './enums';

export class Note {
  constructor(
    private pitch: string,
    private octave: number,
    private head: Notehead,
    private dotCount: number,
    private stemDirection: StemDirection,
    private duration: Fraction,
    private measureBeat: Fraction
  ) {}

  getPitch(): string {
    return this.pitch;
  }

  getOctave(): number {
    return this.octave;
  }

  getHead(): Notehead {
    return this.head;
  }

  getDotCount(): number {
    return this.dotCount;
  }

  getStemDirection(): StemDirection {
    return this.stemDirection;
  }

  getDuration(): Fraction {
    return this.duration;
  }

  getMeasureBeat(): Fraction {
    return this.measureBeat;
  }
}
