import { NodeHandler, NodeHandlerCtx } from './nodehandler';
import { VexmlMessageReceiver } from './types';

export class AttributesHandler extends NodeHandler<'attributes'> {
  sendMessages(receiver: VexmlMessageReceiver, ctx: NodeHandlerCtx<'attributes'>): void {
    // TODO(jared): Flesh out handler.
  }
}
