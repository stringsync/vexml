import * as msg from './msg';
import { NodeHandler, NodeHandlerCtx } from './nodehandler';
import { VexmlConfig, VexmlMessageReceiver } from './types';

type Clef = {
  staff: number;
  sign: string;
  line?: number | undefined;
  octaveChange?: number | undefined;
};

type Time = {
  staff?: number | undefined;
  signature: string;
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
    const clefs = new Array<Clef>();

    const elements = ctx.node.asElement().getElementsByTagName('clef');
    for (const clef of elements) {
      const staff = clef.getAttribute('number');
      const sign = clef.getElementsByTagName('sign').item(0)?.textContent;
      const line = clef.getElementsByTagName('line').item(0)?.textContent;
      const octaveChange = clef.getElementsByTagName('clef-octave-change').item(0)?.textContent;

      clefs.push({
        staff: staff ? parseInt(staff, 10) : this.config.DEFAULT_STAFF_NUMBER,
        sign: sign ?? this.config.DEFAULT_CLEF_SIGN,
        line: line ? parseInt(line, 10) : this.config.DEFAULT_STAFF_LINE,
        octaveChange: octaveChange ? parseInt(octaveChange, 10) : undefined,
      });
    }

    return clefs;
  }

  getTimes(ctx: NodeHandlerCtx<'attributes'>): Time[] {
    const times = new Array<Time>();

    const elements = ctx.node.asElement().getElementsByTagName('key');
    for (const key of elements) {
      const staff = key.getAttribute('number');
      const beats = key.getElementsByTagName('beats').item(0)?.textContent ?? this.config.DEFAULT_BEATS;
      const beatType = key.getElementsByTagName('beat-type').item(0)?.textContent ?? this.config.DEFAULT_BEAT_TYPE;

      times.push({
        staff: staff ? parseInt(staff, 10) : undefined,
        signature: `${beats}/${beatType}`,
      });
    }

    return times;
  }

  getKeys(ctx: NodeHandlerCtx<'attributes'>): { staff?: number | undefined; fifths: number }[] | undefined {
    throw new Error('Method not implemented.');
  }
}
