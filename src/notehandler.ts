import * as msg from './msg';
import { NamedNode } from './namednode';
import { NodeHandler, NodeHandlerCtx } from './nodehandler';
import { NoteMessageHead, VexmlConfig, VexmlMessageReceiver } from './types';

export class NoteHandler extends NodeHandler<'note', NodeHandlerCtx<'note'>> {
  private config: VexmlConfig;
  private beamHandler: NodeHandler<'beam'>;
  private lyricHandler: NodeHandler<'lyric'>;
  private notationsHandler: NodeHandler<'notations'>;

  constructor(opts: {
    config: VexmlConfig;
    beamHandler: NodeHandler<'beam'>;
    lyricHandler: NodeHandler<'lyric'>;
    notationsHandler: NodeHandler<'notations'>;
  }) {
    super();

    this.config = opts.config;
    this.beamHandler = opts.beamHandler;
    this.lyricHandler = opts.lyricHandler;
    this.notationsHandler = opts.notationsHandler;
  }

  sendMessages(receiver: VexmlMessageReceiver, ctx: NodeHandlerCtx<'note'>): void {
    if (this.isChordTail(ctx)) {
      return;
    }

    receiver.onMessage(
      msg.note({
        stem: this.getStem(ctx),
        dots: this.getDots(ctx),
        head: this.getHead(ctx),
        duration: this.getDuration(ctx),
        grace: this.getGrace(ctx),
        graceSlash: this.getGraceSlash(ctx),
        arpeggiate: this.getArpeggiate(ctx),
        arpeggiateDirection: this.getArpeggiateDirection(ctx),
        type: this.getType(ctx),
        voice: this.getVoice(ctx),
        staff: this.getStaff(ctx),
      })
    );

    const notations = ctx.node.asElement().getElementsByTagName('notations').item(0);
    if (notations) {
      this.notationsHandler.sendMessages(receiver, { node: NamedNode.of(notations) });
    }

    const beam = ctx.node.asElement().getElementsByTagName('beam').item(0);
    if (beam) {
      this.beamHandler.sendMessages(receiver, { node: NamedNode.of(beam) });
    }

    const lyric = ctx.node.asElement().getElementsByTagName('lyric').item(0);
    if (lyric) {
      this.lyricHandler.sendMessages(receiver, { node: NamedNode.of(lyric) });
    }
  }

  private isChordHead(ctx: NodeHandlerCtx<'note'>) {
    const sibling = ctx.node.asElement().nextElementSibling;
    if (!sibling) {
      return false;
    }

    const node = NamedNode.of(sibling);
    if (!node.isNamed('note')) {
      return false;
    }

    return this.isChordTail({ node });
  }

  private isChordTail(ctx: NodeHandlerCtx<'note'>) {
    return ctx.node.asElement().getElementsByTagName('chord').length > 0;
  }

  private getChordTail(ctx: NodeHandlerCtx<'note'>): NamedNode<'note'>[] {
    const siblings = new Array<NamedNode<'note'>>();

    let sibling = ctx.node.asElement().nextElementSibling;
    while (sibling) {
      const node = NamedNode.of(sibling);
      if (node.isNamed('note') && this.isChordTail({ node })) {
        siblings.push(node);
      } else {
        break;
      }
      sibling = sibling.nextElementSibling;
    }

    return siblings;
  }

  private getStaff(ctx: NodeHandlerCtx<'note'>): number {
    return parseInt(ctx.node.asElement().getElementsByTagName('staff').item(0)?.textContent ?? '1', 10);
  }

  private getVoice(ctx: NodeHandlerCtx<'note'>): string | undefined {
    return ctx.node.asElement().getElementsByTagName('voice').item(0)?.textContent ?? '1';
  }

  private getArpeggiateDirection(ctx: NodeHandlerCtx<'note'>): string | undefined {
    return ctx.node.asElement().getElementsByTagName('arpeggiate').item(0)?.getAttribute('direction') ?? undefined;
  }

  private getArpeggiate(ctx: NodeHandlerCtx<'note'>): boolean {
    return ctx.node.asElement().getElementsByTagName('arpeggiate').length > 0;
  }

  private getType(ctx: NodeHandlerCtx<'note'>): string {
    return ctx.node.asElement().getElementsByTagName('type').item(0)?.textContent ?? 'whole';
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
    return ctx.node.asElement().getElementsByTagName('stem').item(0)?.textContent ?? null;
  }

  private getDots(ctx: NodeHandlerCtx<'note'>): number {
    return ctx.node.asElement().getElementsByTagName('dot').length;
  }

  private getHead(ctx: NodeHandlerCtx<'note'>): NoteMessageHead {
    const head: NoteMessageHead = [];

    if (this.isRest(ctx)) {
      return head;
    }

    head.push({
      pitch: this.getPitch(ctx),
      accidental: this.getAccidental(ctx),
      accidentalCautionary: this.getAccidentalCautionary(ctx),
      notehead: this.getNotehead(ctx),
    });

    if (this.isChordHead(ctx)) {
      for (const node of this.getChordTail(ctx)) {
        head.push({
          pitch: this.getPitch({ node }),
          accidental: this.getAccidental({ node }),
          accidentalCautionary: this.getAccidentalCautionary({ node }),
          notehead: this.getNotehead({ node }),
        });
      }
    }

    return head;
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
