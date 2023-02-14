import { ClefMessage, ClefSign, KeyMessage, TimeMessage, VexmlConfig, VexmlMessageReceiver } from '../types';
import * as msg from '../util/msg';
import { NodeHandler, NodeHandlerCtx } from './nodehandler';

export class AttributesHandler extends NodeHandler<'attributes'> {
  private config: VexmlConfig;

  constructor(opts: { config: VexmlConfig }) {
    super();

    this.config = opts.config;
  }

  sendMessages(receiver: VexmlMessageReceiver, ctx: NodeHandlerCtx<'attributes'>): void {
    const legacyAttributes = msg.legacyAttributes({
      clefs: this.getClefMessages(ctx),
      times: this.getTimeMessages(ctx),
      keys: this.getKeyMessages(ctx),
    });

    for (const clef of legacyAttributes.clefs) {
      receiver.onMessage(clef);
    }
    for (const time of legacyAttributes.times) {
      receiver.onMessage(time);
    }
    for (const key of legacyAttributes.keys) {
      receiver.onMessage(key);
    }

    receiver.onMessage(legacyAttributes);
  }

  private getClefMessages(ctx: NodeHandlerCtx<'attributes'>): ClefMessage[] {
    const clefs = new Array<ClefMessage>();

    const elements = Array.from(ctx.node.asElement().getElementsByTagName('clef'));
    for (const clef of elements) {
      const staff = clef.getAttribute('number');
      const sign = clef.getElementsByTagName('sign').item(0)?.textContent;
      const line = clef.getElementsByTagName('line').item(0)?.textContent;
      const octaveChange = clef.getElementsByTagName('clef-octave-change').item(0)?.textContent;

      clefs.push(
        msg.clef({
          staff: staff ? parseInt(staff, 10) : null,
          sign: this.isClefSign(sign) ? sign : this.config.DEFAULT_CLEF_SIGN,
          line: line ? parseInt(line, 10) : this.config.DEFAULT_STAFF_LINE,
          octaveChange: octaveChange ? parseInt(octaveChange, 10) : null,
        })
      );
    }

    return clefs;
  }

  private isClefSign(str: any): str is ClefSign {
    return ['G', 'F', 'C', 'percussion', 'TAB', 'jianpu', 'none'].includes(str);
  }

  private getTimeMessages(ctx: NodeHandlerCtx<'attributes'>): TimeMessage[] {
    const times = new Array<TimeMessage>();

    const elements = Array.from(ctx.node.asElement().getElementsByTagName('time'));
    for (const time of elements) {
      const staff = time.getAttribute('number');
      const beats = time.getElementsByTagName('beats').item(0)?.textContent;
      const beatType = time.getElementsByTagName('beat-type').item(0)?.textContent;

      times.push(
        msg.time({
          staff: staff ? parseInt(staff, 10) : null,
          beats: beats ? parseInt(beats, 10) : this.config.DEFAULT_BEATS,
          beatType: beatType ? parseInt(beatType, 10) : this.config.DEFAULT_BEAT_TYPE,
        })
      );
    }

    return times;
  }

  private getKeyMessages(ctx: NodeHandlerCtx<'attributes'>): KeyMessage[] {
    const keys = new Array<KeyMessage>();

    const elements = Array.from(ctx.node.asElement().getElementsByTagName('key'));
    for (const key of elements) {
      const staff = key.getAttribute('number');
      const fifths = key.getElementsByTagName('fifths').item(0)?.textContent;

      keys.push(
        msg.key({
          staff: staff ? parseInt(staff, 10) : null,
          fifths: fifths ? parseInt(fifths, 10) : this.config.DEFAULT_FIFTHS,
        })
      );
    }

    return keys;
  }
}
