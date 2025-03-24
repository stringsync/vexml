import { Duration } from './duration';
import { LegacySequenceEntry } from './types';

export class LegacySequence {
  constructor(private partIndex: number, private entries: LegacySequenceEntry[]) {}

  getPartIndex(): number {
    return this.partIndex;
  }

  getEntry(index: number): LegacySequenceEntry | null {
    return this.entries.at(index) ?? null;
  }

  getEntries(): LegacySequenceEntry[] {
    return this.entries;
  }

  getCount(): number {
    return this.entries.length;
  }

  getDuration(): Duration {
    return this.entries.at(-1)?.durationRange.end ?? Duration.zero();
  }
}
