import { NodeHandler, NodeHandlerCtx } from './nodehandler';
import { VexmlMessageReceiver } from './types';

export class NoteHandler extends NodeHandler<'note'> {
  sendMessages(receiver: VexmlMessageReceiver, ctx: NodeHandlerCtx<'note'>): void {}

  getRest(ctx: NodeHandlerCtx<'note'>): boolean {
    return false;
  }

  getGrace(ctx: NodeHandlerCtx<'note'>): boolean {
    return false;
  }

  getGraceSlash(ctx: NodeHandlerCtx<'note'>): boolean {
    return false;
  }

  getStep(ctx: NodeHandlerCtx<'step'>): string {
    return '';
  }

  getOctave(ctx: NodeHandlerCtx<'note'>): string {
    return '';
  }

  getStem(ctx: NodeHandlerCtx<'note'>): string {
    return '';
  }
}
