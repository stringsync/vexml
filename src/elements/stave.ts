import * as rendering from '@/rendering';
import { Config } from '@/config';
import { Logger } from '@/debug';
import { Voice } from './voice';
import { Rect } from '@/spatial';
import { Fraction } from '@/util';

export class Stave {
  private constructor(
    private config: Config,
    private log: Logger,
    private document: rendering.Document,
    private staveRender: rendering.StaveRender,
    private voices: Voice[]
  ) {}

  static create(config: Config, log: Logger, document: rendering.Document, staveRender: rendering.StaveRender): Stave {
    const voices = staveRender.voiceRenders.map((voiceRender) => Voice.create(config, log, document, voiceRender));
    return new Stave(config, log, document, staveRender, voices);
  }

  /** The name of the element, which can be used as a type discriminant. */
  public readonly name = 'stave';

  /** Returns the bounding box of the element. */
  rect(): Rect {
    return this.staveRender.rect;
  }

  /** Returns the intrinsic rect of the stave. */
  intrinsicRect(): Rect {
    return this.staveRender.intrinsicRect;
  }

  /** Returns the playable rect of the stave. */
  playableRect(): Rect {
    return this.staveRender.playableRect;
  }

  /** Returns the voices of the stave. */
  getVoices(): Voice[] {
    return this.voices;
  }

  /** Returns the start measure beat for the stave. */
  getStartMeasureBeat(): Fraction {
    return (
      this.voices
        .map((voice) => voice.getStartMeasureBeat())
        .sort((a, b) => a.toDecimal() - b.toDecimal())
        .at(0) ?? Fraction.zero()
    );
  }
}
