import * as rendering from '@/rendering';
import * as vexflow from 'vexflow';
import { Tickable } from './types';

export class Step {
  private ticks: number;
  private repeat: number;
  private measure: rendering.MeasureRendering;
  private part: rendering.PartRendering;
  private tickable: Tickable;

  constructor(opts: {
    ticks: number;
    repeat: number;
    measure: rendering.MeasureRendering;
    part: rendering.PartRendering;
    tickable: Tickable;
  }) {
    this.ticks = opts.ticks;
    this.repeat = opts.repeat;
    this.measure = opts.measure;
    this.part = opts.part;
    this.tickable = opts.tickable;
  }

  /** Returns the X coordinate in pixels. */
  getX(): number {
    return this.getVfTickable()?.getX() ?? 0;
  }

  /** Returns the Y coordinate in pixels. */
  getY(): number {
    return this.getVfTickable()?.getY() ?? 0;
  }

  /** Returns the height in pixels. */
  getHeight(): number {
    return this.part.height;
  }

  private getVfTickable(): vexflow.Tickable | null {
    switch (this.tickable.type) {
      case 'stavenote':
        return this.tickable.vexflow.staveNote;
      default:
        return null;
    }
  }
}
