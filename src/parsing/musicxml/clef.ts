import * as data from '@/data';
import * as musicxml from '@/musicxml';
import type * as mdom from '@stringsync/mdom';
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

  static fromMdom(config: Config, log: Logger, partId: string, mdom: { clef: mdom.Clef }): Clef {
    const clef = mdom.clef;
    const clefSign = conversions.fromClefPropertiesToClefSign(clef.sign as musicxml.ClefSign, clef.line);
    // Prefer the raw child so an absent <clef-octave-change> stays null (mdom's typed getter defaults to 0).
    const rawOctaveChange = clef.child('clef-octave-change')?.text;
    const octaveChange = typeof rawOctaveChange === 'string' ? parseInt(rawOctaveChange, 10) : null;
    return new Clef(config, log, partId, parseInt(clef.staff, 10), clefSign, octaveChange);
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
