import * as util from '@/util';
import * as vexflow from 'vexflow';
import { Logger } from '@/debug';
import { Config } from './config';
import { MeasureEntryKey, PartKey, StaveKey, VoiceEntryKey, VoiceKey } from './types';
import { Document } from './document';
import { Point, Rect } from '@/spatial';
import { Pen } from './pen';

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

const MEASURE_NUMBER_PADDING_LEFT = 6;
const BARLINE_WIDTH = 1;

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
    return this.width ?? this.staves().at(0)?.rect.w ?? 0;
  }

  getStave(key: StaveKey): EnsembleStave {
    const stave = this.staves().find((s) => util.isEqual(s.key, key));
    util.assertDefined(stave);
    return stave;
  }

  getVoice(key: VoiceKey): EnsembleVoice {
    const voice = this.staves()
      .flatMap((s) => s.voices)
      .find((v) => util.isEqual(v.key, key));

    util.assertDefined(voice);

    return voice;
  }

  getEntry(key: VoiceEntryKey): EnsembleVoiceEntry {
    const entry = this.staves()
      .flatMap((s) => s.voices)
      .flatMap((v) => v.entries)
      .find((e) => util.isEqual(e.key, key));

    util.assertDefined(entry);

    return entry;
  }

  @util.memoize()
  private staves(): EnsembleStave[] {
    const staves = new Array<EnsembleStave>();

    const pen = new Pen(this.position);

    const partCount = this.document.getPartCount(this.key);
    for (let partIndex = 0; partIndex < partCount; partIndex++) {
      const partKey: PartKey = { ...this.key, partIndex };

      const staveCount = this.document.getStaveCount(partKey);
      for (let staveIndex = 0; staveIndex < staveCount; staveIndex++) {
        const staveKey: StaveKey = { ...partKey, staveIndex };

        const voices = this.voices(staveKey);

        const isFirstMeasure = this.document.isFirstMeasure(staveKey);
        const isFirstPart = this.document.isFirstPart(staveKey);
        const isFirstStave = this.document.isFirstStave(staveKey);
        const isFirstMeasureEntry = this.document.isFirstMeasureEntry(staveKey);
        const isLastMeasureEntry = this.document.isLastMeasureEntry(staveKey);
        const hasStaveConnector = this.document.getStaveCount(staveKey) > 1;
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
    }

    // Precalculate the width if needed.
    const vexflowVoices = staves.flatMap((s) => s.voices.map((v) => v.vexflowVoice));
    const vexflowFormatter = new vexflow.Formatter();
    vexflowFormatter.joinVoices(vexflowVoices);

    const isLastMeasure = this.document.isLastMeasure(this.key);
    const isLastMeasureEntry = this.document.isLastMeasureEntry(this.key);
    const isFirstMeasure = this.document.isFirstMeasure(this.key);

    const vexflowStavePadding = vexflow.Stave.defaultPadding;

    let width: number;
    if (this.width) {
      width = this.width;
    } else {
      const baseVoiceWidth = this.config.BASE_VOICE_WIDTH;
      const minWidth = vexflowFormatter.preCalculateMinTotalWidth(vexflowVoices);
      width = baseVoiceWidth + minWidth + vexflowStavePadding;
    }

    if (isLastMeasure && isLastMeasureEntry) {
      width -= BARLINE_WIDTH;
    }
    if (isFirstMeasure) {
      width -= MEASURE_NUMBER_PADDING_LEFT;
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

        entries.push(this.entry(voiceEntryKey));
      }

      const vexflowTickables = entries.map((entry) => entry.vexflowTickable);
      const vexflowVoice = new vexflow.Voice().setMode(vexflow.Voice.Mode.SOFT).addTickables(vexflowTickables);

      voices.push({ type: 'voice', key: voiceKey, rect: Ensemble.placeholderRect(), vexflowVoice, entries });
    }

    return voices;
  }

  private entry(key: VoiceEntryKey): EnsembleVoiceEntry {
    // TODO: When there are multiple entry types, we need to handle them here.
    return this.note(key);
  }

  private note(key: VoiceEntryKey): EnsembleNote {
    const note = this.document.getNote(key);

    const vexflowTickable = new vexflow.StaveNote({
      keys: [`${note.pitch}/${note.octave}`],
      duration: 'q',
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

    const isLastMeasure = this.document.isLastMeasure(stave.key);
    const isLastMeasureEntry = this.document.isLastMeasureEntry(stave.key);
    if (isLastMeasure && isLastMeasureEntry) {
      w += BARLINE_WIDTH;
    }

    return new Rect(x, y, w, h);
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
