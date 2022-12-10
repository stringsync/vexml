import { VexmlMessageReceiver } from '../types';
import * as msg from '../util/msg';
import { NamedNode } from '../util/namednode';
import { NodeHandler, NodeHandlerCtx } from './nodehandler';

export class NotationsHandler extends NodeHandler<'notations'> {
  sendMessages(receiver: VexmlMessageReceiver, ctx: NodeHandlerCtx<'notations'>): void {
    const children = Array.from(ctx.node.asElement().children).map(NamedNode.of);
    for (const child of children) {
      const nodes =
        child.isNamed('articulations') || child.isNamed('ornaments') || child.isNamed('technical')
          ? Array.from(child.asElement().children).map(NamedNode.of)
          : [child];

      for (const node of nodes) {
        receiver.onMessage(
          msg.notation({
            name: this.getName(node),
            value: this.getValue(node),
            number: this.getNumber(node),
            type: this.getType(node),
            placement: this.getPlacement(node),
          })
        );
      }
    }
  }

  private getName(node: NamedNode<any>): string {
    return node.asElement().nodeName;
  }

  private getValue(node: NamedNode<any>): string {
    return node.asElement().textContent ?? '';
  }

  private getNumber(node: NamedNode<any>): number {
    return parseInt(node.asElement().getAttribute('number') ?? '1', 10);
  }

  private getType(node: NamedNode<any>): string | undefined {
    return node.asElement().getAttribute('type') ?? undefined;
  }

  private getPlacement(node: NamedNode<any>): string | undefined {
    return node.asElement().getAttribute('placement') ?? undefined;
  }
}
