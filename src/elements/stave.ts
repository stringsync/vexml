import * as rendering from '@/rendering';
import { Config } from '@/config';
import { Logger } from '@/debug';
import { Voice } from './voice';
import { Rect } from '@/spatial';

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

  /** Returns the voices of the stave. */
  getVoices(): Voice[] {
    return this.voices;
  }
}
