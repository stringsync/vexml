import * as rendering from '@/rendering';
import { Logger } from '@/debug';
import { Rect } from './types';
import { Part } from './part';

export class Fragment {
  private constructor(
    private config: rendering.Config,
    private log: Logger,
    private document: rendering.Document,
    private fragmentRender: rendering.FragmentRender,
    private parts: Part[]
  ) {}

  static create(
    config: rendering.Config,
    log: Logger,
    document: rendering.Document,
    fragmentRender: rendering.FragmentRender
  ): Fragment {
    const parts = fragmentRender.partRenders.map((partRender) => Part.create(config, log, document, partRender));
    return new Fragment(config, log, document, fragmentRender, parts);
  }

  /** The name of the element, which can be used as a type discriminant. */
  public readonly name = 'fragment';

  /** Returns the bounding box of the element. */
  get rect(): Rect {
    return this.fragmentRender.rect;
  }

  /** Returns the parts of the fragment. */
  getParts(): Part[] {
    return this.parts;
  }
}
