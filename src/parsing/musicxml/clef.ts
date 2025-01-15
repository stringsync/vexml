import * as data from '@/data';
import * as musicxml from '@/musicxml';
import * as conversions from './conversions';
import { Config } from '@/config';
import { Logger } from '@/debug';

export class Clef {
  constructor(
    private config: Config,
    private log: Logger,
    private partId: string,
    private staveNumber: number,
    private sign: data.ClefSign,
    private octaveChange: number | null
  ) {}

  static default(config: Config, log: Logger, partId: string, staveNumber: number) {
    return new Clef(config, log, partId, staveNumber, 'treble', null);
  }

  static create(config: Config, log: Logger, partId: string, musicXML: { clef: musicxml.Clef }) {
    const clefSign = conversions.fromClefPropertiesToClefSign(musicXML.clef.getSign(), musicXML.clef.getLine());

    return new Clef(config, log, partId, musicXML.clef.getStaveNumber(), clefSign, musicXML.clef.getOctaveChange());
  }

  parse(): data.Clef {
    return {
      type: 'clef',
      sign: this.sign,
      octaveShift: this.octaveChange,
    };
  }

  getPartId(): string {
    return this.partId;
  }

  getStaveNumber(): number {
    return this.staveNumber;
  }

  isEqual(clef: Clef): boolean {
    return this.partId === clef.partId && this.staveNumber === clef.staveNumber && this.isEquivalent(clef);
  }

  isEquivalent(clef: Clef): boolean {
    return this.sign === clef.sign && this.octaveChange === clef.octaveChange;
  }
}
