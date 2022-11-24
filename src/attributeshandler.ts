import * as msg from './msg';
import { NodeHandler, NodeHandlerCtx } from './nodehandler';
import { VexmlConfig, VexmlMessageReceiver } from './types';

type Clef = {
  staff: number;
  sign: string;
  line?: number | undefined;
  octaveChange?: number | undefined;
};

export class AttributesHandler extends NodeHandler<'attributes'> {
  private config: VexmlConfig;

  constructor(opts: { config: VexmlConfig }) {
    super();

    this.config = opts.config;
  }

  sendMessages(receiver: VexmlMessageReceiver, ctx: NodeHandlerCtx<'attributes'>): void {
    const message = msg.attributes({
      clefs: this.getClefs(ctx),
      times: this.getTimes(ctx),
      keys: this.getKeys(ctx),
    });
    receiver.onMessage(message);
  }

  getClefs(ctx: NodeHandlerCtx<'attributes'>): Clef[] {
    const results = new Array<Clef>();

    const clefs = ctx.node.asElement().getElementsByTagName('clef');
    for (const clef of clefs) {
      const staff = clef.getAttribute('number');
      const sign = clef.getElementsByTagName('sign').item(0)?.textContent;
      const line = clef.getElementsByTagName('line').item(0)?.textContent;
      const octaveChange = clef.getElementsByTagName('clef-octave-change').item(0)?.textContent;

      results.push({
        staff: staff ? parseInt(staff, 10) : this.config.DEFAULT_STAFF_NUMBER,
        sign: sign ?? this.config.DEFAULT_CLEF_SIGN,
        line: line ? parseInt(line, 10) : this.config.DEFAULT_STAFF_LINE,
        octaveChange: octaveChange ? parseInt(octaveChange, 10) : undefined,
      });
    }

    return results;
  }

  getTimes(ctx: NodeHandlerCtx<'attributes'>): { staff?: number | undefined; signature: string }[] | undefined {
    throw new Error('Method not implemented.');
  }

  getKeys(ctx: NodeHandlerCtx<'attributes'>): { staff?: number | undefined; fifths: number }[] | undefined {
    throw new Error('Method not implemented.');
  }
}
