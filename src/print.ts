import { NamedNode } from './namednode';
import { StaffLayout, SystemLayout } from './types';
import * as parse from './parse';

export class Print {
  constructor(private node: NamedNode<'print'>) {}

  /** Returns staff layouts of the print. */
  getStaffLayouts(): StaffLayout[] {
    return Array.from(this.node.asElement().getElementsByTagName('staff-layout')).map((node) => {
      const number = node.getAttribute('number');
      const staffDistance = node.getElementsByTagName('staff-distance').item(0)?.textContent;
      return {
        number: parse.intOrDefault(number, 1),
        staffDistance: staffDistance ? parse.intOrDefault(staffDistance, 0) : null,
      };
    });
  }

  /** Returns system layouts of the print. */
  getSystemLayout(): SystemLayout {
    const leftMargin = this.node.asElement().getElementsByTagName('left-margin').item(0)?.textContent;
    const rightMargin = this.node.asElement().getElementsByTagName('right-margin').item(0)?.textContent;
    const topSystemDistance = this.node.asElement().getElementsByTagName('top-system-distance').item(0)?.textContent;
    const systemDistance = this.node.asElement().getElementsByTagName('system-distance').item(0)?.textContent;
    return {
      leftMargin: leftMargin ? parse.intOrDefault(leftMargin, 0) : null,
      rightMargin: rightMargin ? parse.intOrDefault(rightMargin, 0) : null,
      topSystemDistance: topSystemDistance ? parse.intOrDefault(topSystemDistance, 0) : null,
      systemDistance: systemDistance ? parse.intOrDefault(systemDistance, 0) : null,
    };
  }
}
