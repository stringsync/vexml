import * as vexflow from 'vexflow';
import * as spatial from '@/spatial';
import { Fragment } from './fragment';
import { Gap } from './gap';

export class Measure {
  constructor(private label: string, private entries: Array<Fragment | Gap>) {}

  getRect() {
    return new spatial.Rect(0, 0, 100, 50);
  }

  getLabel(): string {
    return this.label;
  }

  getEntries(): Array<Fragment | Gap> {
    return this.entries;
  }

  setContext(ctx: vexflow.RenderContext): this {
    for (const entry of this.entries) {
      entry.setContext(ctx);
    }
    return this;
  }

  draw(): this {
    for (const entry of this.entries) {
      entry.draw();
    }
    return this;
  }
}
