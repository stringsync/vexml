import * as di from './di';
import { NamedNode } from './namednode';
import { NodeHandler } from './nodehandler';
import { PartIterator } from './partiterator';
import { VexmlMessageProducer, VexmlMessageReceiver } from './types';

export class ProducerError extends Error {}

export class Producer implements VexmlMessageProducer {
  static feed(musicXml: string): Producer {
    const { partHandler } = di.createContainer();
    return new Producer(musicXml, { partHandler });
  }

  private musicXml: string;
  private partHandler: NodeHandler<'part'>;

  constructor(musicXml: string, opts: { partHandler: NodeHandler<'part'> }) {
    this.musicXml = musicXml;
    this.partHandler = opts.partHandler;
  }

  sendMessages(receiver: VexmlMessageReceiver): void {
    const partIterator = PartIterator.fromString(this.musicXml);
    while (partIterator.hasNext()) {
      const node = NamedNode.of(partIterator.next());
      if (node.isNamed('part')) {
        this.partHandler.sendMessages(receiver, { node });
      } else {
        throw new ProducerError(`unexpected node: ${node.name}`);
      }
    }
  }
}
