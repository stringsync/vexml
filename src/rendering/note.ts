import * as vexflow from 'vexflow';
import * as util from '@/util';
import { Logger } from '@/debug';
import { Config } from './config';
import { VoiceEntryKey } from './types';
import { Document } from './document';
import { Ensemble } from './ensemble';
import { Rect } from '@/spatial';

export type NoteRender = {
  type: 'note';
  key: VoiceEntryKey;
  rect: Rect;
  vexflowStaveNote: vexflow.StaveNote;
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
    const ensembleVoiceEntry = this.ensemble.getVoiceEntry(this.key);
    const vexflowStaveNote = ensembleVoiceEntry.vexflowTickable;
    util.assert(vexflowStaveNote instanceof vexflow.StaveNote, 'expected vexflowStaveNote to be a StaveNote');
    const rect = ensembleVoiceEntry.rect;

    return {
      type: 'note',
      key: this.key,
      rect,
      vexflowStaveNote,
    };
  }
}
