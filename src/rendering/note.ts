import * as vexflow from 'vexflow';
import { Logger } from '@/debug';
import { Config } from './config';
import { VoiceEntryKey } from './types';
import { Document } from './document';
import { Rect } from '@/spatial';
import { VoiceLayout } from './voicelayout';

export class Note {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private key: VoiceEntryKey,
    private layout: VoiceLayout
  ) {}

  rect(): Rect {
    return this.layout.rect(this.key);
  }

  private getVexflowStaveNote(): vexflow.StaveNote {
    const note = this.document.getNote(this.key);
    return new vexflow.StaveNote({
      keys: [note.pitch],
      duration: 'q',
    });
  }
}
