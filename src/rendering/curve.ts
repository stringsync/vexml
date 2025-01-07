import * as vexflow from 'vexflow';
import * as util from '@/util';
import { Config } from './config';
import { Logger } from '@/debug';
import { Rect } from '@/spatial';
import { Document } from './document';
import { CurveKey } from './types';
import { StaveNoteRender } from './stavenote';
import { NoopRenderContext } from './nooprenderctx';

export type CurveRender = {
  type: 'curve';
  rect: Rect;
  vexflowCurves: vexflow.Curve[];
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

    const firstNote = staveNoteRenders.at(0)!.vexflowTickable;
    const lastNote = staveNoteRenders.at(-1)!.vexflowTickable;

    // TODO: Figure out options, especially when the curve spans systems.
    const vexflowCurves = [new vexflow.Curve(firstNote, lastNote, {})];

    // Use getBoundingBox when it works.
    // See https://github.com/vexflow/vexflow/issues/252
    const rect = Rect.empty();

    return {
      type: 'curve',
      rect,
      vexflowCurves,
    };
  }
}
