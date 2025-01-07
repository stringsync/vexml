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
  key: CurveKey;
  vexflowCurves: vexflow.Curve[];
};

interface StaveNoteRenderRegistry {
  get(curveId: string): StaveNoteRender[] | undefined;
}

export class Curve {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private key: CurveKey,
    private registry: StaveNoteRenderRegistry
  ) {}

  render(): CurveRender {
    const curve = this.document.getCurve(this.key);
    const staveNoteRenders = this.registry.get(curve.id);
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
      key: this.key,
      vexflowCurves,
    };
  }
}
