import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';
import { MeasureEntryKey } from './types';
import { Point, Rect } from '@/spatial';

const TODO_WIDTH = 200;

export type GapRender = {
  type: 'gap';
  rect: Rect;
};

export class Gap {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private key: MeasureEntryKey,
    private position: Point
  ) {}

  getMinRequiredWidth(): number {
    return TODO_WIDTH;
  }

  render(): GapRender {
    return {
      type: 'gap',
      rect: Rect.empty(),
    };
  }
}
