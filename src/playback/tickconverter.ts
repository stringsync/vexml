import { Duration } from './duration';

// Hardcoded from https://github.com/vexflow/vexflow/blob/a9d8a1cebf390c157f4c8fe99f2cab16e7bfcac0/src/tables.ts#L19
const TICKS_PER_QUARTER_NOTE = 4096;

export class TickConverter {
  public readonly bpm: number;

  constructor(bpm: number) {
    this.bpm = bpm;
  }

  toDuration(ticks: number): Duration {
    return Duration.ms(ticks * this.getMsPerTick());
  }

  toTicks(duration: Duration): number {
    return duration.ms / this.getMsPerTick();
  }

  private getMsPerQuarterNote() {
    const minutesPerQuarterNote = 1 / this.bpm;
    return Duration.minutes(minutesPerQuarterNote).ms;
  }

  private getMsPerTick() {
    return this.getMsPerQuarterNote() / TICKS_PER_QUARTER_NOTE;
  }
}
