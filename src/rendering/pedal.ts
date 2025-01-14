import * as vexflow from 'vexflow';
import * as util from '@/util';
import { Config } from '@/config';
import { Logger } from '@/debug';
import { Rect } from '@/spatial';
import { Document } from './document';
import { NoteRender, PedalKey, PedalRender, RestRender } from './types';
import { RenderRegistry } from './renderregistry';

export class Pedal {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private key: PedalKey,
    private registry: RenderRegistry
  ) {}

  render(): PedalRender {
    const pedal = this.document.getPedal(this.key);
    const renders = this.registry.get(pedal.id).filter((r) => r.type === 'note' || r.type === 'rest');

    const vexflowPedalMarkings = this.renderVexflowPedalMarkings(renders);

    let vexflowPedalMarkingType: number;
    switch (pedal.pedalType) {
      case 'text':
        vexflowPedalMarkingType = vexflow.PedalMarking.type.TEXT;
        break;
      case 'bracket':
        vexflowPedalMarkingType = vexflow.PedalMarking.type.BRACKET;
        break;
      case 'mixed':
        vexflowPedalMarkingType = vexflow.PedalMarking.type.MIXED;
        break;
    }

    for (const vexflowPedalMarking of vexflowPedalMarkings) {
      vexflowPedalMarking.setType(vexflowPedalMarkingType);
    }

    return {
      type: 'pedal',
      key: this.key,
      rect: Rect.empty(),
      vexflowPedalMarkings,
    };
  }

  private renderVexflowPedalMarkings(renders: Array<NoteRender | RestRender>): vexflow.PedalMarking[] {
    const vexflowPedalMarkings = new Array<vexflow.PedalMarking>();

    const systemIndexes = util.unique(renders.map((n) => n.key.systemIndex));
    for (const systemIndex of systemIndexes) {
      const systemScopedRenders = renders.filter((n) => n.key.systemIndex === systemIndex);
      if (systemScopedRenders.length > 1) {
        const vexflowPedalMarking = this.renderSinglePedalMarking(systemScopedRenders);
        vexflowPedalMarkings.push(vexflowPedalMarking);
      }
    }

    return vexflowPedalMarkings;
  }

  private renderSinglePedalMarking(renders: Array<NoteRender | RestRender>): vexflow.PedalMarking {
    const vexflowStaveNotes = new Array<vexflow.StaveNote>();

    for (const noteRender of renders) {
      const vexflowNote = noteRender.vexflowNote;
      if (!(vexflowNote instanceof vexflow.StaveNote)) {
        continue;
      }
      const note = this.document.getNote(noteRender.key);
      if (note.pedalMark?.pedalMarkType === 'change') {
        // This is required for vexflow to show pedal changes.
        vexflowStaveNotes.push(vexflowNote, vexflowNote);
      } else {
        vexflowStaveNotes.push(vexflowNote);
      }
    }

    vexflowStaveNotes.sort((a, b) => a.getAbsoluteX() - b.getAbsoluteX());

    return new vexflow.PedalMarking(vexflowStaveNotes);
  }
}
