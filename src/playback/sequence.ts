import { Duration } from './duration';
import { SequenceEntry } from './types';

export class Sequence {
  constructor(private partIndex: number, private entries: SequenceEntry[]) {}

  getPartIndex(): number {
    return this.partIndex;
  }

  getEntry(index: number): SequenceEntry | null {
    return this.entries.at(index) ?? null;
  }

  getEntries(): SequenceEntry[] {
    return this.entries;
  }

  getCount(): number {
    return this.entries.length;
  }

  getDuration(): Duration {
    return this.entries.at(-1)?.durationRange.end ?? Duration.zero();
  }
}
