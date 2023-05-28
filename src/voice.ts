import * as vexflow from 'vexflow';

/**
 * Data container for vexflow.Voice objects.
 */
export class Voice {
  private numBeats = 4;
  private beatValue = 4;
  private strict = false;
  private mode = vexflow.VoiceMode.SOFT;
  private tickables = new Array<vexflow.Tickable>();

  clone(): Voice {
    return new Voice()
      .setNumBeats(this.numBeats)
      .setBeatValue(this.beatValue)
      .setStrict(this.strict)
      .setMode(this.mode)
      .addTickables(this.tickables);
  }

  setNumBeats(numBeats: number): this {
    this.numBeats = numBeats;
    return this;
  }

  setBeatValue(beatValue: number): this {
    this.beatValue = beatValue;
    return this;
  }

  setStrict(strict: boolean): this {
    this.strict = strict;
    return this;
  }

  setMode(mode: vexflow.VoiceMode): this {
    this.mode = mode;
    return this;
  }

  addTickables(tickables: vexflow.Tickable[]): this {
    this.tickables = [...this.tickables, ...tickables];
    return this;
  }

  toVexflow(): vexflow.Voice {
    return new vexflow.Voice({ num_beats: this.numBeats, beat_value: this.beatValue })
      .setMode(this.mode)
      .setStrict(this.strict)
      .addTickables(this.tickables);
  }
}
