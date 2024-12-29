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
}
