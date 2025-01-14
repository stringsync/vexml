import * as data from '@/data';
import { Metronome } from './metronome';

export class FragmentSignature {
  constructor(private metronome: Metronome) {}

  parse(): data.FragmentSignature {
    return {
      type: 'fragmentsignature',
      metronome: this.metronome.parse(),
    };
  }
}
