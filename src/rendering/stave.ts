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

  render(ctx: vexflow.RenderContext, x: number, y: number): elements.Stave {
    const stave = new vexflow.Stave(x, y, this.getWidth());

    const voices = this.getVoices().map((voice) => voice.render(ctx));
    for (const voice of voices) {
      voice.getVexflowVoice().setStave(stave);
    }

    return new elements.Stave(ctx, voices, { stave });
  }

  private getWidth(): number {
    return this.document.getFragment(this.key).width ?? this.getIntrinsicWidth();
  }

  private getIntrinsicWidth(): number {
    const formatter = new vexflow.Formatter();
    const ctx = new NoopRenderContext();
    const voices = this.getVoices().map((voice) => voice.render(ctx).getVexflowVoice());
    formatter.joinVoices(voices);
    return formatter.preCalculateMinTotalWidth(voices);
  }
}
