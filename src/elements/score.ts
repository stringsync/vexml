import * as vexflow from 'vexflow';
import * as spatial from '@/spatial';
import * as util from '@/util';
import { System } from './system';
import { Title } from './title';

export class Score {
  constructor(private ctx: vexflow.RenderContext, private title: Title | null, private systems: System[]) {}

  @util.memoize()
  getRect(): spatial.Rect {
    return spatial.Rect.merge([
      this.title?.getRect() ?? spatial.Rect.empty(),
      ...this.systems.map((system) => system.getRect()),
    ]);
  }

  getTitle(): Title | null {
    return this.title;
  }

  getSystems(): System[] {
    return this.systems;
  }

  draw(): this {
    this.title?.draw();
    return this;
  }
}
