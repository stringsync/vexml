import * as vexflow from 'vexflow';
import { Logger } from '../debug';
import { Config } from './config';
import { Document } from './document';
import { Rect } from '@/spatial';
import { FragmentKey, FragmentRender, StaveRender } from './types';
import { NoopRenderContext } from './nooprenderctx';

export class Ensemble {
  private vexflowFormatter = new vexflow.Formatter();

  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private key: FragmentKey,
    private fragmentRender: FragmentRender
  ) {}

  /** Formats the ensemble, updating the rects and vexflow objects in place. */
  format(x: number, width: number | null, paddingLeft: number, paddingRight: number): void {
    // Calculate the non-voice width.
    const nonVoiceWidth =
      vexflow.Stave.defaultPadding +
      this.getStartClefWidth() +
      this.getEndClefWidth() +
      this.getKeyWidth() +
      this.getTimeWidth();

    // Calculate stave width.
    const staveWidth = (width ?? this.getVoiceWidth() + nonVoiceWidth) - paddingLeft - paddingRight;

    // Set the width on the vexflow staves.
    const vexflowStaves = this.getStaveRenders().map((s) => s.vexflowStave);
    for (const vexflowStave of vexflowStaves) {
      vexflowStave.setWidth(staveWidth);
    }

    // Join the voices that belong on the _same stave_.
    for (const staveRender of this.getStaveRenders()) {
      const vexflowVoices = staveRender.voiceRenders
        .map((v) => v.vexflowVoice)
        .filter((v) => v.getTickables().length > 0);
      if (vexflowVoices.length > 0) {
        this.vexflowFormatter.joinVoices(vexflowVoices);
      }
    }

    // Format _all_ the voices. The voice width must be smaller than the stave or the stave won't contain it.
    const vexflowVoices = this.getStaveRenders()
      .flatMap((s) => s.voiceRenders)
      .map((v) => v.vexflowVoice)
      .filter((v) => v.getTickables().length > 0);
    const voiceWidth = staveWidth - nonVoiceWidth;
    if (vexflowVoices.length > 0) {
      this.vexflowFormatter.format(vexflowVoices, voiceWidth);
    }

    // At this point, we can call getBoundingBox() on everything, but vexflow does some extra formatting in draw() that
    // mutates the objects. Before we set the rects, we need to draw the staves to a noop context, then unset the
    // context and rendered state.
    const ctx = new NoopRenderContext();
    for (const staveRender of this.getStaveRenders()) {
      staveRender.vexflowStave.setContext(ctx).draw();
      staveRender.vexflowStave.setRendered(false);

      for (const voiceRender of staveRender.voiceRenders) {
        voiceRender.vexflowVoice.setContext(ctx).draw();
        voiceRender.vexflowVoice.setRendered(false);

        for (const entry of voiceRender.entryRenders) {
          entry.vexflowTickable.setContext(ctx).draw();
          entry.vexflowTickable.setRendered(false);
        }
      }
    }

    // At this point, we should be able to call getBoundingBox() on all of the vexflow objects. We can now update the
    // rects accordingly.
    let excessHeight = 0;
    for (const partRender of this.fragmentRender.partRenders) {
      for (const staveRender of partRender.staveRenders) {
        for (const voiceRender of staveRender.voiceRenders) {
          for (const entryRender of voiceRender.entryRenders) {
            entryRender.rect = Rect.fromRectLike(entryRender.vexflowTickable.getBoundingBox());
          }
          voiceRender.rect = Rect.merge(voiceRender.entryRenders.map((e) => e.rect));
        }
        staveRender.rect = this.getStaveRect(staveRender, x, paddingLeft, paddingRight);
        staveRender.intrinsicRect = this.getStaveIntrinsicRect(staveRender);
        excessHeight = Math.max(excessHeight, this.getExcessHeight(staveRender));
      }
      partRender.rect = Rect.merge(partRender.staveRenders.map((s) => s.rect));
    }

    this.fragmentRender.rect = Rect.merge(this.fragmentRender.partRenders.map((s) => s.rect));
    this.fragmentRender.excessHeight = excessHeight;
  }

  private getStaveRenders(): StaveRender[] {
    return this.fragmentRender.partRenders.flatMap((p) => p.staveRenders);
  }

  private getStartClefWidth(): number {
    const widths = this.getStaveRenders()
      .map((s) => s.startClefRender)
      .filter((c) => c !== null)
      .map((c) => c.width);
    if (widths.length > 0) {
      return Math.max(...widths);
    }
    return 0;
  }

  private getEndClefWidth(): number {
    const widths = this.getStaveRenders()
      .map((s) => s.endClefRender)
      .filter((c) => c !== null)
      .map((c) => c.width);
    if (widths.length > 0) {
      return Math.max(...widths);
    }
    return 0;
  }

  private getTimeWidth(): number {
    const widths = this.getStaveRenders()
      .map((s) => s.timeRender)
      .filter((t) => t !== null)
      .flatMap((t) => t.width);
    if (widths.length > 0) {
      return Math.max(...widths);
    }
    return 0;
  }

  private getKeyWidth(): number {
    const widths = this.getStaveRenders()
      .map((s) => s.keyRender)
      .filter((k) => k !== null)
      .map((k) => k.width);
    if (widths.length > 0) {
      return Math.max(...widths);
    }
    return 0;
  }

  private getVoiceWidth(): number {
    const multiRestCount = this.document.getMeasureMultiRestCount(this.key);
    if (multiRestCount > 0) {
      return this.getMultiRestStaveWidth();
    }
    return this.getMinRequiredStaveWidth();
  }

  private getMultiRestStaveWidth(): number {
    return this.config.BASE_MULTI_REST_MEASURE_WIDTH;
  }

  private getMinRequiredStaveWidth(): number {
    return this.config.BASE_VOICE_WIDTH + this.getMinRequiredVoiceWidth();
  }

  private getMinRequiredVoiceWidth(): number {
    const widths = this.getStaveRenders().map((s) => {
      const vexflowVoices = s.voiceRenders.map((v) => v.vexflowVoice).filter((v) => v.getTickables().length > 0);
      if (vexflowVoices.length === 0) {
        return 0;
      } else {
        return new vexflow.Formatter().joinVoices(vexflowVoices).preCalculateMinTotalWidth(vexflowVoices);
      }
    });
    if (widths.length > 0) {
      return Math.max(...widths);
    }
    return 0;
  }

  private getStaveRect(staveRender: StaveRender, x: number, paddingLeft: number, paddingRight: number): Rect {
    const vexflowStave = staveRender.vexflowStave;

    const box = vexflowStave.getBoundingBox();

    const y = box.y;
    const w = box.w + paddingLeft + paddingRight;
    const h = box.h;

    const voiceRects = staveRender.voiceRenders.map((v) => v.rect);

    return Rect.merge([new Rect(x, y, w, h), ...voiceRects]);
  }

  /**
   * Returns the rect of the stave itself, ignoring any influence by child elements such as notes.
   */
  private getStaveIntrinsicRect(staveRender: StaveRender): Rect {
    const vexflowStave = staveRender.vexflowStave;

    const box = vexflowStave.getBoundingBox();
    const topLineY = vexflowStave.getTopLineTopY();
    const bottomLineY = vexflowStave.getBottomLineBottomY();

    const x = box.x;
    const y = topLineY;
    const w = box.w;
    const h = bottomLineY - topLineY;

    return new Rect(x, y, w, h);
  }

  /**
   * Returns how much height the voice exceeded the normal vexflow.Stave (not EnsembleStave) boundaries. Callers may
   * need to account for this when positioning the system that this ensemble belongs to.
   */
  private getExcessHeight(staveRender: StaveRender): number {
    if (staveRender.voiceRenders.length === 0) {
      return 0;
    }
    const highestY = Math.min(...staveRender.voiceRenders.map((v) => v.rect.y));
    const vexflowStaveY = staveRender.vexflowStave.getBoundingBox().y;
    return Math.max(0, vexflowStaveY - highestY);
  }
}
