import * as data from '@/data';
import * as vexflow from 'vexflow';
import { StaveKey } from './types';
import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';

const ADDITIONAL_CLEF_WIDTH = 10;

export type ClefRender = {
  type: 'clef';
  key: StaveKey;
  width: number;
  sign: data.ClefSign;
  vexflowClef: vexflow.Clef;
};

export class Clef {
  constructor(private config: Config, private log: Logger, private document: Document, private key: StaveKey) {}

  render(): ClefRender {
    const sign = this.document.getStave(this.key).signature.clef.sign;
    const vexflowClef = new vexflow.Clef(sign);
    const width = vexflowClef.getWidth() + ADDITIONAL_CLEF_WIDTH;

    return {
      type: 'clef',
      key: this.key,
      width,
      sign,
      vexflowClef,
    };
  }
}
