import * as msg from './msg';
import { NodeHandler, NodeHandlerCtx } from './nodehandler';
import { VexmlMessageReceiver } from './types';

export class NoteHandler extends NodeHandler<'note'> {
  sendMessages(receiver: VexmlMessageReceiver, ctx: NodeHandlerCtx<'note'>): void {
    const message = msg.note({
      stem: this.getStem(ctx),
    });
    receiver.onMessage(message);
  }

  private getStem(ctx: NodeHandlerCtx<'note'>): string | null {
    return ctx.node.asElement().getElementsByTagName('stem').item(0)?.textContent ?? null;
  }

  private getDots(ctx: NodeHandlerCtx<'note'>): number {
    return ctx.node.asElement().getElementsByTagName('dot').length;
  }

  private getRest(ctx: NodeHandlerCtx<'note'>): boolean {
    return ctx.node.asElement().getElementsByTagName('rest').length > 0;
  }

  private getGrace(ctx: NodeHandlerCtx<'note'>): boolean {
    return ctx.node.asElement().getElementsByTagName('grace').length > 0;
  }

  private getGraceSlash(ctx: NodeHandlerCtx<'note'>): boolean {
    return ctx.node.asElement().getElementsByTagName('grace').item(0)?.getAttribute('slash') == 'yes';
  }

  private getStep(ctx: NodeHandlerCtx<'step'>): string {
    return ctx.node.asElement().getElementsByTagName('step').item(0)?.textContent ?? '';
  }

  private getOctave(ctx: NodeHandlerCtx<'note'>): string {
    return ctx.node.asElement().getElementsByTagName('octave').item(0)?.textContent ?? '';
  }
}
