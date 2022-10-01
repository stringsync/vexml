import { NamedNode } from './namednode';
import { VexmlMessageProducer, VexmlMessageReceiver } from './types';

/**
 * Derives vexml messages from MusicXML nodes.
 */
export abstract class NodeHandler<T extends string> implements VexmlMessageProducer {
  constructor(protected node: NamedNode<T>) {}

  abstract message(receiver: VexmlMessageReceiver): void;
}
