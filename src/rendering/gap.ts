import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';
import { MeasureEntryKey } from './types';
import { Point, Rect } from '@/spatial';
import { PartRender } from './part';
import { PartLabelGroupRender } from './partlabelgroup';

export type GapRender = {
  type: 'gap';
  key: MeasureEntryKey;
  rect: Rect;
  partLabelGroupRender: PartLabelGroupRender | null;
  partRenders: PartRender[];
};

export class Gap {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private key: MeasureEntryKey,
    private position: Point
  ) {}

  render(): GapRender {
    return {
      type: 'gap',
      key: this.key,
      rect: Rect.empty(),
      partLabelGroupRender: null,
      partRenders: [],
    };
  }
}
