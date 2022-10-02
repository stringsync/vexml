import * as msg from './msg';
import { NamedNode } from './namednode';
import { NodeHandler, NodeHandlerCtx } from './nodehandler';
import { VexmlMessageReceiver } from './types';

const DEFAULT_ID = 'NN';

export class PartHandlerError extends Error {}

/**
 * Produces vexml messages from <part> nodes.
 *
 * https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/part-partwise/
 */
export class PartHandler extends NodeHandler<'part'> {
  private measureHandler: NodeHandler<'measure'>;

  constructor(opts: { measureHandler: NodeHandler<'measure'> }) {
    super();
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
    const childNodes = ctx.node.asElement().childNodes;
    for (const childNode of childNodes) {
      const node = NamedNode.of(childNode);
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
      return DEFAULT_ID;
    }
  }
}
