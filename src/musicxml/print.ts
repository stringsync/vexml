import { NamedElement } from '@/util';
import { StaffLayout, SystemLayout } from './types';

export class Print {
  constructor(private element: NamedElement<'print'>) {}

  /** Returns staff layouts of the print. */
  getStaffLayouts(): StaffLayout[] {
    return this.element.all('staff-layout').map((element) => ({
      staffNumber: element.attr('number').withDefault(1).int(),
      staffDistance: element.first('staff-distance')?.content().withDefault(0).int() ?? null,
    }));
  }

  /** Returns system layouts of the print. */
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
