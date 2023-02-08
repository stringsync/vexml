import * as di from '../di';
import { VexmlMessageProducer, VexmlMessageReceiver } from '../types';
import * as msg from '../util/msg';
import { NamedNode } from '../util/namednode';
import { PartIterator } from '../util/partiterator';
import { NodeHandler } from './nodehandler';

export class ProducerError extends Error {}

export class Producer implements VexmlMessageProducer {
  static feed(musicXml: string): Producer {
    const { measureHandler } = di.createContainer();
    return new Producer(musicXml, { measureHandler });
  }

  private musicXml: string;
  private measureHandler: NodeHandler<'measure'>;

  constructor(musicXml: string, opts: { measureHandler: NodeHandler<'measure'> }) {
    this.musicXml = musicXml;
    this.measureHandler = opts.measureHandler;
  }

  sendMessages(receiver: VexmlMessageReceiver): void {
    const partIterator = PartIterator.fromString(this.musicXml);
    const nodes: NamedNode<string>[] = [];
    while (partIterator.hasNext()) {
      const node = NamedNode.of(partIterator.next());
      if (node.isNamed('part')) {
        nodes.push(node);
      } else {
        throw new ProducerError(`unexpected node: ${node.name}`);
      }
    }
    for (let mNdx = 0; mNdx < nodes[0].asElement().children.length; mNdx++) {
      for (let pNdx = 0; pNdx < nodes.length; pNdx++) {
        receiver.onMessage(
          msg.partStart({
            id: nodes[pNdx].asElement().getAttribute('id') ?? 'NN',
            msgCount: nodes.length,
            msgIndex: pNdx,
          })
        );

        const children = Array.from(nodes[pNdx].asElement().children);
        const node = NamedNode.of(children[mNdx]);
        if (node.isNamed('measure')) {
          this.measureHandler.sendMessages(receiver, { node });
        } else {
          throw new ProducerError(`unhandled node: ${node.name}`);
        }

        receiver.onMessage(
          msg.partEnd({
            id: nodes[pNdx].asElement().getAttribute('id') ?? 'NN',
            msgCount: nodes.length,
            msgIndex: pNdx,
          })
        );
      }
    }
  }
}
