import * as vexflow from 'vexflow';
import * as util from '@/util';
import { Config } from './config';
import { Logger } from '@/debug';
import { Rect } from '@/spatial';
import { Document } from './document';
import { NoteRender, RestRender, WedgeKey, WedgeRender } from './types';
import { RenderRegistry } from './renderregistry';

export class Wedge {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private key: WedgeKey,
    private registry: RenderRegistry
  ) {}

  render(): WedgeRender {
    const wedge = this.document.getWedge(this.key);
    const renders = this.registry.get(wedge.id).filter((r) => r.type === 'note' || r.type === 'rest');

    const vexflowStaveHairpins = this.renderVexflowStaveHairpins(renders);

    return {
      type: 'wedge',
      key: this.key,
      rect: Rect.empty(),
      vexflowStaveHairpins,
    };
  }

  private renderVexflowStaveHairpins(renders: Array<NoteRender | RestRender>): vexflow.StaveHairpin[] {
    if (renders.length < 2) {
      this.log.warn('cannot render wedge with less than 2 notes, skipping', { wedgeIndex: this.key.wedgeIndex });
      return [];
    }

    const vexflowStaveHairpins = new Array<vexflow.StaveHairpin>();

    const systemIndexes = util.unique(renders.map((n) => n.key.systemIndex));
    for (const systemIndex of systemIndexes) {
      const systemScopedRenders = renders.filter((n) => n.key.systemIndex === systemIndex);
      if (systemScopedRenders.length > 1) {
        const vexflowStaveHairpin = this.renderSingleStaveHairpin(systemScopedRenders);
        vexflowStaveHairpins.push(vexflowStaveHairpin);
      }
    }

    return vexflowStaveHairpins;
  }

  private renderSingleStaveHairpin(renders: Array<NoteRender | RestRender>): vexflow.StaveHairpin {
    const wedge = this.document.getWedge(this.key);

    const firstNote = renders.at(0)!.vexflowNote;
    const lastNote = renders.at(-1)!.vexflowNote;

    let vexflowStaveHairpinType: number;
    switch (wedge.wedgeType) {
      case 'crescendo':
        vexflowStaveHairpinType = vexflow.StaveHairpin.type.CRESC;
        break;
      case 'diminuendo':
        vexflowStaveHairpinType = vexflow.StaveHairpin.type.DECRESC;
        break;
    }

    let vexflowModifierPosition: vexflow.ModifierPosition;
    switch (wedge.placement) {
      case 'above':
        vexflowModifierPosition = vexflow.Modifier.Position.ABOVE;
        break;
      case 'below':
        vexflowModifierPosition = vexflow.Modifier.Position.BELOW;
        break;
    }

    return new vexflow.StaveHairpin({ firstNote, lastNote }, vexflowStaveHairpinType).setPosition(
      vexflowModifierPosition
    );
  }
}
