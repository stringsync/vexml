import { VexmlMessageReceiver } from '../types';
import * as msg from '../util/msg';
import { NodeHandler, NodeHandlerCtx } from './nodehandler';

type Coda = Record<string, never>;
type Segno = Record<string, never>;

export class DirectionHandler extends NodeHandler<'direction'> {
  constructor() {
    super();
  }

  sendMessages(receiver: VexmlMessageReceiver, ctx: NodeHandlerCtx<'direction'>): void {
    receiver.onMessage(
      msg.direction({
        codas: this.getCodas(ctx),
        segnos: this.getSegnos(ctx),
      })
    );
  }

  getCodas(ctx: NodeHandlerCtx<'direction'>): Coda[] {
    const codas = new Array<Coda>();

    const elements = Array.from(ctx.node.asElement().getElementsByTagName('coda'));
    for (const coda of elements) {
      codas.push({});
    }
    return codas;
  }

  getSegnos(ctx: NodeHandlerCtx<'direction'>): Coda[] {
    const segnos = new Array<Segno>();

    const elements = Array.from(ctx.node.asElement().getElementsByTagName('segno'));
    for (const segno of elements) {
      segnos.push({});
    }
    return segnos;
  }
}
