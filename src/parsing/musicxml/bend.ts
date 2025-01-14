import * as data from '@/data';
import * as musicxml from '@/musicxml';

export class Bend {
  private constructor(private bendType: data.BendType, private semitones: number) {}

  static create(musicXML: { bend: musicxml.Bend }): Bend {
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

    return new Bend(bendType, semitones);
  }

  parse(): data.Bend {
    return {
      type: 'bend',
      bendType: this.bendType,
      semitones: this.semitones,
    };
  }
}
