import { Config } from './config';
import * as musicxml from '@/musicxml';
import * as util from '@/util';
import { PartScoped } from './types';
import { Address } from './address';
import { MeasureFragment } from './measurefragment2';
import { MeasureEntry, StaveSignature } from './stavesignature';
import { Division } from './division';

/** The result of rendering a Measure. */
export type MeasureRendering = {
  type: 'measure';
};

type MeasureFragmentData = {
  divisions: Division;
  staveSignature: StaveSignature;
  entries: PartScoped<MeasureEntry>[];
  beginningBarStyle: musicxml.BarStyle;
  endBarStyle: musicxml.BarStyle;
};

/**
 * Represents a Measure in a musical score, corresponding to the <measure> element in MusicXML. A Measure contains a
 * specific segment of musical content, defined by its beginning and ending beats, and is the primary unit of time in a
 * score. Measures are sequenced consecutively within a system.
 */
export class Measure {
  private config: Config;
  private index: number;
  private partIds: string[];
  private musicXml: {
    measures: PartScoped<musicxml.Measure>[];
    staveLayouts: musicxml.StaveLayout[];
  };
  private leadingStaveSignatures: PartScoped<StaveSignature>[];
  private entries: PartScoped<MeasureEntry>[];

  constructor(opts: {
    config: Config;
    index: number;
    partIds: string[];
    musicXml: {
      measures: PartScoped<musicxml.Measure>[];
      staveLayouts: musicxml.StaveLayout[];
    };
    leadingStaveSignatures: PartScoped<StaveSignature>[];
    entries: PartScoped<MeasureEntry>[];
  }) {
    this.config = opts.config;
    this.partIds = opts.partIds;
    this.index = opts.index;
    this.musicXml = opts.musicXml;
    this.leadingStaveSignatures = opts.leadingStaveSignatures;
    this.entries = opts.entries;
  }

  /** Returns the absolute index of the measure. */
  getIndex(): number {
    return this.index;
  }

  /** Returns the minimum required width for the Measure. */
  getMinRequiredWidth(opts: { address: Address<'measure'>; previousMeasure: Measure | null }): number {
    return 0;
  }

  /** Renders the measure. */
  render(): MeasureRendering {
    return {
      type: 'measure',
    };
  }

  @util.memoize()
  private getFragments(): MeasureFragment[] {
    const result = new Array<MeasureFragment>();

    const data = new Array<PartScoped<MeasureFragmentData>>();

    for (const partId of this.partIds) {
      const entries = this.entries.filter((entry) => entry.partId === partId);

      const staveSignature = this.leadingStaveSignatures.find((staveSignature) => staveSignature.partId === partId);
      if (!staveSignature) {
        throw new Error(`Stave signature not found for part: ${partId}`);
      }

      data.push(...this.getFragmentData(partId, staveSignature.value, entries));
    }

    util.sortBy(data, (data) => data.value.divisions.toBeats());

    return result;
  }

  private getFragmentData(
    partId: string,
    staveSignature: StaveSignature,
    entries: PartScoped<MeasureEntry>[]
  ): PartScoped<MeasureFragmentData>[] {
    const result = new Array<MeasureFragmentData>();

    const beginningBarStyle = this.getBeginningBarStyle();
    const endBarStyle = this.getEndBarStyle();

    let current = new Array<PartScoped<MeasureEntry>>();
    let divisions = Division.zero();

    for (let index = 0; index < entries.length; index++) {
      const entry = entries[index];
      const isLast = index === entries.length - 1;

      if (entry instanceof StaveSignature) {
        if (entry.getChangedStaveModifiers().length > 0 && current.length > 0) {
          result.push({
            divisions,
            staveSignature,
            entries: current,
            beginningBarStyle: result.length === 0 ? beginningBarStyle : 'none',
            endBarStyle: 'none',
          });
          current = [];
        }

        staveSignature = entry;
      }

      if (this.isSupportedMetronome(entry.value) && current.length > 0) {
        result.push({
          divisions,
          staveSignature,
          entries: current,
          beginningBarStyle: result.length === 0 ? beginningBarStyle : 'none',
          endBarStyle: 'none',
        });
        current = [];
      }

      if (entry instanceof musicxml.Note) {
        divisions = divisions.add(Division.of(entry.getDuration(), staveSignature.getQuarterNoteDivisions()));
      }

      current.push(entry);

      if (isLast) {
        const nextStaveSignature = staveSignature.getNext();
        const hasClefChangeAtMeasureBoundary =
          nextStaveSignature?.getChangedStaveModifiers().includes('clef') &&
          nextStaveSignature?.getMeasureIndex() === this.index + 1 &&
          nextStaveSignature?.getMeasureEntryIndex() === 0;

        if (hasClefChangeAtMeasureBoundary) {
          result.push({
            divisions,
            staveSignature,
            entries: current,
            beginningBarStyle: result.length === 0 ? beginningBarStyle : 'none',
            endBarStyle: 'none',
          });
          result.push({
            divisions,
            staveSignature,
            entries: current,
            beginningBarStyle: 'none',
            endBarStyle: endBarStyle,
          });
        } else {
          result.push({
            divisions,
            staveSignature,
            entries: current,
            beginningBarStyle: result.length === 0 ? beginningBarStyle : 'none',
            endBarStyle: endBarStyle,
          });
        }
      }
    }

    return result.map((value) => ({ partId, value }));
  }

  private isSupportedMetronome(entry: MeasureEntry): boolean {
    return (
      entry instanceof musicxml.Direction &&
      entry
        .getTypes()
        .map((directionType) => directionType.getContent())
        .some((content) => content.type === 'metronome' && content.metronome.isSupported())
    );
  }

  private getBeginningBarStyle(): musicxml.BarStyle {
    return (
      util.first(
        this.musicXml.measures
          .flatMap((measure) => measure.value.getBarlines())
          .filter((barline) => barline.getLocation() === 'left')
          .map((barline) => barline.getBarStyle())
      ) ?? 'regular'
    );
  }

  private getEndBarStyle(): musicxml.BarStyle {
    return (
      util.first(
        this.musicXml.measures
          .flatMap((measure) => measure.value.getBarlines())
          .filter((barline) => barline.getLocation() === 'right')
          .map((barline) => barline.getBarStyle())
      ) ?? 'regular'
    );
  }
}
