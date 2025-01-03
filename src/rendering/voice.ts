import * as vexflow from 'vexflow';
import { Logger } from '@/debug';
import { Config } from './config';
import { Document } from './document';
import { VoiceEntryKey, VoiceKey } from './types';
import { Ensemble } from './ensemble';
import { Rect } from '@/spatial';
import { Note, NoteRender } from './note';

export type VoiceEntryRender = NoteRender;

export type VoiceRender = {
  type: 'voice';
  key: VoiceKey;
  rect: Rect;
  vexflowVoice: vexflow.Voice;
  entryRenders: VoiceEntryRender[];
};

export class Voice {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private key: VoiceKey,
    private ensemble: Ensemble
  ) {}

  render(): VoiceRender {
    const ensembleVoice = this.ensemble.getVoice(this.key);

    const vexflowVoice = ensembleVoice.vexflowVoice;
    const rect = ensembleVoice.rect;

    const entryRenders = this.renderEntries();

    return {
      type: 'voice',
      key: this.key,
      rect,
      vexflowVoice,
      entryRenders,
    };
  }

  private renderEntries(): VoiceEntryRender[] {
    const entryRenders = new Array<VoiceEntryRender>();

    const voiceEntryCount = this.document.getVoiceEntryCount(this.key);
    for (let voiceEntryIndex = 0; voiceEntryIndex < voiceEntryCount; voiceEntryIndex++) {
      const key: VoiceEntryKey = { ...this.key, voiceEntryIndex };

      const voiceEntry = this.document.getVoiceEntry(key);

      if (voiceEntry.type === 'note') {
        const noteRender = new Note(this.config, this.log, this.document, key, this.ensemble).render();
        entryRenders.push(noteRender);
      }
    }

    return entryRenders;
  }
}
