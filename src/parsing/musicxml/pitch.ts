import * as data from '@/data';

export class Pitch {
  constructor(private step: string, private octave: number) {}

  getStep(): string {
    return this.step;
  }

  getOctave(): number {
    return this.octave;
  }

  parse(): data.Pitch {
    return {
      type: 'pitch',
      step: this.step,
      octave: this.octave,
    };
  }
}
