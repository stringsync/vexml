import { NamedNode } from '../namednode';
import { VexmlMessageProducer, VexmlMessageReceiver } from '../types';

export type NodeHandlerCtx<T extends string> = {
  node: NamedNode<T>;
};

/**
 * Derives vexml messages from MusicXML nodes.
 */
export abstract class NodeHandler<T extends string, S extends NodeHandlerCtx<T> = NodeHandlerCtx<T>>
  implements VexmlMessageProducer<S>
{
  abstract sendMessages(receiver: VexmlMessageReceiver, ctx: S): void;
}
