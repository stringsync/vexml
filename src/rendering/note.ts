import * as vexflow from 'vexflow';
import * as elements from '@/elements';
import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';
import { VoiceEntryKey } from './types';

export class Note {
  constructor(private config: Config, private log: Logger, private document: Document, private key: VoiceEntryKey) {}

  render(): elements.Note {
    const staveNote = new vexflow.StaveNote({
      keys: ['c/4'],
      duration: 'q',
      clef: 'treble',
    });

    return new elements.Note({ staveNote });
  }
}
