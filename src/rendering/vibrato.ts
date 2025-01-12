import * as vexflow from 'vexflow';
import { Config } from './config';
import { Logger } from '@/debug';
import { Rect } from '@/spatial';
import { Document } from './document';
import { VibratoKey, VibratoRender } from './types';
import { NoteRenderRegistry } from './noterenderregistry';

export class Vibrato {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private key: VibratoKey,
    private registry: NoteRenderRegistry
  ) {}

  render(): VibratoRender {
    const vexflowVibratoBrackets = this.renderVexflowVibratoBrackets();

    return {
      type: 'vibrato',
      rect: Rect.empty(),
      vexflowVibratoBrackets,
    };
  }

  private renderVexflowVibratoBrackets(): vexflow.VibratoBracket[] {
    const vibrato = this.document.getVibrato(this.key);
    const noteRenders = this.registry.get(vibrato.id);
    if (noteRenders.length < 2) {
      this.log.warn('cannot render vibrato with less than 2 notes, skipping', { vibratoIndex: this.key.vibratoIndex });
      return [];
    }

    const vexflowVibratoBrackets = new Array<vexflow.VibratoBracket>();

    const systemIndexes = noteRenders.map((n) => n.key.systemIndex);
    for (const systemIndex of systemIndexes) {
      const renders = noteRenders.filter((n) => n.key.systemIndex === systemIndex);
      if (renders.length > 1) {
        const vexflowVibratoBracket = new vexflow.VibratoBracket({
          start: renders.at(0)!.vexflowNote,
          stop: renders.at(-1)!.vexflowNote,
        });
        vexflowVibratoBrackets.push(vexflowVibratoBracket);
      }
    }

    return vexflowVibratoBrackets;
  }
}
