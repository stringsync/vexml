import { Fragment } from './fragment';

export class Measure {
  constructor(private fragments: Fragment[]) {}

  getFragments(): Fragment[] {
    return this.fragments;
  }

  getWidth(): number {
    throw new Error('not implemented');
  }
}
