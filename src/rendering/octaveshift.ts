import * as vexflow from 'vexflow';
import * as util from '@/util';
import { Config } from './config';
import { Logger } from '@/debug';
import { Rect } from '@/spatial';
import { Document } from './document';
import { NoteRender, OctaveShiftKey, OctaveShiftRender } from './types';
import { NoteRenderRegistry } from './noterenderregistry';

export class OctaveShift {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private key: OctaveShiftKey,
    private registry: NoteRenderRegistry
  ) {}

  render(): OctaveShiftRender {
    const octaveShift = this.document.getOctaveShift(this.key);
    const noteRenders = this.registry.get(octaveShift.id);

    const vexflowTextBrackets = this.renderVexflowTextBrackets(noteRenders);

    return {
      type: 'octaveshift',
      key: this.key,
      rect: Rect.empty(),
      vexflowTextBrackets,
    };
  }

  private renderVexflowTextBrackets(noteRenders: NoteRender[]): vexflow.TextBracket[] {
    if (noteRenders.length < 2) {
      this.log.warn('cannot render octave shift with less than 2 notes, skipping', {
        octaveShiftIndex: this.key.octaveShiftIndex,
      });
      return [];
    }

    const vexflowTextBrackets = new Array<vexflow.TextBracket>();

    const systemIndexes = util.unique(noteRenders.map((n) => n.key.systemIndex));
    for (const systemIndex of systemIndexes) {
      const systemNoteRenders = noteRenders.filter((n) => n.key.systemIndex === systemIndex);
      if (systemNoteRenders.length > 1) {
        const vexflowTextBracket = this.renderVexflowTextBracket(systemNoteRenders);
        vexflowTextBrackets.push(vexflowTextBracket);
      }
    }

    return vexflowTextBrackets;
  }

  private renderVexflowTextBracket(noteRenders: NoteRender[]): vexflow.TextBracket {
    const octaveShift = this.document.getOctaveShift(this.key);

    const start = noteRenders.at(0)!.vexflowNote;
    const stop = noteRenders.at(-1)!.vexflowNote;

    const text = Math.abs(octaveShift.size).toString();

    let position: vexflow.TextBracketPosition;
    if (octaveShift.size < 0) {
      position = vexflow.TextBracketPosition.TOP;
    } else {
      position = vexflow.TextBracketPosition.BOTTOM;
    }

    let superscript: string;
    if (octaveShift.size < 0) {
      superscript = 'va';
    } else {
      superscript = 'mb';
    }

    return new vexflow.TextBracket({
      start,
      stop,
      text,
      superscript,
      position,
    });
  }
}
