import * as vexflow from 'vexflow';
import { Rect } from '@/spatial';
import { StaveKey } from './types';
import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';
import { Ensemble } from './ensemble';
import { Voice, VoiceRender } from './voice';

export type StaveRender = {
  type: 'stave';
  key: StaveKey;
  rect: Rect;
  intrisicRect: Rect;
  vexflowStave: vexflow.Stave;
  voiceRenders: VoiceRender[];
};

export class Stave {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private key: StaveKey,
    private ensemble: Ensemble
  ) {}

  render(): StaveRender {
    const ensembleStave = this.ensemble.getStave(this.key);

    const voiceRenders = this.renderVoices();

    const vexflowStave = ensembleStave.vexflowStave;
    const rect = ensembleStave.rect;
    const intrisicRect = ensembleStave.intrinsicRect;

    return {
      type: 'stave',
      key: this.key,
      rect,
      intrisicRect,
      vexflowStave,
      voiceRenders,
    };
  }

  private renderVoices(): VoiceRender[] {
    const voiceRenders = new Array<VoiceRender>();
    const voiceCount = this.document.getVoiceCount(this.key);

    for (let voiceIndex = 0; voiceIndex < voiceCount; voiceIndex++) {
      const key = { ...this.key, voiceIndex };
      const voiceRender = new Voice(this.config, this.log, this.document, key, this.ensemble).render();
      voiceRenders.push(voiceRender);
    }

    return voiceRenders;
  }
}
