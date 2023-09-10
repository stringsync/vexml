import * as musicxml from '@/musicxml';
import { Measure } from './measure';

export class Stave {
  static fromMusicXml(part: musicxml.Part): Stave {
    return new Stave([]);
  }

  constructor(private measures: Measure[]) {}
}
