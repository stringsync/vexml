import * as msg from '../msg';
import { VexmlConfig, VexmlMessageReceiver } from '../types';
import { NodeHandler, NodeHandlerCtx } from './nodehandler';

export class LyricHandler extends NodeHandler<'lyric'> {
  private config: VexmlConfig;

  constructor(opts: { config: VexmlConfig }) {
    super();

    this.config = opts.config;
  }

  sendMessages(receiver: VexmlMessageReceiver, ctx: NodeHandlerCtx<'lyric'>): void {
    receiver.onMessage(
      msg.lyric({
        text: this.getText(ctx),
        syllabic: this.getSyllabic(ctx),
      })
    );
  }

  getSyllabic(ctx: NodeHandlerCtx<'lyric'>): string {
    return ctx.node.asElement().getElementsByTagName('syllabic').item(0)?.textContent ?? this.config.DEFAULT_SYLLABIC;
  }

  getText(ctx: NodeHandlerCtx<'lyric'>): string {
    return ctx.node.asElement().getElementsByTagName('text').item(0)?.textContent ?? '';
  }
}
