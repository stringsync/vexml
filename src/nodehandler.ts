import { NamedNode } from './namednode';
import { VexmlMessageProducer, VexmlMessageReceiver } from './types';

export type NodeHandlerCtx<T extends string> = {
  node: NamedNode<T>;
};

/**
 * Derives vexml messages from MusicXML nodes.
 */
export abstract class NodeHandler<T extends string> implements VexmlMessageProducer<NodeHandlerCtx<T>> {
  abstract sendMessages(receiver: VexmlMessageReceiver, ctx: NodeHandlerCtx<T>): void;
}
