import * as musicxml from '@/musicxml';
import { Fragment } from './fragment';

export class Measure {
  constructor(
    private index: number,
    private label: string,
    private musicXML: { scorePartwise: musicxml.ScorePartwise }
  ) {}

  getIndex(): number {
    return this.index;
  }

  getLabel(): string {
    return this.label;
  }

  getFragments(): Fragment[] {
    return [];
  }
}
