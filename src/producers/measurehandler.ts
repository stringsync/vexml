import { MultiReceiver } from '../receivers/multireceiver';
import { VexmlConfig, VexmlMessageReceiver } from '../types';
import * as msg from '../util/msg';
import { NamedNode } from '../util/namednode';
import { NodeHandler, NodeHandlerCtx } from './nodehandler';

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
    let voice: string | null = null;
    receiver = MultiReceiver.of(
      {
        onMessage: (message) => {
          if (message.msgType !== 'note') {
            return;
          }

          const nextVoice = message.voice;
          if (!voice && nextVoice) {
            receiver.onMessage(msg.voiceStart({ voice: nextVoice }));
          } else if (voice && voice !== nextVoice) {
            receiver.onMessage(msg.voiceEnd({ voice }));
            receiver.onMessage(msg.voiceStart({ voice: nextVoice }));
          }
          voice = nextVoice;
        },
      },
      receiver
    );

    receiver.onMessage(
      msg.measureStart({
        width: this.getWidth(ctx),
        staves: this.getStaves(ctx),
      })
    );

    const children = Array.from(ctx.node.asElement().children);
    for (const child of children) {
      const node = NamedNode.of(child);
      if (node.isNamed('note')) {
        this.noteHandler.sendMessages(receiver, { node });
      } else if (node.isNamed('attributes')) {
        this.attributesHandler.sendMessages(receiver, { node });
      } else if (node.isNamed('barline')) {
        this.barlineHandler.sendMessages(receiver, { node });
      } else if (node.isNamed('staves')) {
        continue;
      } else if (node.isNamed('backup')) {
        continue;
      } else if (node.isNamed('direction')) {
        continue;
      } else if (node.isNamed('grouping')) {
        continue;
      } else if (node.isNamed('harmony')) {
        continue;
      } else if (node.isNamed('figured-bass')) {
        continue;
      } else if (node.isNamed('print')) {
        continue;
      } else {
        throw new MeasureHandlerError(`unhandled node: ${node.name}`);
      }
    }

    if (voice) {
      receiver.onMessage(msg.voiceEnd({ voice }));
    }

    receiver.onMessage(msg.measureEnd());
  }

  private getWidth(ctx: NodeHandlerCtx<'measure'>): number | undefined {
    const width = ctx.node.asElement().getAttribute('width');
    if (width) {
      const result = parseInt(width, 10);
      return isNaN(result) ? undefined : result;
    } else {
      return undefined;
    }
  }

  private getStaves(ctx: NodeHandlerCtx<'measure'>): number | undefined {
    const staves = ctx.node.asElement().getElementsByTagName('staves').item(0)?.textContent;
    if (staves) {
      const result = parseInt(staves, 10);
      return isNaN(result) ? undefined : result;
    } else {
      return undefined;
    }
  }
}
