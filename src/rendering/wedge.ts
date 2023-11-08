import * as vexflow from 'vexflow';
import * as musicxml from '@/musicxml';

/** The result of rendering a wedge. */
export type WedgeRendering = {
  type: 'wedge';
  vexflow: {
    crescendo: vexflow.Crescendo;
  };
};

/** Represents a crescendo or decrescendo. */
export class Wedge {
  private placement: musicxml.AboveBelow;
  private wedge: musicxml.Wedge;

  constructor(opts: { placement: musicxml.AboveBelow; wedge: musicxml.Wedge }) {
    this.placement = opts.placement;
    this.wedge = opts.wedge;
  }

  render(): WedgeRendering {
    return {
      type: 'wedge',
      vexflow: {
        // TODO: Figure out how to render crescendos: https://github.com/stringsync/vexml/pull/162#issuecomment-1800602187
        crescendo: undefined as any,
      },
    };
  }
}
