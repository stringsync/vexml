import * as msg from './msg';
import { NamedNode } from './namednode';
import { NodeHandler, NodeHandlerCtx } from './nodehandler';
import { VexmlConfig, VexmlMessageReceiver } from './types';

export class MeasureHandlerError extends Error {}

/**
 * Produces vexml messages from <measure> nodes.
 *
 * https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/measure-partwise/
 */
export class MeasureHandler extends NodeHandler<'measure'> {
  private config: VexmlConfig;
  private noteHandler: NodeHandler<'note'>;
  private attributesHandler: NodeHandler<'attributes'>;
  private barlineHandler: NodeHandler<'barline'>;

  constructor(opts: {
    config: VexmlConfig;
    noteHandler: NodeHandler<'note'>;
    attributesHandler: NodeHandler<'attributes'>;
    barlineHandler: NodeHandler<'barline'>;
  }) {
    super();

    this.config = opts.config;
    this.noteHandler = opts.noteHandler;
    this.attributesHandler = opts.attributesHandler;
    this.barlineHandler = opts.barlineHandler;
  }

  sendMessages(receiver: VexmlMessageReceiver, ctx: NodeHandlerCtx<'measure'>): void {
    this.sendStartMessage(receiver, ctx);
    this.sendContentMessages(receiver, ctx);
    this.sendEndMessage(receiver);
  }

  private sendStartMessage(receiver: VexmlMessageReceiver, ctx: NodeHandlerCtx<'measure'>): void {
    const message = msg.measureStart({
      width: this.getWidth(ctx),
      staves: this.getStaves(ctx),
    });
    receiver.onMessage(message);
  }

  private sendContentMessages(receiver: VexmlMessageReceiver, ctx: NodeHandlerCtx<'measure'>): void {
    const childNodes = ctx.node.asElement().childNodes;
    for (const childNode of childNodes) {
      const node = NamedNode.of(childNode);
      if (node.isNamed('note')) {
        this.noteHandler.sendMessages(receiver, { node });
      } else if (node.isNamed('attributes')) {
        this.attributesHandler.sendMessages(receiver, { node });
      } else if (node.isNamed('barline')) {
        this.barlineHandler.sendMessages(receiver, { node });
      } else if (node.isNamed('staves')) {
        continue;
      } else {
        throw new MeasureHandlerError(`unhandled node: ${node.name}`);
      }
    }
  }

  private sendEndMessage(receiver: VexmlMessageReceiver): void {
    const message = msg.measureEnd();
    receiver.onMessage(message);
  }

  private getWidth(ctx: NodeHandlerCtx<'measure'>): number {
    const width = ctx.node.asElement().getAttribute('width');
    if (width) {
      const result = parseInt(width, 10);
      return isNaN(result) ? this.config.DEFAULT_MEASURE_WIDTH_PX : result;
    } else {
      return this.config.DEFAULT_MEASURE_WIDTH_PX;
    }
  }

  private getStaves(ctx: NodeHandlerCtx<'measure'>): number {
    const staves = ctx.node.asElement().getElementsByTagName('staves').item(0)?.textContent;
    if (staves) {
      const result = parseInt(staves, 10);
      return isNaN(result) ? this.config.DEFAULT_MEASURE_NUM_STAVES : result;
    } else {
      return this.config.DEFAULT_MEASURE_NUM_STAVES;
    }
  }
}
