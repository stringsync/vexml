import * as musicxml from '@/musicxml';
import { Fragment } from './fragment';
import { PartSignature } from './types';

export class Measure {
  constructor(
    private index: number,
    private label: string,
    private partSignatures: PartSignature[],
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
