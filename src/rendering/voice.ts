import * as vexflow from 'vexflow';
import * as elements from '@/elements';
import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';
import { VoiceKey } from './types';
import { Note } from './note';

export class Voice {
  constructor(private config: Config, private log: Logger, private document: Document, private key: VoiceKey) {}

  getVoiceEntries(): Array<Note> {
    return this.document.getVoiceEntries(this.key).map((voiceEntry, voiceEntryIndex) => {
      const key = { ...this.key, voiceEntryIndex };
      switch (voiceEntry.type) {
        case 'note':
          return new Note(this.config, this.log, this.document, key);
      }
    });
  }

  render(): elements.Voice {
    const vexflowVoice = new vexflow.Voice().setMode(vexflow.VoiceMode.SOFT);

    const voiceEntryElements = this.getVoiceEntries().map((voiceEntry) => voiceEntry.render());
    const vexflowTickables = voiceEntryElements.map((voiceEntryElement) => voiceEntryElement.getVexflowTickable());
    vexflowVoice.addTickables(vexflowTickables);

    return new elements.Voice(voiceEntryElements, { voice: vexflowVoice });
  }
}
