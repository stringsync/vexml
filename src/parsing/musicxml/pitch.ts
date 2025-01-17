import * as data from '@/data';
import { Config } from '@/config';
import { Logger } from '@/debug';

export class Pitch {
  constructor(private config: Config, private log: Logger, private step: string, private octave: number) {}

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
