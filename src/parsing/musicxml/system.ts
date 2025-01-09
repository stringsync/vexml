import * as data from '@/data';
import * as musicxml from '@/musicxml';
import * as util from '@/util';
import { Measure } from './measure';
import { MeasureEvent } from './types';
import { Signature } from './signature';
import { ScoreContext, SystemContext } from './contexts';
import { MeasureEventCalculator } from './measureeventcalculator';
import { JumpGroup } from './jumpgroup';

export class System {
  constructor(
    private partIds: string[],
    private measureCount: number,
    private measureLabels: Array<number | null>,
    private measureEvents: MeasureEvent[],
    private jumpGroups: JumpGroup[]
  ) {}

  static fromMusicXML(musicXML: { scorePartwise: musicxml.ScorePartwise }): System {
    const partIds = musicXML.scorePartwise.getParts().map((part) => part.getId());
    const measureCount = util.max(musicXML.scorePartwise.getParts().map((part) => part.getMeasures().length));
    const measureLabels = System.getMeasureLabels(measureCount, musicXML);
    const measureEvents = new MeasureEventCalculator({ scorePartwise: musicXML.scorePartwise }).calculate();

    const jumpGroups = new Array<JumpGroup>();
    for (let measureIndex = 0; measureIndex < measureCount; measureIndex++) {
      const jumpGroup = JumpGroup.fromMusicXML(measureIndex, musicXML);
      jumpGroups.push(jumpGroup);
    }

    return new System(partIds, measureCount, measureLabels, measureEvents, jumpGroups);
  }

  private static getMeasureLabels(
    measureCount: number,
    musicXML: { scorePartwise: musicxml.ScorePartwise }
  ): Array<number | null> {
    const measureLabels = new Array<number | null>(measureCount).fill(null);

    const part = util.first(musicXML.scorePartwise.getParts());
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
    const measures = new Array<Measure>(this.measureCount);

    let signature = Signature.default();

    for (let measureIndex = 0; measureIndex < this.measureCount; measureIndex++) {
      const measureLabel = this.measureLabels[measureIndex];
      const jumpGroup = this.jumpGroups[measureIndex];
      const measure = new Measure(
        signature,
        measureIndex,
        measureLabel,
        this.measureEvents.filter((event) => event.measureIndex === measureIndex),
        this.partIds,
        jumpGroup
      );
      measures[measureIndex] = measure;
      signature = measure.getLastSignature();
    }

    return measures;
  }
}
