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
    const keySignature = this.document.getStave(this.key).signature.key;

    const vexflowKeySignature = new vexflow.KeySignature(
      keySignature.rootNote,
      keySignature.previousKey?.rootNote,
      this.getAlterations()
    );

    const clone = new vexflow.KeySignature(
      keySignature.rootNote,
      keySignature.previousKey?.rootNote,
      this.getAlterations()
    );
    const vexflowStave = new vexflow.Stave(0, 0, 0);
    clone.addToStave(vexflowStave);

    const width = clone.getWidth() + KEY_SIGNATURE_PADDING;

    return {
      type: 'key',
      key: this.key,
      rect: Rect.empty(), // placeholder
      width,
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
}
