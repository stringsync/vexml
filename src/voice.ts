import * as vexflow from 'vexflow';
import { TimeSignature } from './timesignature';

/**
 * Data container for vexflow.Voice objects.
 */
export class Voice {
  private timeSignature = new TimeSignature(4, 4);
  private tickables = new Array<vexflow.Tickable>();

  /**
   * Creates a deep clone of the voice.
   */
  clone(): Voice {
    return new Voice().setTimeSignature(this.timeSignature).addTickables(this.tickables);
  }

  /**
   * Returns the time signature of the voice.
   */
  getTimeSignature(): TimeSignature {
    return this.timeSignature;
  }

  /**
   * Sets the number of beats.
   */
  setTimeSignature(timeSignature: TimeSignature): this {
    this.timeSignature = timeSignature;
    return this;
  }

  /**
   * Returns the tickables of the voice.
   */
  getTickables(): vexflow.Tickable[] {
    return this.tickables;
  }

  /**
   * Adds the tickables to the voice.
   */
  addTickables(tickables: vexflow.Tickable[]): this {
    this.tickables = [...this.tickables, ...tickables];
    return this;
  }

  /**
   * Transforms the voice into a vexflow.Voice.
   */
  toVexflow(): vexflow.Voice {
    return new vexflow.Voice({
      num_beats: this.timeSignature.getBeatsPerMeasure(),
      beat_value: this.timeSignature.getBeatValue(),
    })
      .setMode(vexflow.VoiceMode.SOFT)
      .setStrict(false)
      .addTickables(this.tickables);
  }
}
