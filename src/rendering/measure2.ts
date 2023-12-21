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

/** Describes when a measure fragment should be instantiated.  */
type MeasureFragmentEvent = {
  at: Division;
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
    let sum = 0;

    util.forEachTriple(this.getFragments(), ([previousFragment, currentFragment], { isFirst }) => {
      if (isFirst) {
        previousFragment = util.last(opts.previousMeasure?.getFragments() ?? []);
      }
      sum += currentFragment.getMinRequiredWidth({
        address: opts.address.measureFragment({ measureFragmentIndex: currentFragment.getIndex() }),
        previousMeasureFragment: previousFragment,
      });
    });

    return sum;
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

    const beginningBarStyle = this.getBeginningBarStyle();
    const endBarStyle = this.getEndBarStyle();
    const events = this.getFragmentEvents();
    const cursors = this.getEntryCursors();

    for (let index = 0; index < events.length; index++) {
      const event = events[index];
      const isFirst = index === 0;
      const isLast = index === events.length - 1;

      const beginningBarStyles = new Array<PartScoped<musicxml.BarStyle>>();
      const endBarStyles = new Array<PartScoped<musicxml.BarStyle>>();
      const measureEntries = new Array<PartScoped<MeasureEntry>>();
      const staveSignatures = new Array<PartScoped<StaveSignature>>();

      for (const partId of this.partIds) {
        let upperBound = event.at;
        if (isLast) {
          // We add 1 to the upper bound to ensure that the last fragment gets created.
          upperBound = upperBound.add(Division.of(1, 1));
        }

        const { entries, staveSignature } = cursors[partId].takeEntriesUpTo(upperBound);

        measureEntries.push(...entries.map((entry) => ({ partId, value: entry })));
        staveSignatures.push({ partId, value: staveSignature });

        // TODO: It may be possible to render barlines in the middle of a measure fragment. We might need to update
        // event to contain the barline data. If we don't need it, update MeasureFragment to take a single
        // part-agonistic beginningBarStyle and endBarStyle.
        beginningBarStyles.push({ partId, value: isFirst ? beginningBarStyle : 'none' });
        endBarStyles.push({ partId, value: isLast ? endBarStyle : 'none' });
      }

      result.push(
        new MeasureFragment({
          config: this.config,
          index: result.length,
          partIds: this.partIds,
          musicXml: {
            staveLayouts: this.musicXml.staveLayouts,
            beginningBarStyles,
            endBarStyles,
          },
          measureEntries,
          staveSignatures,
        })
      );
    }

    return result;
  }

  private getFragmentEvents(): MeasureFragmentEvent[] {
    const events = new Array<MeasureFragmentEvent>();

    for (const partId of this.partIds) {
      let divisions = Division.zero();

      const entries = this.entries.filter((entry) => entry.partId === partId);

      let staveSignature = this.leadingStaveSignatures.find(
        (staveSignature) => staveSignature.partId === partId
      )?.value;
      if (!staveSignature) {
        throw new Error(`Stave signature not found for part: ${partId}`);
      }

      for (let index = 0; index < entries.length; index++) {
        const entry = entries[index];
        const isLast = index === entries.length - 1;

        if (entry instanceof StaveSignature) {
          if (entry.getChangedStaveModifiers().length > 0 && index > 0) {
            events.push({ at: divisions });
          }
          staveSignature = entry;
        }

        if (this.isSupportedMetronome(entry.value) && index > 0) {
          events.push({ at: divisions });
        }

        const quarterNoteDivisions = staveSignature.getQuarterNoteDivisions();

        if (entry instanceof musicxml.Note) {
          const duration = Division.of(entry.getDuration(), quarterNoteDivisions);
          divisions = divisions.add(duration);
        }

        if (entry instanceof musicxml.Backup) {
          const duration = Division.of(entry.getDuration(), quarterNoteDivisions);
          divisions = divisions.subtract(duration);
        }

        if (entry instanceof musicxml.Forward) {
          const duration = Division.of(entry.getDuration(), quarterNoteDivisions);
          divisions = divisions.add(duration);
        }

        if (isLast) {
          events.push({ at: divisions });
        }
      }
    }

    const seen = new Set<number>();
    const unique = new Array<MeasureFragmentEvent>();
    for (const event of events) {
      if (!seen.has(event.at.toBeats())) {
        seen.add(event.at.toBeats());
        unique.push(event);
      }
    }

    return util.sortBy(unique, (event) => event.at.toBeats());
  }

  private getEntryCursors(): { [partId: string]: MeasureEntryCursor } {
    const result: Record<string, MeasureEntryCursor> = {};

    for (const partId of this.partIds) {
      const entries = this.entries.filter((entry) => entry.partId === partId).map((entry) => entry.value);

      const staveSignature = this.leadingStaveSignatures.find(
        (staveSignature) => staveSignature.partId === partId
      )?.value;
      if (!staveSignature) {
        throw new Error(`Stave signature not found for part: ${partId}`);
      }

      result[partId] = new MeasureEntryCursor(entries, staveSignature);
    }

    return result;
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

class MeasureEntryCursor {
  private entries: MeasureEntry[];
  private index: number;
  private divisions: Division;
  private staveSignature: StaveSignature;

  constructor(entries: MeasureEntry[], staveSignature: StaveSignature) {
    this.entries = entries;
    this.index = 0;
    this.divisions = Division.zero();
    this.staveSignature = staveSignature;
  }

  /** Returns all the entries up to a division, exclusive at boundary. */
  takeEntriesUpTo(division: Division): { staveSignature: StaveSignature; entries: MeasureEntry[] } {
    const entries = new Array<MeasureEntry>();

    // We use the *leading* stave signature in the result, because it is the one that dictates downstream behavior.
    // In practice, we should only ever have one stave signature per measure fragment, but we support multiple for
    // robustness.
    const staveSignature = this.staveSignature;

    while (this.divisions.isLessThanOrEqualTo(division) && this.index < this.entries.length) {
      const entry = this.entries[this.index];

      if (entry instanceof StaveSignature) {
        this.staveSignature = entry;
        // The stave signature will be accounted for via the staveSignature params.
        continue;
      }

      const quarterNoteDivisions = this.staveSignature.getQuarterNoteDivisions();

      if (entry instanceof musicxml.Note) {
        const duration = Division.of(entry.getDuration(), quarterNoteDivisions);
        this.divisions = this.divisions.add(duration);
      }

      if (entry instanceof musicxml.Backup) {
        const duration = Division.of(entry.getDuration(), quarterNoteDivisions);
        this.divisions = this.divisions.subtract(duration);
      }

      if (entry instanceof musicxml.Forward) {
        const duration = Division.of(entry.getDuration(), quarterNoteDivisions);
        this.divisions = this.divisions.add(duration);
      }

      entries.push(entry);
      this.index++;
    }

    return { staveSignature, entries };
  }
}
