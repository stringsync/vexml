import * as vexflow from 'vexflow';
import { ClefRender, StaveKey } from './types';
import { Config } from '@/config';
import { Logger } from '@/debug';
import { Document } from './document';

const ADDITIONAL_CLEF_WIDTH = 10;

export class Clef {
  constructor(private config: Config, private log: Logger, private document: Document, private key: StaveKey) {}

  render(): ClefRender {
    const clef = this.document.getStave(this.key).signature.clef;

    let annotation: string | undefined;
    if (clef.octaveShift) {
      const direction = clef.octaveShift > 0 ? 'va' : 'vb';
      annotation = `8${direction}`;
    }

    const vexflowClef = new vexflow.Clef(clef.sign, 'default', annotation);
    const width = vexflowClef.getWidth() + ADDITIONAL_CLEF_WIDTH;

    return {
      type: 'clef',
      key: this.key,
      width,
      sign: clef.sign,
      vexflowClef,
    };
  }
}
