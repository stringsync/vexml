import * as vexflow from 'vexflow';
import * as util from '@/util';
import { Config } from './config';
import { Logger } from '@/debug';
import { Rect } from '@/spatial';
import { Document } from './document';
import { NoteRender, WedgeKey, WedgeRender } from './types';

interface NoteRenderRegistry {
  get(wedgeId: string): NoteRender[] | undefined;
}

export class Wedge {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private key: WedgeKey,
    private registry: NoteRenderRegistry
  ) {}

  render(): WedgeRender {
    const wedge = this.document.getWedge(this.key);
    const noteRenders = this.registry.get(wedge.id);
    util.assertDefined(noteRenders);

    const vexflowStaveHairpins = this.renderVexflowStaveHairpins(noteRenders);

    return {
      type: 'wedge',
      key: this.key,
      rect: Rect.empty(),
      vexflowStaveHairpins,
    };
  }

  private renderVexflowStaveHairpins(noteRenders: NoteRender[]): vexflow.StaveHairpin[] {
    if (noteRenders.length < 2) {
      this.log.warn('cannot render wedge with less than 2 notes, skipping', { wedgeIndex: this.key.wedgeIndex });
      return [];
    }

    const vexflowStaveHairpins = new Array<vexflow.StaveHairpin>();

    const systemIndexes = util.unique(noteRenders.map((n) => n.key.systemIndex));
    for (const systemIndex of systemIndexes) {
      const systemNoteRenders = noteRenders.filter((n) => n.key.systemIndex === systemIndex);
      if (systemNoteRenders.length > 1) {
        const vexflowStaveHairpin = this.renderSingleStaveHairpin(systemNoteRenders);
        vexflowStaveHairpins.push(vexflowStaveHairpin);
      }
    }

    return vexflowStaveHairpins;
  }

  private renderSingleStaveHairpin(noteRenders: NoteRender[]): vexflow.StaveHairpin {
    const wedge = this.document.getWedge(this.key);

    const firstNote = noteRenders.at(0)!.vexflowTickable;
    const lastNote = noteRenders.at(-1)!.vexflowTickable;

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
