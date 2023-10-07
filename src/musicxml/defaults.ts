import { NamedElement } from '@/util';
import { StaveLayout, SystemLayout } from './types';

export class Defaults {
  constructor(private element: NamedElement<'defaults'>) {}

  /** Returns stave layouts of the defaults element. */
  getStaveLayouts(): StaveLayout[] {
    return this.element.all('staff-layout').map((element) => ({
      staveNumber: element.attr('number').withDefault(1).int(),
      staveDistance: element.first('staff-distance')?.content().withDefault(0).int() ?? null,
    }));
  }

  /** Returns system layouts of the defaults element. */
  getSystemLayout(): SystemLayout {
    const leftMargin = this.element.first('left-margin')?.content().withDefault(0) ?? null;
    const rightMargin = this.element.first('right-margin')?.content().withDefault(0) ?? null;
    const topSystemDistance = this.element.first('top-system-distance')?.content().withDefault(0) ?? null;
    const systemDistance = this.element.first('system-distance')?.content().withDefault(0) ?? null;
    return {
      leftMargin: leftMargin ? leftMargin.int() : null,
      rightMargin: rightMargin ? rightMargin.int() : null,
      topSystemDistance: topSystemDistance ? topSystemDistance.int() : null,
      systemDistance: systemDistance ? systemDistance.int() : null,
    };
  }
}
