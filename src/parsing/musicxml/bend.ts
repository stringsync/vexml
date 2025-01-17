import * as data from '@/data';
import * as musicxml from '@/musicxml';
import { Config } from '@/config';
import { Logger } from '@/debug';

export class Bend {
  private constructor(
    private config: Config,
    private log: Logger,
    private bendType: data.BendType,
    private semitones: number
  ) {}

  static create(config: Config, log: Logger, musicXML: { bend: musicxml.Bend }): Bend {
    const semitones = musicXML.bend.getAlter();

    let bendType: data.BendType;
    switch (musicXML.bend.getType()) {
      case 'pre-bend':
        bendType = 'prebend';
        break;
      case 'release':
        bendType = 'release';
        break;
      default:
        bendType = 'normal';
        break;
    }

    return new Bend(config, log, bendType, semitones);
  }

  parse(): data.Bend {
    return {
      type: 'bend',
      bendType: this.bendType,
      semitones: this.semitones,
    };
  }
}
