import * as vexflow from 'vexflow';
import { Duration } from './duration';

const TICKS_PER_QUARTER_NOTE = vexflow.VexFlow.durationToTicks('q');

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
