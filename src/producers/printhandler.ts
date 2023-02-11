import { VexmlConfig, VexmlMessageReceiver } from '../types';
import * as msg from '../util/msg';
import { NodeHandler, NodeHandlerCtx } from './nodehandler';

type SystemLayout = {
  leftMargin?: number;
  rightMargin?: number;
  topSystemMargin?: number;
  systemMargin?: number;
};

type StaffLayout = {
  staffDistance?: number;
};

export class PrintHandler extends NodeHandler<'print'> {
  constructor() {
    super();
  }

  sendMessages(receiver: VexmlMessageReceiver, ctx: NodeHandlerCtx<'print'>): void {
    receiver.onMessage(
      msg.print({
        newSystem: ctx.node.asElement().getAttribute('new-system') === 'yes' ? true : false,
        newPage: ctx.node.asElement().getAttribute('new-page') === 'yes' ? true : false,
        systemLayout: this.getSystemLayout(ctx),
        staffLayout: this.getStaffLayouts(ctx),
      })
    );
  }

  getSystemLayout(ctx: NodeHandlerCtx<'print'>): SystemLayout {
    const leftMargin = Array.from(ctx.node.asElement().getElementsByTagName('left-margin'))[0]?.textContent;
    const rightMargin = Array.from(ctx.node.asElement().getElementsByTagName('right-margin'))[0]?.textContent;
    const topSystemMargin = Array.from(ctx.node.asElement().getElementsByTagName('top-system-margin'))[0]?.textContent;
    const systemMargin = Array.from(ctx.node.asElement().getElementsByTagName('system-margin'))[0]?.textContent;
    return {
      leftMargin: leftMargin == null ? undefined : parseInt(leftMargin, 10),
      rightMargin: rightMargin == null ? undefined : parseInt(rightMargin, 10),
      topSystemMargin: topSystemMargin == null ? undefined : parseInt(topSystemMargin, 10),
      systemMargin: systemMargin == null ? undefined : parseInt(systemMargin, 10),
    };
  }

  getStaffLayouts(ctx: NodeHandlerCtx<'print'>): StaffLayout[] {
    const staffLayouts = new Array<StaffLayout>();

    const elements = Array.from(ctx.node.asElement().getElementsByTagName('staff-layout'));
    for (const item of elements) {
      const staffDistance = item.getElementsByTagName('staff-distance')[0].textContent;
      staffLayouts.push({
        staffDistance: staffDistance == null ? undefined : parseInt(staffDistance, 10),
      });
    }
    return staffLayouts;
  }
}
