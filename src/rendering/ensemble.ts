import * as vexflow from 'vexflow';
import * as util from '@/util';
import { Logger } from '../debug';
import { Config } from '@/config';
import { Document } from './document';
import { Rect } from '@/spatial';
import { FragmentKey, FragmentRender, StaveRender, VoiceEntryRender, VoiceRender } from './types';
import { NoopRenderContext } from './nooprenderctx';

const CURVE_EXTRA_WIDTH = 20;
const TUPLET_EXTRA_WIDTH = 15;
const TAB_RECT_WIDTH = 10;

// These modifiers cause the bounding box of the vexflow stave note to be incorrect. We filter them out when calculating
// the bounding box of the vexflow StaveNote. Remove each member when they are fixed upstream.
const PROBLEMATIC_VEXFLOW_MODIFIERS = [vexflow.Bend, vexflow.Stroke];

export type EnsembleFormatParams = {
  x: number;
  width: number | null;
  paddingLeft: number;
  paddingRight: number;
  cache: FragmentRender | null;
};

export class Ensemble {
  constructor(private config: Config, private log: Logger, private document: Document, private key: FragmentKey) {}

  /** Formats the ensemble, updating the rects and vexflow objects in place. */
  format(fragmentRender: FragmentRender, { x, width, paddingLeft, paddingRight, cache }: EnsembleFormatParams): void {
    util.assert(fragmentRender.rectSrc === 'none', 'expected fragment render to be unformatted');

    const vexflowFormatter = new vexflow.Formatter();

    // Explode out the components of the ensemble.
    const staveRenders = fragmentRender.partRenders.flatMap((p) => p.staveRenders);
    const vexflowStaves = staveRenders.map((s) => s.vexflowStave);
    const voiceRenders = staveRenders.flatMap((s) => s.voiceRenders);
    const vexflowVoices = voiceRenders.flatMap((v) => v.vexflowVoices).filter((v) => v.getTickables().length > 0);
    const entryRenders = voiceRenders.flatMap((v) => v.entryRenders);

    if (staveRenders.length === 0) {
      return;
    }

    // Calculate the non-voice width.
    const nonVoiceWidth =
      vexflow.Stave.defaultPadding +
      this.getStartClefWidth(staveRenders) +
      this.getEndClefWidth(staveRenders) +
      this.getKeyWidth(staveRenders) +
      this.getTimeWidth(staveRenders);

    // Align the starting notes of each stave to the same x position.
    const maxNoteStartX = Math.max(...vexflowStaves.map((v) => v.getNoteStartX()));
    const noteStartOffsetXes = vexflowStaves.map((v) => maxNoteStartX - v.getNoteStartX());

    // Calculate stave width.
    let staveWidth: number;
    if (width) {
      staveWidth = width;
    } else {
      staveWidth = this.getVoiceWidth(noteStartOffsetXes, staveRenders, voiceRenders, entryRenders) + nonVoiceWidth;
    }
    staveWidth -= paddingLeft;
    staveWidth -= paddingRight;

    // Set the width on the vexflow staves.
    for (const vexflowStave of vexflowStaves) {
      vexflowStave.setWidth(staveWidth);
      vexflowStave.setNoteStartX(maxNoteStartX);
    }

    // Assign each voice to a stave.
    for (const staveRender of staveRenders) {
      const staveVexflowVoices = staveRender.voiceRenders
        .flatMap((v) => v.vexflowVoices)
        .filter((v) => v.getTickables().length > 0);
      if (staveVexflowVoices.length > 0) {
        vexflowFormatter.joinVoices(staveVexflowVoices);
      }
    }

    // Format _all_ the voices. The voice width must be smaller than the stave or the stave won't contain it.
    const voiceWidth = staveWidth - nonVoiceWidth;
    if (vexflowVoices.length > 0) {
      vexflowFormatter.format(vexflowVoices, voiceWidth, { autoBeam: true });
    }

    // Populate the rects by either using the cache or drawing.
    if (cache) {
      this.hydrate(fragmentRender, cache);
    } else {
      this.draw(fragmentRender, { x, paddingLeft, paddingRight });
    }
  }

  private draw(
    fragmentRender: FragmentRender,
    { x, paddingLeft, paddingRight }: { x: number; paddingLeft: number; paddingRight: number }
  ): void {
    fragmentRender.rectSrc = 'draw';

    const vexflowVoices = fragmentRender.partRenders
      .flatMap((p) => p.staveRenders)
      .flatMap((s) => s.voiceRenders)
      .flatMap((v) => v.vexflowVoices)
      .filter((v) => v.getTickables().length > 0);

    // At this point, we can call getBoundingBox() on everything, but vexflow does some extra formatting in draw() that
    // mutates the objects. Before we set the rects, we need to draw the staves to a noop context, then unset the
    // context and rendered state.
    const ctx = new NoopRenderContext();
    for (const vexflowVoice of vexflowVoices) {
      vexflowVoice.setContext(ctx).draw();
      vexflowVoice.setRendered(false);
    }

    // At this point, we should be able to call getBoundingBox() on all of the vexflow objects. We can now update the
    // rects accordingly.
    let excessHeight = 0;

    for (const partRender of fragmentRender.partRenders) {
      for (const staveRender of partRender.staveRenders) {
        for (const voiceRender of staveRender.voiceRenders) {
          for (const entryRender of voiceRender.entryRenders) {
            entryRender.rect = this.hackEntryRenderRect(entryRender, staveRender);
          }
          voiceRender.rect = Rect.merge(voiceRender.entryRenders.map((e) => e.rect));
        }
        staveRender.rect = this.overrideVexflowStaveRect(staveRender, x, paddingLeft, paddingRight);
        staveRender.intrinsicRect = this.calculateStaveIntrinsicRect(staveRender);
        staveRender.excessHeight = this.getExcessHeight(staveRender);
        excessHeight = Math.max(excessHeight, staveRender.excessHeight);
      }
      partRender.rect = Rect.merge(partRender.staveRenders.map((s) => s.rect));
    }

    fragmentRender.rect = Rect.merge(fragmentRender.partRenders.map((s) => s.rect));
    fragmentRender.excessHeight = excessHeight;
  }

  private hydrate(fragmentRender: FragmentRender, cache: FragmentRender): void {
    util.assert(cache.rectSrc === 'draw', 'expected cache fragment to be from draw');

    fragmentRender.rectSrc = 'cache';

    fragmentRender.rect = cache.rect;
    fragmentRender.excessHeight = cache.excessHeight;

    for (let partIndex = 0; partIndex < fragmentRender.partRenders.length; partIndex++) {
      const partRender = fragmentRender.partRenders[partIndex];
      const cachePartRender = cache.partRenders[partIndex];

      partRender.rect = cachePartRender.rect;

      for (let staveIndex = 0; staveIndex < partRender.staveRenders.length; staveIndex++) {
        const staveRender = partRender.staveRenders[staveIndex];
        const cacheStaveRender = cachePartRender.staveRenders[staveIndex];

        staveRender.rect = cacheStaveRender.rect;
        staveRender.intrinsicRect = cacheStaveRender.intrinsicRect;
        staveRender.excessHeight = cacheStaveRender.excessHeight;

        for (let voiceIndex = 0; voiceIndex < staveRender.voiceRenders.length; voiceIndex++) {
          const voiceRender = staveRender.voiceRenders[voiceIndex];
          const cacheVoiceRender = cacheStaveRender.voiceRenders[voiceIndex];

          voiceRender.rect = cacheVoiceRender.rect;

          for (let entryIndex = 0; entryIndex < voiceRender.entryRenders.length; entryIndex++) {
            const entryRender = voiceRender.entryRenders[entryIndex];
            const cacheEntryRender = cacheVoiceRender.entryRenders[entryIndex];

            entryRender.rect = cacheEntryRender.rect;
          }
        }
      }
    }
  }

  /** Returns extra width to accommodate curves */
  private getCurveExtraWidth(entryRenders: VoiceEntryRender[]): number {
    const curveCount = util.unique(entryRenders.filter((e) => e.type === 'note').flatMap((n) => n.curveIds)).length;
    if (curveCount <= 1) {
      return 0;
    }
    return curveCount * CURVE_EXTRA_WIDTH;
  }

  private getTupletExtraWidth(voiceRenders: VoiceRender[]): number {
    const tupletCount = voiceRenders.flatMap((v) => v.tupletRenders).length;
    return tupletCount * TUPLET_EXTRA_WIDTH;
  }

  private getStartClefWidth(staveRenders: StaveRender[]): number {
    const widths = staveRenders
      .map((s) => s.startClefRender)
      .filter((c) => c !== null)
      .map((c) => c.width);
    if (widths.length > 0) {
      return Math.max(...widths);
    }
    return 0;
  }

  private getEndClefWidth(staveRenders: StaveRender[]): number {
    const widths = staveRenders
      .map((s) => s.endClefRender)
      .filter((c) => c !== null)
      .map((c) => c.width);
    if (widths.length > 0) {
      return Math.max(...widths);
    }
    return 0;
  }

  private getTimeWidth(staveRenders: StaveRender[]): number {
    const widths = staveRenders
      .map((s) => s.timeRender)
      .filter((t) => t !== null)
      .flatMap((t) => t.width);
    if (widths.length > 0) {
      return Math.max(...widths);
    }
    return 0;
  }

  private getKeyWidth(staveRenders: StaveRender[]): number {
    const widths = staveRenders
      .map((s) => s.keyRender)
      .filter((k) => k !== null)
      .map((k) => k.width);
    if (widths.length > 0) {
      return Math.max(...widths);
    }
    return 0;
  }

  private getVoiceWidth(
    noteStartOffsetXes: number[],
    staveRenders: StaveRender[],
    voiceRenders: VoiceRender[],
    entryRenders: VoiceEntryRender[]
  ): number {
    let width = 0;

    const multiRestCount = this.document.getMeasureMultiRestCount(this.key);
    if (multiRestCount > 0) {
      width += this.getMultiRestStaveWidth();
    } else {
      width += this.getMinRequiredStaveWidth(noteStartOffsetXes, staveRenders);
    }

    width += this.getTupletExtraWidth(voiceRenders);
    width += this.getCurveExtraWidth(entryRenders);

    return width;
  }

  private getMultiRestStaveWidth(): number {
    return this.config.BASE_MULTI_REST_MEASURE_WIDTH;
  }

  private getMinRequiredStaveWidth(noteStartOffsetXes: number[], staveRenders: StaveRender[]): number {
    const fragmentCount = this.document.getFragmentCount(this.key);
    return (
      this.config.BASE_VOICE_WIDTH / fragmentCount + this.getMinRequiredVoiceWidth(noteStartOffsetXes, staveRenders)
    );
  }

  private getMinRequiredVoiceWidth(noteStartOffsetXes: number[], staveRenders: StaveRender[]): number {
    const widths = staveRenders.map((s, index) => {
      const vexflowVoices = s.voiceRenders.flatMap((v) => v.vexflowVoices).filter((v) => v.getTickables().length > 0);
      if (vexflowVoices.length === 0) {
        return 0;
      } else {
        return (
          new vexflow.Formatter().joinVoices(vexflowVoices).preCalculateMinTotalWidth(vexflowVoices) +
          noteStartOffsetXes[index]
        );
      }
    });
    if (widths.length > 0) {
      return Math.max(...widths);
    }
    return 0;
  }

  /**
   * Returns the rect of the stave itself, ignoring any influence by child elements such as notes.
   */
  private calculateStaveIntrinsicRect(staveRender: StaveRender): Rect {
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

  private overrideVexflowStaveRect(
    staveRender: StaveRender,
    x: number,
    paddingLeft: number,
    paddingRight: number
  ): Rect {
    const vexflowStave = staveRender.vexflowStave;

    const box = vexflowStave.getBoundingBox();

    const y = box.y;
    const w = box.w + paddingLeft + paddingRight;
    const h = box.h;

    const voiceRects = staveRender.voiceRenders.map((v) => v.rect);

    return Rect.merge([new Rect(x, y, w, h), ...voiceRects]);
  }

  /** The vexflow text dynamics bounding box is incorrect. This method returns a reasonable approximation. */
  private overrideVexflowTextDynamicsRect(vexflowTextDynamics: vexflow.TextDynamics, staveRender: StaveRender): Rect {
    const textBox = vexflowTextDynamics.getBoundingBox();
    const staveBox = staveRender.vexflowStave.getBoundingBox();

    const x = vexflowTextDynamics.getAbsoluteX();
    const y = staveBox.y - 2;
    const w = textBox.w;
    const h = textBox.h;

    return new Rect(x, y, w, h);
  }

  private overrideVexflowTabNoteRect(vexflowTabNote: vexflow.TabNote): Rect {
    const rects = new Array<Rect>();
    const x = vexflowTabNote.getAbsoluteX();
    for (const y of vexflowTabNote.getYs()) {
      const rect = new Rect(x - TAB_RECT_WIDTH / 2, y - TAB_RECT_WIDTH / 2, TAB_RECT_WIDTH, TAB_RECT_WIDTH);
      rects.push(rect);
    }
    return Rect.merge(rects);
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

  /**
   * A temporary hack to fix vexflow.GraceNoteGroup bounding boxes post-formatting.
   *
   * See https://github.com/vexflow/vexflow/issues/253
   */
  private maybefixVexflowGraceNoteGroupBoundingBox(entryRender: VoiceEntryRender) {
    if (entryRender.type !== 'note') {
      return;
    }

    const vexflowGraceNoteGroup = entryRender.vexflowGraceNoteGroup;
    if (!vexflowGraceNoteGroup) {
      return;
    }

    const boxes = vexflowGraceNoteGroup.getGraceNotes().map((n) => n.getBoundingBox());
    if (boxes.length === 0) {
      return;
    }

    const x = Math.min(...boxes.map((b) => b.x));
    const y = Math.min(...boxes.map((b) => b.y));

    vexflowGraceNoteGroup.setX(x);
    vexflowGraceNoteGroup.setY(y);
  }

  private hackEntryRenderRect(entryRender: VoiceEntryRender, staveRender: StaveRender): Rect {
    this.maybefixVexflowGraceNoteGroupBoundingBox(entryRender);

    if (entryRender.vexflowNote instanceof vexflow.TextDynamics) {
      return this.overrideVexflowTextDynamicsRect(entryRender.vexflowNote, staveRender);
    }
    if (entryRender.vexflowNote instanceof vexflow.TabNote) {
      return this.overrideVexflowTabNoteRect(entryRender.vexflowNote);
    }

    // HACK! Some modifiers cause the bounding box of the vexflow stave note to be incorrect. We filter them out here
    // and readd them later. We keep as much of the original modifiers as possible to get a more accurate bounding box.
    // See https://github.com/vexflow/vexflow/blob/d602715b1c05e21d3498f78b8b5904cb47ad3795/src/stavenote.ts#L616
    const vexflowTickable = entryRender.vexflowNote;
    const originalMods = vexflowTickable.getModifiers();
    const sanitizedMods = originalMods.filter((m) => PROBLEMATIC_VEXFLOW_MODIFIERS.every((p) => !(m instanceof p)));

    (vexflowTickable as any).modifiers = sanitizedMods;
    const rect = Rect.fromRectLike(entryRender.vexflowNote.getBoundingBox());
    (vexflowTickable as any).modifiers = originalMods;

    return rect;
  }
}
