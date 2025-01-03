/* eslint-disable @typescript-eslint/no-unused-vars */
import * as util from '@/util';
import * as vexflow from 'vexflow';
import { Logger } from '@/debug';
import { Config } from './config';
import { MeasureEntryKey, PartKey, StaveKey, VoiceEntryKey, VoiceKey } from './types';
import { Document } from './document';
import { Point, Rect } from '@/spatial';
import { Pen } from './pen';

const MEASURE_NUMBER_PADDING_LEFT = 6;
const BARLINE_WIDTH = 1;
const BRACE_CONNECTOR_WIDTH = 8;

type EnsemblePart = {
  type: 'part';
  key: PartKey;
  rect: Rect;
  staves: EnsembleStave[];
  vexflowStaveConnectors: vexflow.StaveConnector[];
};

type EnsembleStave = {
  type: 'stave';
  key: StaveKey;
  rect: Rect;
  intrinsicRect: Rect;
  vexflowStave: vexflow.Stave;
  voices: EnsembleVoice[];
};

type EnsembleVoice = {
  type: 'voice';
  key: VoiceKey;
  rect: Rect;
  vexflowVoice: vexflow.Voice;
  entries: EnsembleVoiceEntry[];
};

type EnsembleVoiceEntry = EnsembleNote;

type EnsembleNote = {
  type: 'note';
  key: VoiceEntryKey;
  rect: Rect;
  vexflowTickable: vexflow.StaveNote;
};

/**
 * An ensemble is a collection of voices across staves and parts that should be formatted together.
 *
 * This class serves as a staging area for coordinating layouts. Ensemble is not _directly_ rendered. Instead, the
 * rendering hiearchy objects will query ensemble and eventually indirectly render the vexflow objects.
 */
export class Ensemble {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private key: MeasureEntryKey,
    private position: Point,
    private width: number | null
  ) {}

  private static placeholderRect() {
    return Rect.empty();
  }

  getWidth(): number {
    return this.width ?? this.parts().at(0)?.rect.w ?? 0;
  }

  getPart(key: PartKey): EnsemblePart {
    const part = this.parts().find((p) => util.isEqual(p.key, key));

    util.assertDefined(part);

    return part;
  }

  getStave(key: StaveKey): EnsembleStave {
    const stave = this.parts()
      .flatMap((p) => p.staves)
      .find((s) => util.isEqual(s.key, key));

    util.assertDefined(stave);

    return stave;
  }

  getVoice(key: VoiceKey): EnsembleVoice {
    const voice = this.parts()
      .flatMap((p) => p.staves)
      .flatMap((s) => s.voices)
      .find((v) => util.isEqual(v.key, key));

    util.assertDefined(voice);

    return voice;
  }

  getVoiceEntry(key: VoiceEntryKey): EnsembleVoiceEntry {
    const entry = this.parts()
      .flatMap((p) => p.staves)
      .flatMap((s) => s.voices)
      .flatMap((v) => v.entries)
      .find((e) => util.isEqual(e.key, key));

    util.assertDefined(entry);

    return entry;
  }

  @util.memoize()
  private parts(): EnsemblePart[] {
    const parts = new Array<EnsemblePart>();

    const pen = new Pen(this.position);

    const partCount = this.document.getPartCount(this.key);

    for (let partIndex = 0; partIndex < partCount; partIndex++) {
      const partKey: PartKey = { ...this.key, partIndex };

      const isLastSystem = this.document.isLastSystem(partKey);
      const isFirstMeasure = this.document.isFirstMeasure(partKey);
      const isLastMeasure = this.document.isLastMeasure(partKey);
      const isFirstMeasureEntry = this.document.isFirstMeasureEntry(partKey);
      const isLastMeasureEntry = this.document.isLastMeasureEntry(partKey);

      const staveCount = this.document.getStaveCount(partKey);

      if (isFirstMeasure && isFirstMeasureEntry && staveCount > 1) {
        pen.moveBy({ dx: BRACE_CONNECTOR_WIDTH });
      }

      const staves = this.staves(pen, partKey);
      const rect = Rect.merge(staves.map((s) => s.rect));

      const vexflowStaveConnectors = new Array<vexflow.StaveConnector>();

      if (staves.length > 1) {
        const firstVexflowStave = staves.at(0)!.vexflowStave;
        const lastVexflowStave = staves.at(-1)!.vexflowStave;

        if (isFirstMeasureEntry) {
          vexflowStaveConnectors.push(
            new vexflow.StaveConnector(firstVexflowStave, lastVexflowStave).setType('singleLeft')
          );
        }

        if (isLastMeasureEntry) {
          if (isLastSystem && isLastMeasure) {
            vexflowStaveConnectors.push(
              new vexflow.StaveConnector(firstVexflowStave, lastVexflowStave).setType('boldDoubleRight')
            );
          } else {
            vexflowStaveConnectors.push(
              new vexflow.StaveConnector(firstVexflowStave, lastVexflowStave).setType('singleRight')
            );
          }
        }

        if (isFirstMeasure && isFirstMeasureEntry) {
          vexflowStaveConnectors.push(new vexflow.StaveConnector(firstVexflowStave, lastVexflowStave).setType('brace'));
        }
      }

      parts.push({ type: 'part', key: partKey, rect, staves, vexflowStaveConnectors });
    }

    return parts;
  }

  private staves(pen: Pen, key: PartKey): EnsembleStave[] {
    const staves = new Array<EnsembleStave>();

    const staveCount = this.document.getStaveCount(key);
    const hasStaveConnector = staveCount > 1;

    for (let staveIndex = 0; staveIndex < staveCount; staveIndex++) {
      const staveKey: StaveKey = { ...key, staveIndex };

      const voices = this.voices(staveKey);

      const isFirstMeasure = this.document.isFirstMeasure(staveKey);
      const isFirstPart = this.document.isFirstPart(staveKey);
      const isFirstStave = this.document.isFirstStave(staveKey);
      const isFirstMeasureEntry = this.document.isFirstMeasureEntry(staveKey);
      const isLastMeasureEntry = this.document.isLastMeasureEntry(staveKey);
      const measureLabel = this.document.getMeasure(this.key).label;

      let x = pen.x;
      const y = pen.y;

      if (isFirstMeasure) {
        x += MEASURE_NUMBER_PADDING_LEFT;
      }

      // We'll update the width later after we collect all the data needed to format the staves.
      const vexflowStave = new vexflow.Stave(x, y, 0);

      if (isFirstPart && isFirstStave && measureLabel) {
        vexflowStave.setMeasure(measureLabel);
      }

      if (isFirstMeasureEntry && !hasStaveConnector) {
        vexflowStave.setBegBarType(vexflow.Barline.type.SINGLE);
      } else {
        vexflowStave.setBegBarType(vexflow.Barline.type.NONE);
      }

      if (isLastMeasureEntry && !hasStaveConnector) {
        vexflowStave.setEndBarType(vexflow.Barline.type.SINGLE);
      } else {
        vexflowStave.setEndBarType(vexflow.Barline.type.NONE);
      }

      // TODO: Check <stave-layouts> first, which has a part+stave scoped margin.
      pen.moveBy({ dy: this.config.DEFAULT_STAVE_MARGIN_BOTTOM + vexflowStave.getHeight() });

      staves.push({
        type: 'stave',
        key: staveKey,
        rect: Ensemble.placeholderRect(),
        intrinsicRect: Ensemble.placeholderRect(),
        vexflowStave,
        voices,
      });
    }

    // Now that we have all the voices, we can format them.
    const vexflowVoices = staves.flatMap((s) => s.voices.map((v) => v.vexflowVoice));
    const vexflowFormatter = new vexflow.Formatter();
    vexflowFormatter.joinVoices(vexflowVoices);

    const vexflowStavePadding = vexflow.Stave.defaultPadding;

    let width: number;
    if (this.width) {
      width = this.width;
    } else {
      const baseVoiceWidth = this.config.BASE_VOICE_WIDTH;
      const minWidth = vexflowFormatter.preCalculateMinTotalWidth(vexflowVoices);
      width = baseVoiceWidth + minWidth + vexflowStavePadding;
    }

    const isLastMeasure = this.document.isLastMeasure(key);
    const isLastMeasureEntry = this.document.isLastMeasureEntry(key);
    if (isLastMeasure && isLastMeasureEntry) {
      width -= BARLINE_WIDTH;
    }

    const isFirstMeasure = this.document.isFirstMeasure(key);
    if (isFirstMeasure) {
      width -= MEASURE_NUMBER_PADDING_LEFT;
    }

    const isFirstMeasureEntry = this.document.isFirstMeasureEntry(key);
    if (isFirstMeasure && isFirstMeasureEntry) {
      width -= BRACE_CONNECTOR_WIDTH;
    }

    // Set the width on the staves.
    for (const stave of staves) {
      stave.vexflowStave.setWidth(width);
    }

    // Associate everything with a stave.
    for (const stave of staves) {
      for (const voice of stave.voices) {
        voice.vexflowVoice.setStave(stave.vexflowStave);

        for (const entry of voice.entries) {
          entry.vexflowTickable.setStave(stave.vexflowStave);
        }
      }
    }

    // Format! The voice width must be smaller than the stave or the stave won't contain it.
    const voiceWidth = width - vexflowStavePadding;
    vexflowFormatter.format(vexflowVoices, voiceWidth);

    // At this point, we can call getBoundingBox() on everything, but vexflow does some extra formatting in draw() that
    // mutates the objects. Before we set the rects, we need to draw the staves to a noop context, then unset the
    // context and rendered state.
    const ctx = new NoopRenderContext();
    for (const stave of staves) {
      stave.vexflowStave.setContext(ctx).draw();
      stave.vexflowStave.setRendered(false);

      for (const voice of stave.voices) {
        voice.vexflowVoice.setContext(ctx).draw();
        voice.vexflowVoice.setRendered(false);

        for (const entry of voice.entries) {
          entry.vexflowTickable.setContext(ctx).draw();
          entry.vexflowTickable.setRendered(false);
        }
      }
    }

    // At this point, we should be able to call getBoundingBox() on all of the vexflow objects. We can now update the
    // rects accordingly.
    for (const stave of staves) {
      stave.rect = this.getStaveRect(stave);
      stave.intrinsicRect = this.getStaveIntrinsicRect(stave);

      for (const voice of stave.voices) {
        voice.rect = Rect.fromRectLike(voice.vexflowVoice.getBoundingBox());

        for (const entry of voice.entries) {
          entry.rect = Rect.fromRectLike(entry.vexflowTickable.getBoundingBox());
        }
      }
    }

    return staves;
  }

  private voices(staveKey: StaveKey): EnsembleVoice[] {
    const voices = new Array<EnsembleVoice>();

    const voiceCount = this.document.getVoiceCount(staveKey);
    for (let voiceIndex = 0; voiceIndex < voiceCount; voiceIndex++) {
      const voiceKey: VoiceKey = { ...staveKey, voiceIndex };

      const entries = new Array<EnsembleVoiceEntry>();

      const voiceEntryCount = this.document.getVoiceEntryCount(voiceKey);
      for (let voiceEntryIndex = 0; voiceEntryIndex < voiceEntryCount; voiceEntryIndex++) {
        const voiceEntryKey: VoiceEntryKey = { ...voiceKey, voiceEntryIndex };

        entries.push(this.voiceEntry(voiceEntryKey));
      }

      const vexflowTickables = entries.map((entry) => entry.vexflowTickable);
      const vexflowVoice = new vexflow.Voice().setMode(vexflow.Voice.Mode.SOFT).addTickables(vexflowTickables);

      voices.push({ type: 'voice', key: voiceKey, rect: Ensemble.placeholderRect(), vexflowVoice, entries });
    }

    return voices;
  }

  private voiceEntry(key: VoiceEntryKey): EnsembleVoiceEntry {
    // TODO: When there are multiple entry types, we need to handle them here.
    return this.note(key);
  }

  private note(key: VoiceEntryKey): EnsembleNote {
    const note = this.document.getNote(key);

    let autoStem: boolean | undefined;
    let stemDirection: number | undefined;

    switch (note.stemDirection) {
      case 'up':
        stemDirection = vexflow.Stem.UP;
        break;
      case 'down':
        stemDirection = vexflow.Stem.DOWN;
        break;
      case 'none':
        break;
      default:
        autoStem = true;
    }

    const vexflowTickable = new vexflow.StaveNote({
      keys: [`${note.pitch}/${note.octave}`],
      duration: 'q',
      autoStem,
      stemDirection,
    });

    return { type: 'note', key, rect: Ensemble.placeholderRect(), vexflowTickable };
  }

  private getStaveRect(stave: EnsembleStave): Rect {
    const vexflowStave = stave.vexflowStave;

    const box = vexflowStave.getBoundingBox();

    let x = box.x;
    const y = box.y;
    let w = box.w;
    const h = box.h;

    const isFirstMeasure = this.document.isFirstMeasure(stave.key);
    if (isFirstMeasure) {
      x -= MEASURE_NUMBER_PADDING_LEFT;
      w += MEASURE_NUMBER_PADDING_LEFT;
    }

    const staveCount = this.document.getStaveCount(stave.key);
    const isFirstMeasureEntry = this.document.isFirstMeasureEntry(stave.key);
    if (isFirstMeasure && isFirstMeasureEntry && staveCount > 1) {
      x -= BRACE_CONNECTOR_WIDTH;
      w += BRACE_CONNECTOR_WIDTH;
    }

    const isLastMeasure = this.document.isLastMeasure(stave.key);
    const isLastMeasureEntry = this.document.isLastMeasureEntry(stave.key);
    if (isLastMeasure && isLastMeasureEntry) {
      w += BARLINE_WIDTH;
    }

    const vexflowVoiceRects = stave.voices
      .map((voice) => voice.vexflowVoice.getBoundingBox())
      .map((box) => Rect.fromRectLike(box));

    return Rect.merge([new Rect(x, y, w, h), ...vexflowVoiceRects]);
  }

  /**
   * Returns the rect of the stave itself, ignoring any influence by child elements such as notes.
   */
  private getStaveIntrinsicRect(stave: EnsembleStave): Rect {
    const vexflowStave = stave.vexflowStave;

    const box = vexflowStave.getBoundingBox();
    const topLineY = vexflowStave.getTopLineTopY();
    const bottomLineY = vexflowStave.getBottomLineBottomY();

    const x = box.x;
    const y = topLineY;
    const w = box.w;
    const h = bottomLineY - topLineY;

    return new Rect(x, y, w, h);
  }
}

class NoopRenderContext extends vexflow.RenderContext {
  clear(): void {}
  setFillStyle(style: string): this {
    return this;
  }
  setBackgroundFillStyle(style: string): this {
    return this;
  }
  setStrokeStyle(style: string): this {
    return this;
  }
  setShadowColor(color: string): this {
    return this;
  }
  setShadowBlur(blur: number): this {
    return this;
  }
  setLineWidth(width: number): this {
    return this;
  }
  setLineCap(capType: CanvasLineCap): this {
    return this;
  }
  setLineDash(dashPattern: number[]): this {
    return this;
  }
  scale(x: number, y: number): this {
    return this;
  }
  rect(x: number, y: number, width: number, height: number): this {
    return this;
  }
  resize(width: number, height: number): this {
    return this;
  }
  fillRect(x: number, y: number, width: number, height: number): this {
    return this;
  }
  clearRect(x: number, y: number, width: number, height: number): this {
    return this;
  }
  pointerRect(x: number, y: number, width: number, height: number): this {
    return this;
  }
  beginPath(): this {
    return this;
  }
  moveTo(x: number, y: number): this {
    return this;
  }
  lineTo(x: number, y: number): this {
    return this;
  }
  bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): this {
    return this;
  }
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): this {
    return this;
  }
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise: boolean): this {
    return this;
  }
  fill(attributes?: any): this {
    return this;
  }
  stroke(): this {
    return this;
  }
  closePath(): this {
    return this;
  }
  fillText(text: string, x: number, y: number): this {
    return this;
  }
  save(): this {
    return this;
  }
  restore(): this {
    return this;
  }
  openGroup(cls?: string, id?: string) {}
  closeGroup(): void {}
  openRotation(angleDegrees: number, x: number, y: number): void {}
  closeRotation(): void {}
  add(child: any): void {}
  measureText(text: string): vexflow.TextMeasure {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  set fillStyle(style: string | CanvasGradient | CanvasPattern) {}
  get fillStyle(): string | CanvasGradient | CanvasPattern {
    return '';
  }
  set strokeStyle(style: string | CanvasGradient | CanvasPattern) {}
  get strokeStyle(): string | CanvasGradient | CanvasPattern {
    return '';
  }
  setFont(f?: string | vexflow.FontInfo, size?: string | number, weight?: string | number, style?: string): this {
    return this;
  }
  getFont(): string {
    return '';
  }
}
