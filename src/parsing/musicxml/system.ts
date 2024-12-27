import * as musicxml from '@/musicxml';
import * as util from '@/util';
import { Measure } from './measure';

export class System {
  constructor(private musicXML: { scorePartwise: musicxml.ScorePartwise }) {}

  getMeasures(): Measure[] {
    const measureCount = this.getMeasureCount();
    const measureLabels = this.getMeasureLabels(measureCount);

    const measures = new Array<Measure>(measureCount);
    for (let measureIndex = 0; measureIndex < measureCount; measureIndex++) {
      const measureLabel = measureLabels[measureIndex];
      measures[measureIndex] = new Measure(measureIndex, measureLabel, {
        scorePartwise: this.musicXML.scorePartwise,
      });
    }

    return measures;
  }

  private getMeasureCount() {
    return util.max(this.musicXML.scorePartwise.getParts().map((part) => part.getMeasures().length));
  }

  private getMeasureLabels(measureCount: number): string[] {
    const measureLabels = new Array<string>(measureCount).fill('');

    const part = util.first(this.musicXML.scorePartwise.getParts());
    if (!part) {
      return measureLabels;
    }

    const measures = part.getMeasures();

    for (let measureIndex = 0; measureIndex < measureCount; measureIndex++) {
      const measure = measures[measureIndex];
      if (measure.isImplicit()) {
        continue;
      }

      const number = parseInt(measure.getNumber(), 10);
      if (Number.isInteger(number) && !Number.isNaN(number)) {
        measureLabels[measureIndex] = number.toString();
      } else {
        measureLabels[measureIndex] = (measureIndex + 1).toString();
      }
    }

    return measureLabels;
  }
}
