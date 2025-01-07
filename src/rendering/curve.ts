import * as vexflow from 'vexflow';
import * as util from '@/util';
import { Config } from './config';
import { Logger } from '@/debug';
import { Rect } from '@/spatial';
import { Document } from './document';
import { CurveKey } from './types';
import { StaveNoteRender } from './stavenote';

export type CurveRender = {
  type: 'curve';
  rect: Rect;
  vexflowCurve: vexflow.Curve;
};

interface StaveNoteRegistry {
  get(curveId: string): StaveNoteRender[] | undefined;
}

export class Curve {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private key: CurveKey,
    private staveNoteRegistry: StaveNoteRegistry
  ) {}

  render(): CurveRender {
    const curve = this.document.getCurve(this.key);
    const staveNoteRenders = this.staveNoteRegistry.get(curve.id);
    util.assertDefined(staveNoteRenders);
    util.assert(staveNoteRenders.length > 0, 'Curve must have at least one stave note');

    const firstVexflowStaveNote = staveNoteRenders.at(0)!.vexflowTickable;
    const lastVexflowStaveNote = staveNoteRenders.at(-1)!.vexflowTickable;

    // TODO: Figure out options
    const vexflowCurve = new vexflow.Curve(firstVexflowStaveNote, lastVexflowStaveNote, {});

    return {
      type: 'curve',
      // TODO: Figure out when and how to get the rect. We might need to render it to a noop context.
      rect: Rect.empty(),
      vexflowCurve,
    };
  }
}
