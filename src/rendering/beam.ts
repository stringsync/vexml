import * as util from '@/util';
import * as vexflow from 'vexflow';
import { Config } from './config';
import { Logger } from '@/debug';
import { Rect } from '@/spatial';
import { Document } from './document';
import { BeamKey, BeamRender } from './types';

interface VexflowStemmableNoteRegistry {
  get(beamId: string): vexflow.StemmableNote[] | undefined;
}

export class Beam {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private key: BeamKey,
    private registry: VexflowStemmableNoteRegistry
  ) {}

  render(): BeamRender {
    const beam = this.document.getBeam(this.key);
    const vexflowStemmableNotes = this.registry.get(beam.id);
    util.assertDefined(vexflowStemmableNotes);
    util.assert(vexflowStemmableNotes.length > 1, 'Beam must have more than one voice entry');

    const vexflowBeams = [new vexflow.Beam(vexflowStemmableNotes)];

    return {
      type: 'beam',
      rect: Rect.empty(),
      key: this.key,
      vexflowBeams,
    };
  }
}
