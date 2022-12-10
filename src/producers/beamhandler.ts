import { VexmlMessageReceiver } from '../types';
import * as msg from '../util/msg';
import { NodeHandler, NodeHandlerCtx } from './nodehandler';

export class BeamHandler extends NodeHandler<'beam', NodeHandlerCtx<'beam'>> {
  sendMessages(receiver: VexmlMessageReceiver, ctx: NodeHandlerCtx<'beam'>): void {
    receiver.onMessage(
      msg.beam({
        name: 'beam',
        value: this.getValue(ctx),
        number: this.getNumber(ctx),
        type: this.getType(ctx),
        placement: this.getPlacement(ctx),
      })
    );
  }

  private getPlacement(ctx: NodeHandlerCtx<'beam'>): string | undefined {
    return ctx.node.asElement().getAttribute('placement') ?? undefined;
  }

  private getType(ctx: NodeHandlerCtx<'beam'>): string | undefined {
    return ctx.node.asElement().getAttribute('type') ?? undefined;
  }

  private getNumber(ctx: NodeHandlerCtx<'beam'>): number | undefined {
    return parseInt(ctx.node.asElement().getAttribute('type') ?? '1', 10);
  }

  private getValue(ctx: NodeHandlerCtx<'beam'>): string {
    return ctx.node.asElement().textContent ?? '';
  }
}
