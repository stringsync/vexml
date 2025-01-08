import * as data from '@/data';
import * as musicxml from '@/musicxml';
import * as util from '@/util';
import { Measure } from './measure';
import { MeasureEvent } from './types';
import { Signature } from './signature';
import { ScoreContext, SystemContext } from './contexts';
import { MeasureEventCalculator } from './measureeventcalculator';
import { IdProvider } from './idprovider';

export class System {
  constructor(private idProvider: IdProvider, private musicXML: { scorePartwise: musicxml.ScorePartwise }) {}

  parse(scoreCtx: ScoreContext): data.System {
    const systemCtx = new SystemContext(scoreCtx);

    const parsedMeasures = new Array<data.Measure>();

    for (const measure of this.getMeasures()) {
      const multiRestEvents = measure.getEvents().filter((event) => event.type === 'multirest');
      for (const multiRestEvent of multiRestEvents) {
        systemCtx.incrementMultiRestCount(
          multiRestEvent.partId,
          multiRestEvent.staveNumber,
          multiRestEvent.measureCount
        );
      }

      const parsedMeasure = measure.parse(systemCtx);
      parsedMeasures.push(parsedMeasure);

      systemCtx.decrementMultiRestCounts();
    }

    return {
      type: 'system',
      measures: parsedMeasures,
    };
  }

  private getMeasures(): Measure[] {
    const partIds = this.getPartIds();

    const measureCount = this.getMeasureCount();
    const measureLabels = this.getMeasureLabels(measureCount);
    const measureEvents = this.getMeasureEvents();

    const measures = new Array<Measure>(measureCount);

    let signature = Signature.default();

    for (let measureIndex = 0; measureIndex < measureCount; measureIndex++) {
      const measureLabel = measureLabels[measureIndex];
      const measure = new Measure(
        signature,
        measureIndex,
        measureLabel,
        measureEvents.filter((event) => event.measureIndex === measureIndex),
        partIds
      );
      measures[measureIndex] = measure;
      signature = measure.getLastSignature();
    }

    return measures;
  }

  private getPartIds(): string[] {
    return this.musicXML.scorePartwise.getParts().map((part) => part.getId());
  }

  private getMeasureCount() {
    return util.max(this.musicXML.scorePartwise.getParts().map((part) => part.getMeasures().length));
  }

  private getMeasureLabels(measureCount: number): Array<number | null> {
    const measureLabels = new Array<number | null>(measureCount).fill(null);

    const part = util.first(this.musicXML.scorePartwise.getParts());
    if (!part) {
      return measureLabels;
    }

    const measures = part.getMeasures();

    for (let measureIndex = 0; measureIndex < measureCount; measureIndex++) {
      const measure = measures[measureIndex];
      if (measure.isImplicit()) {
        measureLabels[measureIndex] = null;
      }

      const number = parseInt(measure.getNumber(), 10);
      if (Number.isInteger(number) && !Number.isNaN(number)) {
        measureLabels[measureIndex] = number;
      } else {
        measureLabels[measureIndex] = measureIndex + 1;
      }
    }

    return measureLabels;
  }

  private getMeasureEvents(): MeasureEvent[] {
    return new MeasureEventCalculator({ scorePartwise: this.musicXML.scorePartwise }).calculate();
  }
}
