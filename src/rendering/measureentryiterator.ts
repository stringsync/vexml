import * as musicxml from '@/musicxml';
import { Division } from './division';
import { MeasureEntry, StaveSignature } from './stavesignature';

export type MeasureEntryIteration = {
  type: 'fallthrough' | 'boundary';
  entry: MeasureEntry;
  start: Division;
  end: Division;
};

/** Iterates over an array of measure entries, accounting for the active stave signature and divisions. */
export class MeasureEntryIterator {
  private entries: MeasureEntry[];
  private index: number;
  private staveSignature: StaveSignature;
  private start: Division;
  private end: Division;

  constructor(opts: { entries: MeasureEntry[]; staveSignature: StaveSignature }) {
    this.entries = opts.entries;
    this.index = 0;
    this.staveSignature = opts.staveSignature;
    this.start = Division.zero();
    this.end = Division.zero();
  }

  /** Returns the current stave signature of the iterator. */
  getStaveSignature(): StaveSignature {
    return this.staveSignature;
  }

  /** The current iteration. */
  current(): MeasureEntryIteration {
    if (this.isEmpty()) {
      throw new Error('iterator exhausted');
    }

    const entry = this.entries[this.index];
    const type = this.getType(entry);
    return { type, entry, start: this.start, end: this.end };
  }

  /** Whether there are any entries at all. */
  isEmpty(): boolean {
    return this.entries.length === 0;
  }

  /** Whether there is another iteration. */
  hasNext(): boolean {
    return this.index < this.entries.length;
  }

  /** Moves the cursor to the next iteration or throws if there isn't one. */
  next(): void {
    if (!this.hasNext()) {
      throw new Error('iterator exhausted');
    }

    const entry = this.entries[this.index++];

    let duration = 0;

    if (entry instanceof StaveSignature) {
      this.staveSignature = entry;
    }

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

  private addDuration(duration: number): void {
    const quarterNoteDivisions = this.staveSignature.getQuarterNoteDivisions();

    this.start = this.end;
    this.end = this.start.add(Division.of(duration, quarterNoteDivisions));
    if (this.end.isLessThan(Division.zero())) {
      this.end = Division.zero();
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
