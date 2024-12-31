import * as vexflow from 'vexflow';
import { Logger } from '@/debug';
import { Config } from './config';
import { Renderable } from './renderable';
import { RenderLayer, VoiceEntryKey } from './types';
import { Document } from './document';
import { Rect } from '@/spatial';
import { Spacer } from './spacer';
import { VoiceLayout } from './voicelayout';

export class Note extends Renderable {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private key: VoiceEntryKey,
    private layout: VoiceLayout
  ) {
    super();
  }

  get rect() {
    return this.layout.rect(this.key);
  }

  layer(): RenderLayer {
    return 'notes';
  }

  children(): Renderable[] {
    const children = new Array<Renderable>();

    const vexflowStaveNoteRectRep = this.getVexflowStaveNoteRectRep();
    children.push(vexflowStaveNoteRectRep);

    return children;
  }

  private getVexflowStaveNoteRectRep(): Spacer {
    const vexflowStaveNote = this.getVexflowStaveNote();
    const rect = Rect.fromRectLike(vexflowStaveNote.getBoundingBox());
    return Spacer.rect(rect.x, rect.y, rect.w, rect.h);
  }

  private getVexflowStaveNote(): vexflow.StaveNote {
    const note = this.document.getNote(this.key);
    return new vexflow.StaveNote({
      keys: [note.pitch],
      duration: 'q',
    });
  }
}
