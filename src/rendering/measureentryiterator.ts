import * as musicxml from '@/musicxml';
import { Division } from './division';
import { MeasureEntry, StaveSignature } from './stavesignature';

/** A single iteration of measure entries. */
export type MeasureEntryIteration = {
  type: 'fallthrough' | 'boundary';
  entry: MeasureEntry;
  divisions: Division;
  staveSignature: StaveSignature;
};

/** Iterates over an array of measure entries, accounting for the active stave signature and divisions. */
export class MeasureEntryIterator {
  private entries: MeasureEntry[];
  private index: number;
  private staveSignature: StaveSignature;
  private divisions: Division;

  constructor(opts: { entries: MeasureEntry[]; staveSignature: StaveSignature }) {
    this.entries = opts.entries;
    this.index = 0;
    this.staveSignature = opts.staveSignature;
    this.divisions = Division.zero();
  }

  /** Returns the current entry. */
  get current(): MeasureEntryIteration {
    const entry = this.entries[this.index];

    return {
      type: this.getType(entry),
      entry,
      divisions: this.divisions,
      staveSignature: this.staveSignature,
    };
  }

  /** Moves the cursor to the next entry or throws if there isn't one. */
  next(): void {
    if (!this.hasNext()) {
      throw new Error('No next entry');
    }

    this.index++;
    const entry = this.entries[this.index];

    if (entry instanceof StaveSignature) {
      this.staveSignature = entry;
    }

    let duration = 0;

    if (entry instanceof musicxml.Note) {
      duration = entry.getDuration();
    }

    if (entry instanceof musicxml.Backup) {
      duration = -entry.getDuration();
    }

    if (entry instanceof musicxml.Forward) {
      duration = entry.getDuration();
    }

    this.addDuration(duration);
  }

  /** Whether there is another entry. */
  hasNext(): boolean {
    return this.index < this.entries.length;
  }

  private addDuration(duration: number): void {
    const quarterNoteDivisions = this.staveSignature.getQuarterNoteDivisions();

    this.divisions = this.divisions.add(Division.of(duration, quarterNoteDivisions));

    if (this.divisions.isLessThan(Division.zero())) {
      this.divisions = Division.zero();
    }
  }

  private getType(entry: MeasureEntry): 'fallthrough' | 'boundary' {
    return entry instanceof StaveSignature || this.isSupportedMetronome(entry) ? 'boundary' : 'fallthrough';
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
}
