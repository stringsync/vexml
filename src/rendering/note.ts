import * as vexflow from 'vexflow';
import { Logger } from '@/debug';
import { Config } from './config';
import { VoiceEntryKey } from './types';
import { Document } from './document';
import { Ensemble } from './ensemble';

export type NoteRender = {
  type: 'note';
  vexflowTickable: vexflow.StaveNote;
};

export class Note {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private key: VoiceEntryKey,
    private ensemble: Ensemble
  ) {}

  render(): NoteRender {
    const vexflowStaveNote = this.ensemble.getEntry(this.key).vexflowTickable;

    return {
      type: 'note',
      vexflowTickable: vexflowStaveNote,
    };
  }
}
