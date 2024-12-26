import * as data from '@/data';
import * as musicxml from '@/musicxml';
import * as util from '@/util';
import { FragmentPart, MeasureEvent, PartSignature } from './types';
import { MeasureEntryProcessor } from './measureentryprocessor';
import { FragmentPartFactory } from './fragmentpartfactory';

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

    const measureCount = this.getMeasureCount(scorePartwise);
    const measureLabels = this.getMeasureLabels(scorePartwise, measureCount);
    const measureEvents = this.getMeasureEvents(scorePartwise);

    const partSignatures = this.getPartSignatures(scorePartwise);
    const fragmentParts = this.getFragmentParts(measureCount, partSignatures, measureEvents);

    for (let measureIndex = 0; measureIndex < measureCount; measureIndex++) {
      const label = measureLabels[measureIndex];
      const entries = [
        ...this.getGaps(),
        ...this.getFragments(
          measureIndex,
          partSignatures,
          fragmentParts.filter((fragmentPart) => fragmentPart.measureIndex === measureIndex)
        ),
      ];
      result.push({ index: measureIndex, label, entries });
    }

    return result;
  }

  private getGaps(): data.Gap[] {
    // Gaps can't be encoded in MusicXML.
    return [];
  }

  private getFragments(
    measureIndex: number,
    partSignatures: PartSignature[],
    fragmentParts: FragmentPart[]
  ): data.Fragment[] {
    const result = new Array<data.Fragment>();

    // TODO: This might not be correct because the fragment signatures were made independently of each other based on
    // part.
    const fragmentSignature =
      fragmentParts
        .flatMap((fragmentPart) => fragmentPart.events)
        .map((event) => event.fragmentSignature)
        .at(0) ?? null;

    const fragmentIndexes = util.unique(fragmentParts.map((fragmentPart) => fragmentPart.fragmentIndex));
    for (const fragmentIndex of fragmentIndexes) {
      const parts = this.getParts(
        partSignatures,
        fragmentParts.filter((fragmentPart) => fragmentPart.fragmentIndex === fragmentIndex)
      );
      result.push({ type: 'fragment', parts, signature: fragmentSignature });
    }

    return result;
  }

  private getParts(partSignatures: PartSignature[], fragmentPart: FragmentPart[]): data.Part[] {
    const result = new Array<data.Part>();

    for (const partSignature of partSignatures) {
      const staves = this.getStaves(partSignature.partId);
      const events = fragmentPart
        .filter((fragmentPart) => fragmentPart.partId === partSignature.partId)
        .flatMap((fragmentPart) => fragmentPart.events);
    }

    return result;
  }

  private getStaves(partId: string): data.Stave[] {
    return [];
  }

  private getFragmentParts(
    measureCount: number,
    partSignatures: PartSignature[],
    measureEvent: MeasureEvent[]
  ): FragmentPart[] {
    return new FragmentPartFactory(measureCount, partSignatures, measureEvent).create();
  }

  private getMeasureEvents(scorePartwise: musicxml.ScorePartwise): MeasureEvent[] {
    const result = new Array<MeasureEvent>();

    for (const part of scorePartwise.getParts()) {
      const partId = part.getId();
      const measures = part.getMeasures();
      const measureEventTracker = new MeasureEntryProcessor(partId);

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
