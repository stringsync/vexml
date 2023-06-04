import * as vexflow from 'vexflow';

/**
 * Data container for vexflow.Voice objects.
 */
export class Voice {
  private numBeats = 4;
  private beatValue = 4;
  private tickables = new Array<vexflow.Tickable>();

  /**
   * Creates a deep clone of the voice.
   */
  clone(): Voice {
    return new Voice().setNumBeats(this.numBeats).setBeatValue(this.beatValue).addTickables(this.tickables);
  }

  /**
   * Returns the number of beats.
   */
  getNumBeats(): number {
    return this.numBeats;
  }

  /**
   * Sets the number of beats.
   */
  setNumBeats(numBeats: number): this {
    this.numBeats = numBeats;
    return this;
  }

  /**
   * Returns the beat value.
   */
  getBeatValue(): number {
    return this.beatValue;
  }

  /**
   * Sets the beat value.
   */
  setBeatValue(beatValue: number): this {
    this.beatValue = beatValue;
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
    return new vexflow.Voice({ num_beats: this.numBeats, beat_value: this.beatValue })
      .setMode(vexflow.VoiceMode.SOFT)
      .setStrict(false)
      .addTickables(this.tickables);
  }
}
