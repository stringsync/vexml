import { Config } from './config';
import { Logger } from '@/debug';
import { Rect } from '@/spatial';
import { Document } from './document';
import { Ensemble } from './ensemble';
import { VoiceEntryKey } from './types';

export type RestRender = {
  type: 'rest';
  key: VoiceEntryKey;
  rect: Rect;
};

export class Rest {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private key: VoiceEntryKey,
    private ensemble: Ensemble
  ) {}

  render(): RestRender {
    const ensembleVoiceEntry = this.ensemble.getVoiceEntry(this.key);

    const rect = ensembleVoiceEntry.rect;

    return {
      type: 'rest',
      key: this.key,
      rect,
    };
  }
}
