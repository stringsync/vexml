import * as musicxml from '@/musicxml';
import { Division } from './division';
import { MeasureEntry, StaveSignature } from './stavesignature';

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
  current(): { entry: MeasureEntry; divisions: Division; staveSignature: StaveSignature } {
    return {
      entry: this.entries[this.index],
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

    if (entry instanceof musicxml.Note) {
      this.addDuration(entry.getDuration());
    }

    if (entry instanceof musicxml.Backup) {
      this.addDuration(-entry.getDuration());
    }

    if (entry instanceof musicxml.Forward) {
      this.addDuration(entry.getDuration());
    }
  }

  /** Whether there is another entry or not. */
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
}
