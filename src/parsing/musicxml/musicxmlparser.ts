import * as data from '@/data';
import * as musicxml from '@/musicxml';
import * as util from '@/util';
import { MeasureEvent, MeasureEntryProcessor } from './measureentryprocessor';
import { FragmentSignature } from './fragmentsignature';
import { PartSignature } from './types';

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
    const systems = this.getSystems(scorePartwise);
    return { title, systems };
  }

  private getSystems(scorePartwise: musicxml.ScorePartwise): data.System[] {
    // When parsing, we'll assume that there is only one system. Pre-rendering determines the minimum needed widths for
    // each element. We can then use this information to determine the number of systems needed to fit a constrained
    // width if needed.
    return [{ measures: this.getMeasures(scorePartwise) }];
  }

  private getMeasures(scorePartwise: musicxml.ScorePartwise): data.Measure[] {
    const result = new Array<data.Measure>();

    const partSignatures = this.getPartSignatures(scorePartwise);

    const measureCount = this.getMeasureCount(scorePartwise);
    const measureLabels = this.getMeasureLabels(scorePartwise, measureCount);
    const measureEvents = this.getMeasureEvents(scorePartwise);

    for (let measureIndex = 0; measureIndex < measureCount; measureIndex++) {
      const measureLabel = measureLabels[measureIndex];
      // All of the data.Measure.entries are fragments because data.Gaps cannot be encoded in MusicXML.
      const fragments = this.getFragments(
        partSignatures,
        measureEvents.filter((event) => event.measureIndex === measureIndex)
      );
      result.push({ index: measureIndex, label: measureLabel, entries: fragments });
    }

    return result;
  }

  private getFragments(partSignatures: PartSignature[], measureEvents: MeasureEvent[]): data.Fragment[] {
    // TODO: Determine fragment boundaries by seeing where the signature changes non-trivially.
    const parts = this.getParts(partSignatures, measureEvents);

    return [{ type: 'fragment', signature: null, parts }];
  }

  private getParts(partSignatures: PartSignature[], measureEvents: MeasureEvent[]): data.Part[] {
    return [];
  }

  private getMeasureEvents(scorePartwise: musicxml.ScorePartwise): MeasureEvent[] {
    const result = new Array<MeasureEvent>();

    for (const part of scorePartwise.getParts()) {
      const partId = part.getId();
      const measures = part.getMeasures();
      const staveSignature = FragmentSignature.default();
      const measureEventTracker = new MeasureEntryProcessor(partId, staveSignature);

      for (let measureIndex = 0; measureIndex < measures.length; measureIndex++) {
        const measure = measures[measureIndex];

        for (const entry of measure.getEntries()) {
          measureEventTracker.process(entry, measureIndex);
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

  private getPartSignatures(scorePartwise: musicxml.ScorePartwise): PartSignature[] {
    return scorePartwise.getParts().map<PartSignature>((part) => {
      const staveCount =
        part
          .getMeasures()
          .flatMap((measure) => measure.getAttributes())
          .map((attributes) => attributes.getStaveCount())
          .at(0) ?? 1;

      return { partId: part.getId(), staveCount };
    });
  }
}
