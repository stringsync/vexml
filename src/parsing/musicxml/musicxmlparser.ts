import * as data from '@/data';
import * as musicxml from '@/musicxml';
import * as util from '@/util';
import { MeasureEvent, MeasureEntryProcessor } from './measureentryprocessor';
import { StaveSignature } from './stavesignature';

/** Parses a MusicXML document string. */
export class MusicXMLParser {
  parse(musicXML: string): data.Document {
    const xml = new DOMParser().parseFromString(musicXML, 'application/xml');
    const scorePartwise = new musicxml.MusicXML(xml).getScorePartwise();
    const score = this.getScore(scorePartwise);
    return new data.Document(score);
  }

  private getScore(scorePartwise: musicxml.ScorePartwise): data.Score {
    const title = scorePartwise.getTitle();
    const staveSignature = StaveSignature.default();

    const measures = this.getMeasures(scorePartwise, staveSignature);

    // When parsing, we'll assume that there is only one system. Pre-rendering determines the minimum needed widths for
    // each element. We can then use this information to determine the number of systems needed to fit a constrained
    // width if needed.
    const systems = [{ measures }];

    return { title, systems };
  }

  private getMeasures(scorePartwise: musicxml.ScorePartwise, staveSignature: StaveSignature): data.Measure[] {
    const measureCount = this.getMeasureCount(scorePartwise);
    const measureLabels = this.getMeasureLabels(scorePartwise, measureCount);
    const measureEvents = this.getMeasureEvents(scorePartwise, staveSignature);

    return [];
  }

  private getMeasureEvents(
    scorePartwise: musicxml.ScorePartwise,
    initialStaveSignature: StaveSignature
  ): MeasureEvent[] {
    const result = new Array<MeasureEvent>();

    for (const part of scorePartwise.getParts()) {
      const partId = part.getId();
      const measures = part.getMeasures();

      const measureEventTracker = new MeasureEntryProcessor(partId, initialStaveSignature);

      for (let measureIndex = 0; measureIndex < measures.length; measureIndex++) {
        const measure = measures[measureIndex];

        for (const entry of measure.getEntries()) {
          measureEventTracker.process(entry);
        }
      }

      result.push(...measureEventTracker.getEvents());
    }

    return result;
  }

  private getMeasureCount(scorePartwise: musicxml.ScorePartwise): number {
    return util.max(scorePartwise.getParts().map((part) => part.getMeasures().length));
  }

  private getMeasureLabels(scorePartwise: musicxml.ScorePartwise, measureCount: number): string[] {
    const result = new Array<string>(measureCount).fill('');

    const part = util.first(scorePartwise.getParts());
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
}
