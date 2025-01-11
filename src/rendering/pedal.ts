import * as vexflow from 'vexflow';
import * as util from '@/util';
import { Config } from './config';
import { Logger } from '@/debug';
import { Rect } from '@/spatial';
import { Document } from './document';
import { NoteRender, PedalKey, PedalRender } from './types';

interface NoteRenderRegistry {
  get(pedalId: string): NoteRender[] | undefined;
}

export class Pedal {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private key: PedalKey,
    private registry: NoteRenderRegistry
  ) {}

  render(): PedalRender {
    const pedal = this.document.getPedal(this.key);
    const noteRenders = this.registry.get(pedal.id);
    util.assertDefined(noteRenders);

    const vexflowPedalMarkings = this.renderVexflowPedalMarkings(noteRenders);

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

  private renderVexflowPedalMarkings(noteRenders: NoteRender[]): vexflow.PedalMarking[] {
    const vexflowPedalMarkings = new Array<vexflow.PedalMarking>();

    const systemIndexes = util.unique(noteRenders.map((n) => n.key.systemIndex));
    for (const systemIndex of systemIndexes) {
      const systemNoteRenders = noteRenders.filter((n) => n.key.systemIndex === systemIndex);
      if (systemNoteRenders.length > 1) {
        const vexflowPedalMarking = this.renderSinglePedalMarking(systemNoteRenders);
        vexflowPedalMarkings.push(vexflowPedalMarking);
      }
    }

    return vexflowPedalMarkings;
  }

  private renderSinglePedalMarking(noteRenders: NoteRender[]): vexflow.PedalMarking {
    const vexflowStaveNotes = new Array<vexflow.StaveNote>();

    for (const noteRender of noteRenders) {
      const note = this.document.getNote(noteRender.key);
      if (note.pedalMark?.pedalMarkType === 'change') {
        // This is required for vexflow to show pedal changes.
        vexflowStaveNotes.push(noteRender.vexflowTickable, noteRender.vexflowTickable);
      } else {
        vexflowStaveNotes.push(noteRender.vexflowTickable);
      }
    }

    return new vexflow.PedalMarking(vexflowStaveNotes);
  }
}
