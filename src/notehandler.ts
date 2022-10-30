import * as msg from './msg';
import { NodeHandler, NodeHandlerCtx } from './nodehandler';
import { NoteMessageHead, VexmlConfig, VexmlMessageReceiver } from './types';

export class NoteHandler extends NodeHandler<'note'> {
  private config: VexmlConfig;

  constructor(opts: { config: VexmlConfig }) {
    super();

    this.config = opts.config;
  }

  sendMessages(receiver: VexmlMessageReceiver, ctx: NodeHandlerCtx<'note'>): void {
    const message = msg.note({
      stem: this.getStem(ctx),
      dots: this.getDots(ctx),
      head: this.getHead(ctx),
      grace: this.getGrace(ctx),
      graceSlash: this.getGraceSlash(ctx),
      duration: this.getDuration(ctx),
    });
    receiver.onMessage(message);
  }

  private getDuration(ctx: NodeHandlerCtx<'note'>): number {
    const textContent = ctx.node.asElement().getElementsByTagName('duration').item(0)?.textContent ?? '';
    const duration = parseInt(textContent, 10);
    if (isNaN(duration)) {
      return this.config.DEFAULT_NOTE_DURATION;
    }
    return duration;
  }

  private getStem(ctx: NodeHandlerCtx<'note'>): string | null {
    return ctx.node.asElement().getElementsByTagName('stem').item(0)?.textContent ?? this.config.DEFAULT_STEM_VALUE;
  }

  private getDots(ctx: NodeHandlerCtx<'note'>): number {
    return ctx.node.asElement().getElementsByTagName('dot').length;
  }

  private getHead(ctx: NodeHandlerCtx<'note'>): NoteMessageHead {
    if (this.isRest(ctx)) {
      return [];
    }
    const pitch = this.getPitch(ctx);
    const accidental = this.getAccidental(ctx);
    const accidentalCautionary = this.getAccidentalCautionary(ctx);
    const notehead = this.getNotehead(ctx);
    return [{ pitch, accidental, accidentalCautionary, notehead }];
  }

  private getGrace(ctx: NodeHandlerCtx<'note'>): boolean {
    return ctx.node.asElement().getElementsByTagName('grace').length > 0;
  }

  private getGraceSlash(ctx: NodeHandlerCtx<'note'>): boolean {
    return ctx.node.asElement().getElementsByTagName('grace').item(0)?.getAttribute('slash') === 'yes';
  }

  private getPitch(ctx: NodeHandlerCtx<'note'>): string {
    const step = this.getStep(ctx);
    const octave = this.getOctave(ctx);
    if (step && octave) {
      return `${step}/${octave}`;
    }
    return '';
  }

  private getStep(ctx: NodeHandlerCtx<'note'>): string {
    return ctx.node.asElement().getElementsByTagName('step').item(0)?.textContent ?? this.config.DEFAULT_STEP_VALUE;
  }

  private getOctave(ctx: NodeHandlerCtx<'note'>): string {
    return ctx.node.asElement().getElementsByTagName('octave').item(0)?.textContent ?? this.config.DEFAULT_OCTAVE_VALUE;
  }

  private getAccidental(ctx: NodeHandlerCtx<'note'>): string {
    return (
      ctx.node.asElement().getElementsByTagName('accidental').item(0)?.textContent ??
      this.config.DEFAULT_ACCIDENTAL_VALUE
    );
  }

  private getAccidentalCautionary(ctx: NodeHandlerCtx<'note'>): boolean {
    return (
      ctx.node.asElement().getElementsByTagName('accidental').item(0)?.getAttribute('cautionary') === 'yes' ??
      this.config.DEFAULT_ACCIDENTAL_CAUTIONARY
    );
  }

  private getNotehead(ctx: NodeHandlerCtx<'note'>): string {
    return (
      ctx.node.asElement().getElementsByTagName('notehead').item(0)?.textContent ?? this.config.DEFAULT_NOTEHEAD_VALUE
    );
  }

  private isRest(ctx: NodeHandlerCtx<'note'>): boolean {
    return ctx.node.asElement().getElementsByTagName('rest').length > 0;
  }
}
