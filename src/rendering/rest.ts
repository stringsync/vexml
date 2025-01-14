import * as vexflow from 'vexflow';
import { Config } from '@/config';
import { Logger } from '@/debug';
import { Rect } from '@/spatial';
import { Document } from './document';
import { RestRender, VoiceEntryKey } from './types';

export class Rest {
  constructor(private config: Config, private log: Logger, private document: Document, private key: VoiceEntryKey) {}

  render(): RestRender {
    const rest = this.document.getRest(this.key);
    const isTabStave = this.document.isTabStave(this.key);

    const vexflowNote = isTabStave
      ? new vexflow.TabNote({
          positions: [{ str: 0, fret: '' }],
          duration: `${rest.durationType}r`,
          dots: rest.dotCount,
          alignCenter: this.shouldAlignCenter(),
        })
      : new vexflow.StaveNote({
          keys: this.getVexflowStaveKeys(),
          duration: `${rest.durationType}r`,
          dots: rest.dotCount,
          clef: this.document.getStave(this.key).signature.clef.sign,
          alignCenter: this.shouldAlignCenter(),
        });

    for (let index = 0; index < rest.dotCount; index++) {
      vexflow.Dot.buildAndAttach([vexflowNote]);
    }

    return {
      type: 'rest',
      key: this.key,
      rect: Rect.empty(), // placeholder
      vexflowNote: vexflowNote,
      beamId: rest.beamId,
      tupletIds: rest.tupletIds,
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
