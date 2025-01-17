import * as data from '@/data';
import { Metronome } from './metronome';
import { Config } from '@/config';
import { Logger } from '@/debug';

export class FragmentSignature {
  constructor(private config: Config, private log: Logger, private metronome: Metronome) {}

  parse(): data.FragmentSignature {
    return {
      type: 'fragmentsignature',
      metronome: this.metronome.parse(),
    };
  }
}
