import * as data from '@/data';
import * as util from '@/util';
import { MeasureEntryKey, MeasureKey, SystemKey } from './types';

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
    return this.getSystem(address).measures.map((_, measureIndex) => ({ ...address, measureIndex }));
  }

  getMeasures(address: SystemKey): data.Measure[] {
    return this.getSystem(address).measures;
  }

  getMeasure(address: MeasureKey): data.Measure {
    const measure = this.getMeasures(address).at(address.measureIndex);
    util.assertDefined(measure);
    return measure;
  }

  getMeasureEntryKeys(address: MeasureKey): MeasureEntryKey[] {
    return this.getMeasures(address).flatMap((measure, measureIndex) =>
      measure.entries.map((_, entryIndex) => ({
        ...address,
        measureIndex,
        entryIndex,
      }))
    );
  }

  getMeasureEntry(address: MeasureEntryKey): data.MeasureEntry {
    const measureEntry = this.getMeasures(address).at(address.measureIndex)?.entries.at(address.entryIndex);
    util.assertDefined(measureEntry);
    return measureEntry;
  }
}
