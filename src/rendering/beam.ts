import * as util from '@/util';
import * as vexflow from 'vexflow';
import { Config } from './config';
import { Logger } from '@/debug';
import { Rect } from '@/spatial';
import { Document } from './document';
import { BeamKey, BeamRender, VoiceEntryRender } from './types';

interface VoiceEntryRenderRegistry {
  get(beamId: string): VoiceEntryRender[] | undefined;
}

export class Beam {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private key: BeamKey,
    private registry: VoiceEntryRenderRegistry
  ) {}

  render(): BeamRender {
    const beam = this.document.getBeam(this.key);
    const voiceEntryRenders = this.registry.get(beam.id);
    util.assertDefined(voiceEntryRenders);
    util.assert(voiceEntryRenders.length > 1, 'Beam must have more than one voice entry');

    const vexflowBeam = new vexflow.Beam(voiceEntryRenders.map((entry) => entry.vexflowTickable));

    return {
      type: 'beam',
      rect: Rect.empty(),
      key: this.key,
      vexflowBeam,
    };
  }
}
