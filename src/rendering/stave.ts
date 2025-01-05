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
  voiceRenders: VoiceRender[];
  vexflowStave: vexflow.Stave;
  vexflowMultiMeasureRest: vexflow.MultiMeasureRest | null;
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

    // Sometimes ensemble may decide not to render a voice (e.g. multi measure rests). Therefore, we expect the number
    // of voices to differ from the document.
    const ensembleVoiceCount = ensembleStave.voices.length;
    const voiceRenders = this.renderVoices(ensembleVoiceCount);

    const vexflowStave = ensembleStave.vexflowStave;
    const vexflowMultiMeasureRest = ensembleStave.vexflowMultiMeasureRest;
    const rect = ensembleStave.rect;
    const intrisicRect = ensembleStave.intrinsicRect;

    return {
      type: 'stave',
      key: this.key,
      rect,
      intrisicRect,
      voiceRenders,
      vexflowStave,
      vexflowMultiMeasureRest,
    };
  }

  private renderVoices(voiceCount: number): VoiceRender[] {
    const voiceRenders = new Array<VoiceRender>();

    for (let voiceIndex = 0; voiceIndex < voiceCount; voiceIndex++) {
      const key = { ...this.key, voiceIndex };
      const voiceRender = new Voice(this.config, this.log, this.document, key, this.ensemble).render();
      voiceRenders.push(voiceRender);
    }

    return voiceRenders;
  }
}
