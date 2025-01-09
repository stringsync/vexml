import * as vexflow from 'vexflow';
import { Config } from './config';
import { Logger } from '@/debug';
import { Rect } from '@/spatial';
import { Document } from './document';
import { KeyRender, StaveKey } from './types';
import { AccidentalCode } from './enums';

const KEY_SIGNATURE_PADDING = 15;

/** Represents a musical key signature, not document key. */
export class Key {
  constructor(private config: Config, private log: Logger, private document: Document, private key: StaveKey) {}

  render(): KeyRender {
    const vexflowKeySignature = this.getVexflowKeySignature();

    return {
      type: 'key',
      key: this.key,
      rect: Rect.empty(), // placeholder
      width: this.getWidth(),
      vexflowKeySignature,
    };
  }

  private getAlterations(): AccidentalCode[] {
    const keySignature = this.document.getStave(this.key).signature.key;

    const alterations = new Array<AccidentalCode>();

    if (Math.abs(keySignature.fifths) > 7) {
      const additional = Math.abs(keySignature.fifths) - 7;
      for (let index = 0; index < additional; index++) {
        alterations.push(keySignature.fifths > 0 ? '##' : 'bb');
      }
    }

    return alterations;
  }

  private getWidth() {
    const vexflowStave = new vexflow.Stave(0, 0, 0);
    const vexflowKeySignature = this.getVexflowKeySignature();
    vexflowKeySignature.addToStave(vexflowStave);
    return vexflowKeySignature.getWidth() + KEY_SIGNATURE_PADDING;
  }

  private getVexflowKeySignature() {
    const keySignature = this.document.getStave(this.key).signature.key;
    return new vexflow.KeySignature(keySignature.rootNote, keySignature.previousKey?.rootNote, this.getAlterations());
  }
}
