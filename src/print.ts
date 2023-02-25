import { NamedElement } from './namedelement';
import { StaffLayout, SystemLayout } from './types';

export class Print {
  constructor(private node: NamedElement<'print'>) {}

  /** Returns staff layouts of the print. */
  getStaffLayouts(): StaffLayout[] {
    return this.node.all('staff-layout').map((element) => ({
      number: element.attr('number').withDefault(1).int(),
      staffDistance: element.first('staff-distance')?.content().withDefault(0).int() ?? null,
    }));
  }

  /** Returns system layouts of the print. */
  getSystemLayout(): SystemLayout {
    const leftMargin = this.node.first('left-margin')?.content().withDefault(0) ?? null;
    const rightMargin = this.node.first('right-margin')?.content().withDefault(0) ?? null;
    const topSystemDistance = this.node.first('top-system-distance')?.content().withDefault(0) ?? null;
    const systemDistance = this.node.first('system-distance')?.content().withDefault(0) ?? null;
    return {
      leftMargin: leftMargin ? leftMargin.int() : null,
      rightMargin: rightMargin ? rightMargin.int() : null,
      topSystemDistance: topSystemDistance ? topSystemDistance.int() : null,
      systemDistance: systemDistance ? systemDistance.int() : null,
    };
  }
}
