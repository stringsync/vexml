import { NodeHandler, NodeHandlerCtx } from './nodehandler';
import { VexmlMessageReceiver } from './types';

const DEFAULT_MEASURE_WIDTH_PX = 100;
const DEFAULT_NUM_STAVES = 0;

/**
 * Produces vexml messages from <measure> nodes.
 *
 * https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/measure-partwise/
 */
export class MeasureHandler extends NodeHandler<'measure'> {
  sendMessages(receiver: VexmlMessageReceiver, ctx: NodeHandlerCtx<'measure'>): void {
    this.sendStartMessage(receiver, ctx);
    this.sendContentMessages(receiver, ctx);
    this.sendEndMessage(receiver, ctx);
  }

  private sendStartMessage(receiver: VexmlMessageReceiver, ctx: NodeHandlerCtx<'measure'>): void {
    receiver.onMessage({
      msgType: 'measureStart',
      width: this.getWidth(ctx),
      staves: this.getStaves(ctx),
    });
  }

  private sendContentMessages(receiver: VexmlMessageReceiver, ctx: NodeHandlerCtx<'measure'>): void {
    // noop
  }

  private sendEndMessage(receiver: VexmlMessageReceiver, ctx: NodeHandlerCtx<'measure'>): void {
    receiver.onMessage({ msgType: 'measureEnd' });
  }

  private getWidth(ctx: NodeHandlerCtx<'measure'>): number {
    const width = ctx.node.asElement().getAttribute('width');
    if (width) {
      return parseInt(width, 10);
    } else {
      return DEFAULT_MEASURE_WIDTH_PX;
    }
  }

  private getStaves(ctx: NodeHandlerCtx<'measure'>): number {
    const staves = ctx.node.asElement().getElementsByTagName('staves').item(0)?.textContent;
    if (staves) {
      return parseInt(staves, 10);
    } else {
      return DEFAULT_NUM_STAVES;
    }
  }
}
