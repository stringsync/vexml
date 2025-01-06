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
    return {
      type: 'staverest',
      key: this.key,
      rect: Rect.empty(),
      vexflowTickable: new vexflow.StaveNote({
        keys: ['b/4'],
        duration: 'w',
      }),
    };
  }
}
