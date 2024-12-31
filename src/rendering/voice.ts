import { Logger } from '@/debug';
import { Config } from './config';
import { Note } from './note';
import { Renderable } from './renderable';
import { Document } from './document';
import { VoiceEntryKey, VoiceKey } from './types';
import { VoiceLayout } from './voicelayout';

export class Voice extends Renderable {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private key: VoiceKey,
    private layout: VoiceLayout
  ) {
    super();
  }

  children(): Renderable[] {
    const children = new Array<Renderable>();

    for (const note of this.getNotes()) {
      children.push(note);
    }

    return children;
  }

  private getNotes(): Note[] {
    return this.document.getVoice(this.key).entries.map((entry, voiceEntryIndex) => {
      const voiceEntryKey: VoiceEntryKey = { ...this.key, voiceEntryIndex };
      switch (entry.type) {
        case 'note':
          return new Note(this.config, this.log, this.document, voiceEntryKey, this.layout);
      }
    });
  }
}
