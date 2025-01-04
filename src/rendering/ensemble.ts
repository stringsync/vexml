import * as util from '@/util';
import * as data from '@/data';
import * as vexflow from 'vexflow';
import { Logger } from '@/debug';
import { Config } from './config';
import { MeasureEntryKey, PartKey, StaveKey, VoiceEntryKey, VoiceKey } from './types';
import { Document } from './document';
import { Point, Rect } from '@/spatial';
import { Pen } from './pen';
import { NoopRenderContext } from './nooprenderctx';
import { Fraction } from '@/util';

const MEASURE_NUMBER_PADDING_LEFT = 6;
const BARLINE_PADDING_RIGHT = 6;
const BRACE_CONNECTOR_PADDING_LEFT = 8;

const ADDITIONAL_CLEF_WIDTH = 10;
const ADDITIONAL_COMPLEX_TIME_SIGNATURE_COMPONENT_WIDTH = 12;

type EnsemblePart = {
  type: 'part';
  key: PartKey;
  rect: Rect;
  staves: EnsembleStave[];
  vexflowBrace: vexflow.StaveConnector | null;
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
  getVexflowStaveConnectors(): vexflow.StaveConnector[] {
    const vexflowStaveConnectors = new Array<vexflow.StaveConnector>();

    const staves = this.parts()
      .flatMap((p) => p.staves)
      .map((s) => s.vexflowStave);

    if (staves.length > 1) {
      const firstVexflowStave = staves.at(0)!;
      const lastVexflowStave = staves.at(-1)!;

      const isFirstMeausre = this.document.isFirstMeasure(this.key);
      const isFirstMeasureEntry = this.document.isFirstMeasureEntry(this.key);
      if (!isFirstMeausre && isFirstMeasureEntry) {
        vexflowStaveConnectors.push(
          new vexflow.StaveConnector(firstVexflowStave, lastVexflowStave).setType('singleLeft')
        );
      }

      const isLastSystem = this.document.isLastSystem(this.key);
      const isLastMeasure = this.document.isLastMeasure(this.key);
      const isLastMeasureEntry = this.document.isLastMeasureEntry(this.key);
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
    }

    return vexflowStaveConnectors;
  }

  @util.memoize()
  private parts(): EnsemblePart[] {
    const parts = new Array<EnsemblePart>();

    const pen = new Pen(this.position);

    const partCount = this.document.getPartCount(this.key);

    let hasBraceConnector = false;
    for (let partIndex = 0; partIndex < partCount; partIndex++) {
      const partKey: PartKey = { ...this.key, partIndex };

      if (this.document.getStaveCount(partKey) > 1) {
        hasBraceConnector = true;
        break;
      }
    }

    const isFirstMeasure = this.document.isFirstMeasure(this.key);
    const isFirstMeasureEntry = this.document.isFirstMeasureEntry(this.key);

    if (isFirstMeasure) {
      pen.moveBy({ dx: MEASURE_NUMBER_PADDING_LEFT });
    }
    if (isFirstMeasure && isFirstMeasureEntry && hasBraceConnector) {
      pen.moveBy({ dx: BRACE_CONNECTOR_PADDING_LEFT });
    }

    for (let partIndex = 0; partIndex < partCount; partIndex++) {
      const partKey: PartKey = { ...this.key, partIndex };

      const staves = this.staves(pen, partKey);
      const rect = Rect.merge(staves.map((s) => s.rect));

      let vexflowBrace: vexflow.StaveConnector | null = null;

      if (staves.length > 1) {
        const firstVexflowStave = staves.at(0)!.vexflowStave;
        const lastVexflowStave = staves.at(-1)!.vexflowStave;

        if (isFirstMeasure && isFirstMeasureEntry) {
          vexflowBrace = new vexflow.StaveConnector(firstVexflowStave, lastVexflowStave).setType('brace');
        }
      }

      parts.push({ type: 'part', key: partKey, rect, staves, vexflowBrace });
    }

    return parts;
  }

  private staves(pen: Pen, key: PartKey): EnsembleStave[] {
    const staves = new Array<EnsembleStave>();

    const partCount = this.document.getPartCount(key);
    const staveCount = this.document.getStaveCount(key);
    const hasStaveConnector = partCount > 1 || staveCount > 1;

    const clefs = new Array<EnsembleClef>();
    const times = new Array<EnsembleTime>();

    for (let staveIndex = 0; staveIndex < staveCount; staveIndex++) {
      const staveKey: StaveKey = { ...key, staveIndex };

      const voices = this.voices(staveKey);

      const isFirstSystem = this.document.isFirstSystem(staveKey);
      const isLastSystem = this.document.isLastSystem(staveKey);
      const isFirstMeasure = this.document.isFirstMeasure(staveKey);
      const isLastMeasure = this.document.isLastMeasure(staveKey);
      const isFirstPart = this.document.isFirstPart(staveKey);
      const isFirstStave = this.document.isFirstStave(staveKey);
      const isFirstMeasureEntry = this.document.isFirstMeasureEntry(staveKey);
      const isLastMeasureEntry = this.document.isLastMeasureEntry(staveKey);
      const measureLabel = this.document.getMeasure(staveKey).label;
      const staveSignature = this.document.getStave(staveKey).signature;
      const staveLineCount = staveSignature.lineCount;

      // We'll update the width later after we collect all the data needed to format the staves.
      const vexflowStave = new vexflow.Stave(pen.x, pen.y, 0, { numLines: staveLineCount });

      // TODO: Also render when it changes.
      if (isFirstMeasure && isFirstMeasureEntry) {
        const clef = new EnsembleClefFactory(this.config, this.log, this.document).create(staveKey);
        clefs.push(clef);
        vexflowStave.addModifier(clef.vexflowClef);
      }

      if (isFirstSystem && isFirstMeasure && isFirstMeasureEntry) {
        const time = new EnsembleTimeFactory(this.config, this.log, this.document).create(staveKey);
        times.push(time);
        for (const vexflowTimeSignature of time.vexflowTimeSignatures) {
          vexflowStave.addModifier(vexflowTimeSignature);
        }
      }

      if (isFirstPart && isFirstStave && measureLabel) {
        vexflowStave.setMeasure(measureLabel);
      }

      if (!isFirstMeasure && isFirstMeasureEntry && !hasStaveConnector) {
        vexflowStave.setBegBarType(vexflow.Barline.type.SINGLE);
      } else {
        vexflowStave.setBegBarType(vexflow.Barline.type.NONE);
      }

      if (isLastMeasureEntry && !hasStaveConnector) {
        if (isLastSystem && isLastMeasure) {
          vexflowStave.setEndBarType(vexflow.Barline.type.END);
        } else {
          vexflowStave.setEndBarType(vexflow.Barline.type.SINGLE);
        }
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

    // Non-voice width components.
    let nonVoiceWidth = vexflow.Stave.defaultPadding;
    if (clefs.length > 0) {
      nonVoiceWidth += util.max(clefs.map((c) => c.width));
    }
    if (times.length > 0) {
      nonVoiceWidth += util.max(times.map((t) => t.width));
    }

    let initialStaveWidth: number;
    if (this.width) {
      initialStaveWidth = this.width;
    } else {
      // Voice width components.
      const baseVoiceWidth = this.config.BASE_VOICE_WIDTH;
      const minWidth = vexflowFormatter.preCalculateMinTotalWidth(vexflowVoices);

      initialStaveWidth = baseVoiceWidth + minWidth + nonVoiceWidth;
    }

    const left = pen;
    const right = new Pen(this.position);
    right.moveBy({ dx: initialStaveWidth });

    const isLastMeasure = this.document.isLastMeasure(key);
    const isLastMeasureEntry = this.document.isLastMeasureEntry(key);
    if (isLastMeasure && isLastMeasureEntry) {
      right.moveBy({ dx: -BARLINE_PADDING_RIGHT });
    }

    const staveWidth = right.x - left.x;

    // Set the width on the staves.
    for (const stave of staves) {
      stave.vexflowStave.setWidth(staveWidth);
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
    const voiceWidth = staveWidth - nonVoiceWidth;
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
      stave.rect = this.getStaveRect(stave, left, right);
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

    const vexflowStaveNote = new vexflow.StaveNote({
      keys: [`${note.pitch}/${note.octave}`],
      duration: 'q', // TODO: Use real duration
      autoStem,
      stemDirection,
    });

    for (const mod of note.mods) {
      if (mod.type === 'accidental') {
        const vexflowAccidental = new vexflow.Accidental(mod.code);
        if (mod.isCautionary) {
          vexflowAccidental.setAsCautionary();
        }
        vexflowStaveNote.addModifier(vexflowAccidental);
      }
    }

    return { type: 'note', key, rect: Ensemble.placeholderRect(), vexflowTickable: vexflowStaveNote };
  }

  private getStaveRect(stave: EnsembleStave, left: Pen, right: Pen): Rect {
    const vexflowStave = stave.vexflowStave;

    const box = vexflowStave.getBoundingBox();

    const x = box.x - left.x + this.position.x;
    const y = box.y;
    const w = right.x - this.position.x;
    const h = box.h;

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

type EnsembleClef = {
  type: 'clef';
  key: StaveKey;
  vexflowClef: vexflow.Clef;
  width: number;
};

class EnsembleClefFactory {
  constructor(private config: Config, private log: Logger, private document: Document) {}

  create(key: StaveKey): EnsembleClef {
    const clef = this.document.getStave(key).signature.clef;
    const vexflowClef = new vexflow.Clef(clef.sign);
    const width = vexflowClef.getWidth() + ADDITIONAL_CLEF_WIDTH;
    return { type: 'clef', key, vexflowClef, width };
  }
}

type EnsembleTime = {
  type: 'time';
  key: StaveKey;
  vexflowTimeSignatures: vexflow.TimeSignature[];
  width: number;
};

class EnsembleTimeFactory {
  constructor(private config: Config, private log: Logger, private document: Document) {}

  create(key: StaveKey): EnsembleTime {
    const timeSpecs = this.getTimeSpecs(this.document, key);
    const vexflowTimeSignatures = timeSpecs.map((t) => new vexflow.TimeSignature(t));

    const padding = ADDITIONAL_COMPLEX_TIME_SIGNATURE_COMPONENT_WIDTH * (timeSpecs.length - 1);
    const width = vexflowTimeSignatures.reduce((sum, t) => sum + t.getWidth(), padding);

    return {
      type: 'time',
      key,
      vexflowTimeSignatures,
      width,
    };
  }

  private getTimeSpecs(document: Document, key: StaveKey): string[] {
    const time = document.getStave(key).signature.time;
    const components = this.toFractions(time.components);

    switch (time.symbol) {
      case 'common':
        return ['C'];
      case 'cut':
        return ['C|'];
      case 'single-number':
        const sum = Fraction.sum(...components).simplify();
        return [this.toSimpleTimeSpecs(sum)];
      case 'hidden':
        return [];
    }

    if (components.length > 1) {
      return this.toComplexTimeSpecs(components);
    }

    return [this.toSimpleTimeSpecs(components[0])];
  }

  private toSimpleTimeSpecs(component: Fraction): string {
    return `${component.numerator}/${component.denominator}`;
  }

  private toComplexTimeSpecs(components: Fraction[]): string[] {
    const denominators = new Array<number>();
    const memo: Record<number, number[]> = {};

    for (const component of components) {
      const numerator = component.numerator;
      const denominator = component.denominator;

      if (typeof memo[denominator] === 'undefined') {
        denominators.push(denominator);
      }

      memo[denominator] ??= [];
      memo[denominator].push(numerator);
    }

    const result = new Array<string>();

    for (let index = 0; index < denominators.length; index++) {
      const denominator = denominators[index];
      const isLast = index === denominators.length - 1;

      result.push(`${memo[denominator].join('+')}/${denominator}`);

      if (!isLast) {
        result.push('+');
      }
    }

    return result;
  }

  private toFractions(components: data.Fraction[]): Fraction[] {
    return components.map((component) => new Fraction(component.numerator, component.denominator));
  }
}
