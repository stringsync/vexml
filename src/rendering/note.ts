import * as vexflow from 'vexflow';
import * as elements from '@/elements';
import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';
import { VoiceEntryKey } from './types';

export class Note {
  constructor(private config: Config, private log: Logger, private document: Document, private key: VoiceEntryKey) {}

  render(ctx: vexflow.RenderContext): elements.Note {
    const staveNote = new vexflow.StaveNote({
      keys: ['c/4'],
      duration: 'q',
      clef: 'treble',
    }).setContext(ctx);

    return new elements.Note(ctx, { staveNote });
  }
}
