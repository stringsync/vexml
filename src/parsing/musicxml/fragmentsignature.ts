import { Metronome } from './metronome';

export class FragmentSignature {
  constructor(private metronome: Metronome) {}

  getMetronome(): Metronome {
    return this.metronome;
  }
}
