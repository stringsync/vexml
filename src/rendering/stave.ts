import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';
import { StaveKey } from './types';
import { Voice } from './voice';

export class Stave {
  constructor(private config: Config, private log: Logger, private document: Document, private key: StaveKey) {}

  getVoices(): Voice[] {
    return this.document
      .getVoices(this.key)
      .map((_, voiceIndex) => new Voice(this.config, this.log, this.document, { ...this.key, voiceIndex }));
  }
}
