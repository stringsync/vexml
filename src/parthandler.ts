import * as msg from './msg';
import { NamedNode } from './namednode';
import { NodeHandler, NodeHandlerCtx } from './nodehandler';
import { VexmlConfig, VexmlMessageReceiver } from './types';

export class PartHandlerError extends Error {}

/**
 * Produces vexml messages from <part> nodes.
 *
 * https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/part-partwise/
 */
export class PartHandler extends NodeHandler<'part'> {
  private config: VexmlConfig;
  private measureHandler: NodeHandler<'measure'>;

  constructor(opts: { config: VexmlConfig; measureHandler: NodeHandler<'measure'> }) {
    super();

    this.config = opts.config;
    this.measureHandler = opts.measureHandler;
  }

  sendMessages(receiver: VexmlMessageReceiver, ctx: NodeHandlerCtx<'part'>): void {
    this.sendStartMessage(receiver, ctx);
    this.sendContentMessages(receiver, ctx);
    this.sendEndMessage(receiver, ctx);
  }

  private sendStartMessage(receiver: VexmlMessageReceiver, ctx: NodeHandlerCtx<'part'>) {
    const message = msg.partStart({
      id: this.getId(ctx),
    });
    receiver.onMessage(message);
  }

  private sendContentMessages(receiver: VexmlMessageReceiver, ctx: NodeHandlerCtx<'part'>) {
    const children = Array.from(ctx.node.asElement().children);
    for (const child of children) {
      const node = NamedNode.of(child);
      if (node.isNamed('measure')) {
        this.measureHandler.sendMessages(receiver, { node });
      } else {
        throw new PartHandlerError(`unhandled node: ${node.name}`);
      }
    }
  }

  private sendEndMessage(receiver: VexmlMessageReceiver, ctx: NodeHandlerCtx<'part'>) {
    const message = msg.partEnd({
      id: this.getId(ctx),
    });
    receiver.onMessage(message);
  }

  private getId(ctx: NodeHandlerCtx<'part'>): string {
    const id = ctx.node.asElement().getAttribute('id');
    if (id) {
      return id;
    } else {
      return this.config.DEFAULT_PART_ID;
    }
  }
}
