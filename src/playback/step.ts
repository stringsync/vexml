import * as spatial from '@/spatial';
import { Tickable } from './types';

export class Step {
  private ticks: number;
  private repeat: number;
  private tickable: Tickable;
  private rect: spatial.Rect;

  constructor(opts: { ticks: number; repeat: number; tickable: Tickable; rect: spatial.Rect }) {
    this.ticks = opts.ticks;
    this.repeat = opts.repeat;
    this.tickable = opts.tickable;
    this.rect = opts.rect;
  }

  getRect(): spatial.Rect {
    return this.rect;
  }
}
