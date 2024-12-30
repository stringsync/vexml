import * as components from '@/components';

import { Score } from './score';

export class Rendering {
  constructor(private root: components.Root, score: Score) {}

  clear(): void {
    this.root.remove();
  }
}
