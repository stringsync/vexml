import * as data from '@/data';
import * as util from '@/util';
import { MeasureKey, SystemKey } from './types';

/** A wrapper around {@link data.Document} that provides querying capabilities. */
export class Document {
  constructor(private data: data.Document) {}

  getScore(): data.Score {
    return this.data.score;
  }

  getSystemKeys(): SystemKey[] {
    return this.data.score.systems.map((_, systemIndex) => ({ systemIndex }));
  }

  getSystem(address: SystemKey): data.System {
    const system = this.data.score.systems.at(address.systemIndex);
    util.assertDefined(system);
    return system;
  }

  getMeasureKeys(address: SystemKey): MeasureKey[] {
    const systemIndex = address.systemIndex;
    return this.getSystem(address).measures.map((_, measureIndex) => ({ systemIndex, measureIndex }));
  }

  getMeasures(address: SystemKey): data.Measure[] {
    return this.getSystem(address).measures;
  }
}
