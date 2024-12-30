import * as spatial from '@/spatial';
import * as vexflow from 'vexflow';
import { System } from './system';
import { Title } from './title';

export class Score {
  constructor(private title: Title | null, private partLabels: string[], private systems: System[]) {}

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

  getPartLabels(): string[] {
    return this.partLabels;
  }

  setContext(ctx: vexflow.RenderContext): this {
    this.title?.setContext(ctx);

    for (const system of this.systems) {
      system.setContext(ctx);
    }

    return this;
  }

  draw(): this {
    this.title?.draw();

    for (const system of this.systems) {
      system.draw();
    }

    return this;
  }
}
