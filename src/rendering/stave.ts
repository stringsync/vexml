import * as vexflow from 'vexflow';
import * as elements from '@/elements';
import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';
import { StaveKey } from './types';
import { Voice } from './voice';
import { NoopRenderContext } from './nooprendercontext';

export class Stave {
  constructor(private config: Config, private log: Logger, private document: Document, private key: StaveKey) {}

  getVoices(): Voice[] {
    return this.document
      .getVoices(this.key)
      .map((_, voiceIndex) => new Voice(this.config, this.log, this.document, { ...this.key, voiceIndex }));
  }

  render(x: number, y: number): elements.Stave {
    const w = this.getWidth();
    const vexflowStave = new vexflow.Stave(x, y, w);

    const voiceElements = this.getVoices().map((voice) => voice.render());
    for (const voiceElement of voiceElements) {
      const vexflowVoice = voiceElement.getVexflowVoice();
      vexflowVoice.setStave(vexflowStave);
      for (const vexflowTickable of vexflowVoice.getTickables()) {
        vexflowTickable.setStave(vexflowStave);
      }
    }

    return new elements.Stave(voiceElements, { stave: vexflowStave });
  }

  private getWidth(): number {
    return this.document.getFragment(this.key).width ?? this.getIntrinsicWidth();
  }

  private getIntrinsicWidth(): number {
    const vexflowVoices = this.getVoices().map((voice) => voice.render().getVexflowVoice());
    return new vexflow.Formatter().joinVoices(vexflowVoices).preCalculateMinTotalWidth(vexflowVoices);
  }
}
