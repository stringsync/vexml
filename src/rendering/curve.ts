import * as vexflow from 'vexflow';
import * as util from '@/util';
import { Config } from './config';
import { Logger } from '@/debug';
import { Rect } from '@/spatial';
import { Document } from './document';
import { CurveKey, CurveRender, NoteRender } from './types';

interface NoteRenderRegistry {
  get(curveId: string): NoteRender[] | undefined;
}

export class Curve {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private key: CurveKey,
    private registry: NoteRenderRegistry
  ) {}

  render(): CurveRender {
    const curve = this.document.getCurve(this.key);
    const noteRenders = this.registry.get(curve.id);
    util.assertDefined(noteRenders);
    util.assert(noteRenders.length > 0, 'Curve must have at least one stave note');

    const firstNote = noteRenders.at(0)!.vexflowTickable;
    const lastNote = noteRenders.at(-1)!.vexflowTickable;

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
