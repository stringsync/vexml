import * as vexflow from 'vexflow';
import * as elements from '@/elements';
import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';
import { PartKey } from './types';
import { Stave } from './stave';

export class Part {
  constructor(private config: Config, private log: Logger, private document: Document, private key: PartKey) {}

  getStaves(): Stave[] {
    return this.document
      .getStaves(this.key)
      .map((_, staveIndex) => new Stave(this.config, this.log, this.document, { ...this.key, staveIndex }));
  }

  render(x: number, y: number): elements.Part {
    const staveElements = this.getStaves().map((stave) => stave.render(x, y));

    const vexflowVoices = staveElements
      .flatMap((staveElement) => staveElement.getVoices())
      .flatMap((voiceElement) => voiceElement.getVexflowVoice());

    new vexflow.Formatter().joinVoices(vexflowVoices).format(vexflowVoices, this.getWidth());

    return new elements.Part(staveElements);
  }

  private getWidth(): number {
    return this.document.getFragment(this.key).width ?? this.getIntrinsicWidth();
  }

  private getIntrinsicWidth(): number {
    return 100;
  }
}
