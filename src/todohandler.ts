import { NodeHandler, NodeHandlerCtx } from './nodehandler';
import { VexmlMessageReceiver } from './types';

export class TodoHandler extends NodeHandler<string> {
  sendMessages(_receiver: VexmlMessageReceiver, ctx: NodeHandlerCtx<string>): void {
    console.warn(`TODO: unimplemented node handler for '<${ctx.node.name}>'`);
  }
}
