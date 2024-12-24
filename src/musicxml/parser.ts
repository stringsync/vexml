import * as data from '@/data';
import * as util from '@/util';
import { MusicXML } from './musicxml';
import { ScorePartwise } from './scorepartwise';
import { Part } from './part';
import { Measure } from './measure';

/** Parses a MusicXML document string. */
export class Parser {
  parse(musicXML: string): data.Document {
    const xml = new DOMParser().parseFromString(musicXML, 'application/xml');
    const scorePartwise = new MusicXML(xml).getScorePartwise();
    const score = new ScoreExtractor({ scorePartwise }).extract();
    return new data.Document(score);
  }
}

class ScoreExtractor {
  constructor(private musicXML: { scorePartwise: ScorePartwise }) {}

  extract(): data.Score {
    return {
      title: this.getTitle(),
      measures: this.getMeasures(),
    };
  }

  private getTitle(): string {
    return this.musicXML.scorePartwise.getTitle();
  }

  private getMeasures(): data.Measure[] {
    const result = new Array<data.Measure>();

    const measureCount = this.getMeasureCount();
    const measureLabels = this.getMeasureLabels(measureCount);

    for (const part of this.musicXML.scorePartwise.getParts()) {
      const measures = part.getMeasures();

      for (let measureIndex = 0; measureIndex < measureCount; measureIndex++) {
        const measure = measures[measureIndex];
        const measureLabel = measureLabels[measureIndex];
        const measureExtractor = new MeasureExtractor(measureLabel, measureIndex, { part, measure });
        result.push(measureExtractor.extract());
      }
    }

    return result;
  }

  private getMeasureLabels(measureCount: number): string[] {
    const result = new Array<string>(measureCount).fill('');

    const part = util.first(this.musicXML.scorePartwise.getParts());
    if (!part) {
      return result;
    }

    const measures = part.getMeasures();

    for (let measureIndex = 0; measureIndex < measureCount; measureIndex++) {
      const measure = measures[measureIndex];
      if (measure.isImplicit()) {
        continue;
      }

      const number = parseInt(measure.getNumber(), 10);
      if (Number.isInteger(number) && !Number.isNaN(number)) {
        result[measureIndex] = number.toString();
      } else {
        result[measureIndex] = (measureIndex + 1).toString();
      }
    }

    return result;
  }

  private getMeasureCount(): number {
    return util.max(this.musicXML.scorePartwise.getParts().map((part) => part.getMeasures().length));
  }
}

class MeasureExtractor {
  constructor(private label: string, private index: number, private musicXML: { part: Part; measure: Measure }) {}

  extract(): data.Measure {
    return {
      index: this.index,
      label: this.label,
      entries: this.getEntries(),
    };
  }

  private getEntries(): data.Fragment[] {
    return [];
  }
}
