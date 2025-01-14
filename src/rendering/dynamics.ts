import * as vexflow from 'vexflow';
import { Config } from '@/config';
import { Logger } from '@/debug';
import { Rect } from '@/spatial';
import { Document } from './document';
import { DynamicsRender, VoiceEntryKey } from './types';

export class Dynamics {
  constructor(private config: Config, private log: Logger, private document: Document, private key: VoiceEntryKey) {}

  render(): DynamicsRender {
    const dynamics = this.document.getDynamics(this.key);

    const vexflowTextDynamics = new vexflow.TextDynamics({
      text: dynamics.dynamicType,
      duration: '4',
    });

    return {
      type: 'dynamics',
      key: this.key,
      rect: Rect.empty(),
      dynamicType: dynamics.dynamicType,
      vexflowNote: vexflowTextDynamics,
    };
  }
}
