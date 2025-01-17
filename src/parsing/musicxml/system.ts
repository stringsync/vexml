import * as data from '@/data';
import * as musicxml from '@/musicxml';
import * as util from '@/util';
import * as conversions from './conversions';
import { Measure } from './measure';
import { Signature } from './signature';
import { ScoreContext, SystemContext } from './contexts';
import { EventCalculator } from './eventcalculator';
import { JumpGroup } from './jumpgroup';
import { Config } from '@/config';
import { Logger } from '@/debug';

export class System {
  private constructor(private config: Config, private log: Logger, private measures: Measure[]) {}

  static create(config: Config, log: Logger, musicXML: { scorePartwise: musicxml.ScorePartwise }): System {
    const partIds = musicXML.scorePartwise.getParts().map((part) => part.getId());

    const measureCount = util.max(musicXML.scorePartwise.getParts().map((part) => part.getMeasures().length));
    const measureLabels = System.getMeasureLabels(measureCount, musicXML);
    const measureEvents = new EventCalculator(config, log, { scorePartwise: musicXML.scorePartwise }).calculate();

    const jumpGroups = System.getJumpGroups(config, log, measureCount, musicXML);

    const startBarlineStyles = System.getBarlineStyles(measureCount, 'left', musicXML, jumpGroups);
    const endBarlineStyles = System.getBarlineStyles(measureCount, 'right', musicXML, jumpGroups);

    const measures = new Array<Measure>(measureCount);

    let signature = Signature.default(config, log);

    for (let measureIndex = 0; measureIndex < measureCount; measureIndex++) {
      const measureLabel = measureLabels[measureIndex];
      const jumpGroup = jumpGroups[measureIndex];
      const startBarlineStyle = startBarlineStyles[measureIndex];
      const endBarlineStyle = endBarlineStyles[measureIndex];

      const measure = Measure.create(
        config,
        log,
        signature,
        measureIndex,
        measureLabel,
        measureEvents.filter((event) => event.measureIndex === measureIndex),
        partIds,
        jumpGroup,
        startBarlineStyle,
        endBarlineStyle
      );
      measures[measureIndex] = measure;
      signature = measure.getLastSignature();
    }

    return new System(config, log, measures);
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

  private static getJumpGroups(
    config: Config,
    log: Logger,
    measureCount: number,
    musicXML: { scorePartwise: musicxml.ScorePartwise }
  ): Array<JumpGroup> {
    const jumpGroups = new Array<JumpGroup>();

    for (let measureIndex = 0; measureIndex < measureCount; measureIndex++) {
      const jumpGroup = JumpGroup.create(config, log, measureIndex, musicXML);
      jumpGroups.push(jumpGroup);
    }

    return jumpGroups;
  }

  private static getBarlineStyles(
    measureCount: number,
    location: musicxml.BarlineLocation,
    musicXML: { scorePartwise: musicxml.ScorePartwise },
    jumpGroups: JumpGroup[]
  ): Array<data.BarlineStyle | null> {
    const barlineStyles = new Array<data.BarlineStyle | null>(measureCount).fill(null);

    for (let measureIndex = 0; measureIndex < measureCount; measureIndex++) {
      const jumpGroup = jumpGroups[measureIndex];

      let jumpGroupBarlineStyle: data.BarlineStyle | null = null;
      if (location === 'left') {
        jumpGroupBarlineStyle = jumpGroup.getStartBarlineStyle();
      }
      if (location === 'right') {
        jumpGroupBarlineStyle = jumpGroup.getEndBarlineStyle();
      }

      const barlineStyle =
        jumpGroupBarlineStyle ??
        conversions.fromMusicXMLBarStyleToBarlineStyle(
          musicXML.scorePartwise
            .getParts()
            .flatMap((part) => part.getMeasures().at(measureIndex)?.getBarlines() ?? [])
            .filter((barline) => barline.getLocation() === location)
            .map((barline) => barline.getBarStyle())
            .at(0)
        );

      barlineStyles[measureIndex] = barlineStyle;
    }

    return barlineStyles;
  }

  parse(scoreCtx: ScoreContext): data.System {
    const systemCtx = new SystemContext(scoreCtx);

    const parsedMeasures = new Array<data.Measure>();

    for (const measure of this.measures) {
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
}
