import * as data from '@/data';
import * as mdom from '@stringsync/mdom';
import * as util from '@/util';
import * as conversions from '@/parsing/musicxml/conversions';
import { Measure } from '@/parsing/musicxml/measure';
import { Signature } from '@/parsing/musicxml/signature';
import { ScoreContext, SystemContext } from '@/parsing/musicxml/contexts';
import { JumpGroup } from '@/parsing/musicxml/jumpgroup';
import { MdomEventCalculator } from './eventcalculator';
import { Config } from '@/config';
import { Logger } from '@/debug';

type BarlineLocation = 'left' | 'right';

export class MdomSystem {
  private constructor(private config: Config, private log: Logger, private measures: Measure[]) {}

  static create(config: Config, log: Logger, score: mdom.Score): MdomSystem {
    const partIds = score.parts.map((part) => part.getAttribute('id') ?? '');

    const measureCount = util.max(score.parts.map((part) => part.measures.length));
    const measureLabels = MdomSystem.getMeasureLabels(measureCount, score);
    const measureEvents = new MdomEventCalculator(config, log, score).calculate();

    const jumpGroups = MdomSystem.getJumpGroups(config, log, measureCount, score);

    const startBarlineStyles = MdomSystem.getBarlineStyles(measureCount, 'left', score, jumpGroups);
    const endBarlineStyles = MdomSystem.getBarlineStyles(measureCount, 'right', score, jumpGroups);

    const measures = new Array<Measure>(measureCount);

    let signature = Signature.default(config, log);

    for (let measureIndex = 0; measureIndex < measureCount; measureIndex++) {
      const measure = Measure.create(
        config,
        log,
        signature,
        measureIndex,
        measureLabels[measureIndex],
        measureEvents.filter((event) => event.measureIndex === measureIndex),
        partIds,
        jumpGroups[measureIndex],
        startBarlineStyles[measureIndex],
        endBarlineStyles[measureIndex]
      );
      measures[measureIndex] = measure;
      signature = measure.getLastSignature();
    }

    return new MdomSystem(config, log, measures);
  }

  private static getMeasureLabels(measureCount: number, score: mdom.Score): Array<number | null> {
    const measureLabels = new Array<number | null>(measureCount).fill(null);

    const part = util.first(score.parts);
    if (!part) {
      return measureLabels;
    }

    const measures = part.measures;

    for (let measureIndex = 0; measureIndex < measureCount; measureIndex++) {
      const measure = measures[measureIndex];
      if (measure.getAttribute('implicit') === 'yes') {
        measureLabels[measureIndex] = null;
      }

      const number = parseInt(measure.number, 10);
      if (Number.isInteger(number) && !Number.isNaN(number)) {
        measureLabels[measureIndex] = number;
      } else {
        measureLabels[measureIndex] = measureIndex + 1;
      }
    }

    return measureLabels;
  }

  private static getJumpGroups(config: Config, log: Logger, measureCount: number, score: mdom.Score): Array<JumpGroup> {
    const jumpGroups = new Array<JumpGroup>();
    for (let measureIndex = 0; measureIndex < measureCount; measureIndex++) {
      jumpGroups.push(MdomSystem.getJumpGroup(config, log, measureIndex, score));
    }
    return jumpGroups;
  }

  private static getJumpGroup(config: Config, log: Logger, measureIndex: number, score: mdom.Score): JumpGroup {
    const barlines = score.parts
      .map((part) => part.measures[measureIndex])
      .filter((measure): measure is mdom.Measure => !!measure)
      .flatMap((measure) => measure.barlines);

    const jumps = new Array<data.Jump>();

    const leftBarlines = barlines.filter((barline) => barline.repeat === 'forward' || barline.location === 'left');
    const rightBarlines = barlines.filter((barline) => barline.repeat === 'backward' || barline.location === 'right');

    if (leftBarlines.some((barline) => barline.repeat !== null)) {
      jumps.push({ type: 'repeatstart' });
    }

    const leftEnding = leftBarlines.find((barline) => barline.child('ending') !== null);
    const rightEnding = rightBarlines.find((barline) => barline.child('ending') !== null);
    const repeatEnd = rightBarlines.find((barline) => barline.repeat !== null);
    if (leftEnding || rightEnding) {
      const hasStart = leftEnding?.child('ending')?.getAttribute('type') === 'start';
      const hasStop = rightEnding?.child('ending')?.getAttribute('type') === 'stop';

      let endingBracketType: data.EndingBracketType = 'mid';
      if (hasStart && hasStop) {
        endingBracketType = 'both';
      } else if (hasStart) {
        endingBracketType = 'begin';
      } else if (hasStop) {
        endingBracketType = 'end';
      }

      const label =
        leftEnding?.child('ending')?.text ||
        rightEnding?.child('ending')?.text ||
        leftEnding?.child('ending')?.getAttribute('number') ||
        rightEnding?.child('ending')?.getAttribute('number') ||
        '';

      let times = 0;
      if (repeatEnd) {
        times = MdomSystem.getRepeatTimes(repeatEnd) ?? 1;
      }

      jumps.push({ type: 'repeatending', times, label, endingBracketType });
    } else if (repeatEnd) {
      jumps.push({ type: 'repeatend', times: MdomSystem.getRepeatTimes(repeatEnd) ?? 1 });
    }

    return new JumpGroup(config, log, jumps);
  }

  private static getRepeatTimes(barline: mdom.Barline): number | null {
    const raw = barline.child('repeat')?.getAttribute('times');
    return typeof raw === 'string' ? parseInt(raw, 10) : null;
  }

  private static getBarlineStyles(
    measureCount: number,
    location: BarlineLocation,
    score: mdom.Score,
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
          score.parts
            .flatMap((part) => part.measures[measureIndex]?.barlines ?? [])
            .filter((barline) => barline.location === location)
            // A <barline> with no <bar-style> defaults to 'regular' (matching the legacy wrapper).
            .map((barline) => barline.barStyle ?? 'regular')
            .at(0) as Parameters<typeof conversions.fromMusicXMLBarStyleToBarlineStyle>[0]
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
