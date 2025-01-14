import * as vexflow from 'vexflow';
import * as util from '@/util';
import { Config } from '@/config';
import { Logger } from '@/debug';
import { Rect } from '@/spatial';
import { Document } from './document';
import { NoteRender, OctaveShiftKey, OctaveShiftRender, RestRender } from './types';
import { RenderRegistry } from './renderregistry';

export class OctaveShift {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private key: OctaveShiftKey,
    private registry: RenderRegistry
  ) {}

  render(): OctaveShiftRender {
    const octaveShift = this.document.getOctaveShift(this.key);
    const renders = this.registry.get(octaveShift.id).filter((r) => r.type === 'note' || r.type === 'rest');

    const vexflowTextBrackets = this.renderVexflowTextBrackets(renders);

    return {
      type: 'octaveshift',
      key: this.key,
      rect: Rect.empty(),
      vexflowTextBrackets,
    };
  }

  private renderVexflowTextBrackets(renders: Array<NoteRender | RestRender>): vexflow.TextBracket[] {
    if (renders.length < 2) {
      this.log.warn('cannot render octave shift with less than 2 notes, skipping', {
        octaveShiftIndex: this.key.octaveShiftIndex,
      });
      return [];
    }

    const vexflowTextBrackets = new Array<vexflow.TextBracket>();

    const systemIndexes = util.unique(renders.map((n) => n.key.systemIndex));
    for (const systemIndex of systemIndexes) {
      const systemNoteRenders = renders.filter((n) => n.key.systemIndex === systemIndex);
      if (systemNoteRenders.length > 1) {
        const vexflowTextBracket = this.renderVexflowTextBracket(systemNoteRenders);
        vexflowTextBrackets.push(vexflowTextBracket);
      }
    }

    return vexflowTextBrackets;
  }

  private renderVexflowTextBracket(renders: Array<NoteRender | RestRender>): vexflow.TextBracket {
    const octaveShift = this.document.getOctaveShift(this.key);

    const start = renders.at(0)!.vexflowNote;
    const stop = renders.at(-1)!.vexflowNote;

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
