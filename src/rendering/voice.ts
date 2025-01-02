import * as vexflow from 'vexflow';
import { Logger } from '@/debug';
import { Config } from './config';
import { Document } from './document';
import { VoiceKey } from './types';
import { Ensemble } from './ensemble';

export type VoiceRender = {
  type: 'voice';
  key: VoiceKey;
  vexflowVoice: vexflow.Voice;
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
    const vexflowVoice = this.ensemble.getVoice(this.key).vexflowVoice;

    return {
      type: 'voice',
      key: this.key,
      vexflowVoice,
    };
  }
}
