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

  getVexflowVoice(): vexflow.Voice {
    const voice = new vexflow.Voice({
      beatValue: 4,
      numBeats: 4,
    });

    voice.addTickables([
      new vexflow.StaveNote({
        duration: 'q',
        keys: ['c/4'],
        clef: 'treble',
      }),
      new vexflow.StaveNote({
        duration: 'q',
        keys: ['c/4'],
        clef: 'treble',
      }),
      new vexflow.StaveNote({
        duration: 'q',
        keys: ['c/4'],
        clef: 'treble',
      }),
      new vexflow.StaveNote({
        duration: 'q',
        keys: ['c/4'],
        clef: 'treble',
      }),
    ]);

    return voice;
  }

  render(ctx: vexflow.RenderContext): elements.Voice {
    const voiceEntries = this.getVoiceEntries().map((voiceEntry) => voiceEntry.render(ctx));

    return new elements.Voice(ctx, voiceEntries);
  }
}
