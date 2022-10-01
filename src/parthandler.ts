import { MeasureHandler } from './measurehandler';
import { NamedNode } from './namednode';
import { NodeHandler } from './nodehandler';
import { VexmlMessageReceiver } from './types';

const DEFAULT_ID = 'NN';

export class PartHandlerError extends Error {}

/**
 * Produces vexml messages from <part> nodes.
 *
 * https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/part-partwise/
 */
export class PartHandler extends NodeHandler<'part'> {
  message(receiver: VexmlMessageReceiver): void {
    this.messageStart(receiver);
    this.messageContent(receiver);
    this.messageEnd(receiver);
  }

  private messageStart(receiver: VexmlMessageReceiver) {
    receiver.onMessage({
      msgType: 'partStart',
      msgIndex: 0,
      msgCount: 0,
      id: this.getId(),
    });
  }

  private messageContent(receiver: VexmlMessageReceiver) {
    const childNodes = this.node.asElement().childNodes;
    for (const childNode of childNodes) {
      const node = NamedNode.of(childNode);
      if (node.isNamed('measure')) {
        new MeasureHandler(node).message(receiver);
      } else {
        throw new PartHandlerError(`unhandled node: ${node.name}`);
      }
    }
  }

  private messageEnd(receiver: VexmlMessageReceiver) {
    receiver.onMessage({
      msgType: 'partEnd',
      msgIndex: 0,
      msgCount: 0,
      id: this.getId(),
    });
  }

  private getId(): string {
    const id = this.node.asElement().getAttribute('id');
    if (id) {
      return id;
    } else {
      return DEFAULT_ID;
    }
  }
}
