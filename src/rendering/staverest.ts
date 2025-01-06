import * as vexflow from 'vexflow';
import { Config } from './config';
import { Logger } from '@/debug';
import { Rect } from '@/spatial';
import { Document } from './document';
import { VoiceEntryKey } from './types';

export type StaveRestRender = {
  type: 'staverest';
  key: VoiceEntryKey;
  rect: Rect;
  vexflowTickable: vexflow.StaveNote;
};

export class StaveRest {
  constructor(private config: Config, private log: Logger, private document: Document, private key: VoiceEntryKey) {}

  render(): StaveRestRender {
    const rest = this.document.getRest(this.key);

    const vexflowStaveNote = new vexflow.StaveNote({
      keys: this.getVexflowStaveKeys(),
      duration: `${rest.durationType}r`,
      dots: rest.dotCount,
      clef: this.document.getStave(this.key).signature.clef.sign,
      alignCenter: this.shouldAlignCenter(),
    });

    for (let index = 0; index < rest.dotCount; index++) {
      vexflow.Dot.buildAndAttach([vexflowStaveNote]);
    }

    return {
      type: 'staverest',
      key: this.key,
      rect: Rect.empty(), // placeholder
      vexflowTickable: vexflowStaveNote,
    };
  }
  private getVexflowStaveKeys(): string[] {
    const rest = this.document.getRest(this.key);

    const displayPitch = rest.displayPitch;
    if (displayPitch) {
      return [`${displayPitch.step}/${displayPitch.octave}`];
    }

    const clef = this.document.getStave(this.key).signature.clef;
    if (clef.sign === 'bass') {
      return ['D/3'];
    }

    if (rest.durationType === '2') {
      return ['B/4'];
    }
    if (rest.durationType === '1') {
      return ['D/5'];
    }
    return ['B/4'];
  }

  private shouldAlignCenter(): boolean {
    const voiceEntryCount = this.document.getVoiceEntryCount(this.key);
    if (voiceEntryCount > 1) {
      return false;
    }

    const rest = this.document.getRest(this.key);
    if (rest.durationType === '1') {
      return true;
    }
    if (rest.durationType === '2') {
      return true;
    }

    return false;
  }
}
