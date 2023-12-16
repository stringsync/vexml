import { Stave, StaveRendering } from './stave';
import * as util from '@/util';

/** The result of rendering a part. */
export type PartRendering = {
  type: 'part';
  id: string;
  staves: StaveRendering[];
};

/** A part in a musical score. */
export class Part {
  private id: string;

  constructor(opts: { id: string }) {
    this.id = opts.id;
  }

  /** Renders the part. */
  render(): PartRendering {
    return {
      type: 'part',
      id: this.id,
      staves: [],
    };
  }

  @util.memoize()
  private getStaves(): Stave[] {
    return [];
  }
}
