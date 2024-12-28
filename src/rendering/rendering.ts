import * as components from '@/components';
import * as elements from '@/elements';

export class Rendering {
  constructor(private root: components.Root, private elements: { score: elements.Score }) {}

  clear(): void {
    this.root.remove();
  }
}
