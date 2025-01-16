import * as rendering from '@/rendering';
import { Config } from '@/config';
import { Rect } from '@/spatial';
import { Logger } from '@/debug';
import { VoiceEntry } from './types';
import { Note } from './note';
import { Rest } from './rest';
import { Fraction } from '@/util';

export class Voice {
  private constructor(
    private config: Config,
    private log: Logger,
    private document: rendering.Document,
    private voiceRender: rendering.VoiceRender,
    private entries: VoiceEntry[]
  ) {}

  static create(config: Config, log: Logger, document: rendering.Document, voiceRender: rendering.VoiceRender): Voice {
    const entries = voiceRender.entryRenders
      .map((entryRender) => {
        switch (entryRender.type) {
          case 'note':
            return Note.create(config, log, document, entryRender);
          case 'rest':
            return Rest.create(config, log, document, entryRender);
          default:
            return null;
        }
      })
      .filter((entry) => entry !== null);
    return new Voice(config, log, document, voiceRender, entries);
  }

  /** The name of the element, which can be used as a type discriminant. */
  public readonly name = 'voice';

  /** Returns the bounding box of the element. */
  rect(): Rect {
    return this.voiceRender.rect;
  }

  /** Returns the entries of the voice. */
  getEntries(): VoiceEntry[] {
    return this.entries;
  }

  /** Returns the start measure beat for the voice. */
  getStartMeasureBeat(): Fraction {
    return this.voiceRender.startMeasureBeat;
  }
}
