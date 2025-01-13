import * as rendering from '@/rendering';
import { Logger } from '@/debug';
import { Rect, VoiceEntry } from './types';
import { Note } from './note';
import { Rest } from './rest';

export class Voice {
  private constructor(
    private config: rendering.Config,
    private log: Logger,
    private document: rendering.Document,
    private voiceRender: rendering.VoiceRender,
    private entries: VoiceEntry[]
  ) {}

  static create(
    config: rendering.Config,
    log: Logger,
    document: rendering.Document,
    voiceRender: rendering.VoiceRender
  ): Voice {
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
  get rect(): Rect {
    return this.voiceRender.rect;
  }

  /** Returns the entries of the voice. */
  getEntries(): VoiceEntry[] {
    return this.entries;
  }
}
