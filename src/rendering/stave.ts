import * as vexflow from 'vexflow';
import * as util from '@/util';
import * as data from '@/data';
import { Point, Rect } from '@/spatial';
import { ClefRender, KeyRender, StaveKey, StaveRender, TimeRender, VoiceRender } from './types';
import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';
import { Voice } from './voice';
import { Clef } from './clef';
import { Time } from './time';
import { Key } from './key';

const METRONOME_TOP_PADDING = 8;

export class Stave {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private key: StaveKey,
    private position: Point
  ) {}

  render(): StaveRender {
    const staveLineCount = this.document.getStave(this.key).signature.lineCount;
    const vexflowStave = new vexflow.Stave(this.position.x, this.position.y, 0, { numLines: staveLineCount });

    const { voiceRenders, vexflowMultiMeasureRest } = this.renderVoicesOrVexflowMultiMeasureRest(vexflowStave);

    const startClefRender = this.renderStartClef(vexflowStave);
    const endClefRender = this.renderEndClef(vexflowStave);
    const timeRender = this.renderTime(vexflowStave);
    const keyRender = this.renderKeySignature(vexflowStave);

    this.renderMeasureLabel(vexflowStave);
    this.renderBarlines(vexflowStave);
    this.renderEndingBrackets(vexflowStave);
    this.renderMetronome(vexflowStave);
    this.renderRepetitionSymbol(vexflowStave);

    return {
      type: 'stave',
      key: this.key,
      rect: Rect.empty(), // placeholder
      intrinsicRect: Rect.empty(), // placeholder
      excessHeight: 0, // placeholder
      voiceRenders,
      vexflowMultiMeasureRest,
      startClefRender,
      endClefRender,
      keyRender,
      timeRender,
      vexflowStave,
    };
  }

  private renderVoicesOrVexflowMultiMeasureRest(vexflowStave: vexflow.Stave): {
    voiceRenders: VoiceRender[];
    vexflowMultiMeasureRest: vexflow.MultiMeasureRest | null;
  } {
    const voiceRenders = new Array<VoiceRender>();
    const voiceCount = this.document.getVoiceCount(this.key);

    let vexflowMultiMeasureRest: vexflow.MultiMeasureRest | null = null;

    const multiRestCount = this.document.getMeasureMultiRestCount(this.key);
    if (multiRestCount > 1) {
      // A multirest that spans a single measure should have a whole rest associated with it. We only want to render
      // multirests that span multiple measures.
      vexflowMultiMeasureRest = new vexflow.MultiMeasureRest(multiRestCount, { numberOfMeasures: 1 });
    } else {
      for (let voiceIndex = 0; voiceIndex < voiceCount; voiceIndex++) {
        const key = { ...this.key, voiceIndex };
        const voiceRender = new Voice(this.config, this.log, this.document, key).render();

        // Empty voices are problematic for vexflow, so we discard them as soon as we can.
        if (voiceRender.entryRenders.length > 0) {
          voiceRenders.push(voiceRender);
        }
      }
    }

    for (const voiceRender of voiceRenders) {
      for (const vexflowVoice of voiceRender.vexflowVoices) {
        vexflowVoice.setStave(vexflowStave);
      }
    }

    if (vexflowMultiMeasureRest) {
      vexflowMultiMeasureRest.setStave(vexflowStave);
    }

    this.adjustStems(voiceRenders);

    return { voiceRenders, vexflowMultiMeasureRest };
  }

  private renderStartClef(vexflowStave: vexflow.Stave): ClefRender | null {
    const isFirstMeasure = this.document.isFirstMeasure(this.key);
    const isFirstFragment = this.document.isFirstFragment(this.key);
    if (isFirstMeasure && isFirstFragment) {
      const clefRender = new Clef(this.config, this.log, this.document, this.key).render();
      vexflowStave.addModifier(clefRender.vexflowClef);
      return clefRender;
    }
    return null;
  }

  private renderEndClef(vexflowStave: vexflow.Stave): ClefRender | null {
    const currentClef = this.document.getStave(this.key).signature.clef;
    const nextClef = this.document.getNextPlayedStave(this.key)?.signature.clef;
    const willClefChange = nextClef && currentClef.sign !== nextClef?.sign;
    if (willClefChange) {
      const clefRender = new Clef(this.config, this.log, this.document, this.key).render();
      vexflowStave.addEndModifier(clefRender.vexflowClef);
      return clefRender;
    }

    return null;
  }

  private renderTime(vexflowStave: vexflow.Stave): TimeRender | null {
    const isFirstSystem = this.document.isFirstSystem(this.key);
    const isFirstMeasure = this.document.isFirstMeasure(this.key);
    const isFirstFragment = this.document.isFirstFragment(this.key);
    const isAbsolutelyFirst = isFirstSystem && isFirstMeasure && isFirstFragment;

    const currentTime = this.document.getStave(this.key).signature.time;
    const previousTime = this.document.getPreviouslyPlayedStave(this.key)?.signature.time;

    const didTimeChange =
      currentTime.symbol !== previousTime?.symbol ||
      currentTime.components.length !== previousTime?.components.length ||
      currentTime.components.some(
        (c, i) =>
          c.numerator !== previousTime?.components[i].numerator ||
          c.denominator !== previousTime?.components[i].denominator
      );

    if (isAbsolutelyFirst || didTimeChange) {
      const timeRender = new Time(this.config, this.log, this.document, this.key).render();
      for (const vexflowTimeSignature of timeRender.vexflowTimeSignatures) {
        vexflowStave.addModifier(vexflowTimeSignature);
      }
      return timeRender;
    }

    return null;
  }

  private renderMeasureLabel(vexflowStave: vexflow.Stave): void {
    const isFirstPart = this.document.isFirstPart(this.key);
    const isFirstStave = this.document.isFirstStave(this.key);
    const isFirstFragment = this.document.isFirstFragment(this.key);
    const measureLabel = this.document.getMeasure(this.key).label;
    if (isFirstPart && isFirstStave && isFirstFragment && measureLabel) {
      vexflowStave.setMeasure(measureLabel);
    }
  }

  private renderBarlines(vexflowStave: vexflow.Stave): void {
    const isFirstMeasure = this.document.isFirstMeasure(this.key);
    const isFirstFragment = this.document.isFirstFragment(this.key);
    const isLastFragment = this.document.isLastFragment(this.key);

    const startVexflowBarlineType = this.toVexflowBarlineType(this.document.getMeasure(this.key).startBarlineStyle);

    if (!isFirstMeasure && isFirstFragment) {
      vexflowStave.setBegBarType(startVexflowBarlineType);
    } else {
      vexflowStave.setBegBarType(vexflow.Barline.type.NONE);
    }

    const endVexflowBarlineType = this.toVexflowBarlineType(this.document.getMeasure(this.key).endBarlineStyle);

    if (isLastFragment) {
      vexflowStave.setEndBarType(endVexflowBarlineType);
    } else {
      vexflowStave.setEndBarType(vexflow.Barline.type.NONE);
    }
  }

  private toVexflowBarlineType(barlineStyle: data.BarlineStyle | null): vexflow.BarlineType {
    switch (barlineStyle) {
      case 'single':
        return vexflow.Barline.type.SINGLE;
      case 'double':
        return vexflow.Barline.type.DOUBLE;
      case 'end':
        return vexflow.Barline.type.END;
      case 'repeatstart':
        return vexflow.Barline.type.REPEAT_BEGIN;
      case 'repeatend':
        return vexflow.Barline.type.REPEAT_END;
      case 'repeatboth':
        return vexflow.Barline.type.REPEAT_BOTH;
      case 'none':
        return vexflow.Barline.type.NONE;
      default:
        return vexflow.Barline.type.SINGLE;
    }
  }

  private renderEndingBrackets(vexflowStave: vexflow.Stave): void {
    const isFirstPart = this.document.isFirstPart(this.key);
    const isFirstStave = this.document.isFirstStave(this.key);
    if (!isFirstPart || !isFirstStave) {
      return;
    }

    const jumps = this.document.getJumps(this.key);
    const ending = jumps.find((jump) => jump.type === 'repeatending');
    if (!ending) {
      return;
    }

    let vexflowVoltaType = vexflow.VoltaType.NONE;
    switch (ending.endBracketType) {
      case 'none':
        vexflowVoltaType = vexflow.VoltaType.NONE;
        break;
      case 'begin':
        vexflowVoltaType = vexflow.VoltaType.BEGIN;
        break;
      case 'mid':
        vexflowVoltaType = vexflow.VoltaType.MID;
        break;
      case 'end':
        vexflowVoltaType = vexflow.VoltaType.END;
        break;
      case 'beginend':
        vexflowVoltaType = vexflow.VoltaType.BEGIN_END;
        break;
    }

    vexflowStave.setVoltaType(vexflowVoltaType, ending.label, 0);
  }

  /**
   * Adjusts the stems based on the first non-rest note of each voice by mutating the voice entry data in place.
   *
   * This method does _not_ change any stem directions that were explicitly defined.
   */
  private adjustStems(voiceRenders: VoiceRender[]): void {
    const voices = voiceRenders.filter((voice) => voice.entryRenders.some((entry) => entry.type === 'note'));
    if (voices.length <= 1) {
      return;
    }

    util.sortBy(
      voices,
      (voice) => -voice.entryRenders.find((entry) => entry.type === 'note')!.vexflowTickable.getKeyLine(0)
    );

    const top = voices.at(0)!;
    const middle = voices.slice(1, -1);
    const bottom = voices.at(-1)!;

    for (const entry of top.entryRenders) {
      if (entry.type == 'note' && entry.stemDirection === 'auto') {
        entry.stemDirection = 'up';
        entry.vexflowTickable.setStemDirection(vexflow.Stem.UP);
      }
    }
    for (const entry of middle.flatMap((v) => v.entryRenders)) {
      if (entry.type == 'note' && entry.stemDirection === 'auto') {
        entry.stemDirection = 'none';
        entry.vexflowTickable.setStemDirection(undefined);
      }
    }
    for (const entry of bottom.entryRenders) {
      if (entry.type == 'note' && entry.stemDirection === 'auto') {
        entry.stemDirection = 'down';
        entry.vexflowTickable.setStemDirection(vexflow.Stem.DOWN);
      }
    }
  }

  private renderKeySignature(vexflowStave: vexflow.Stave): KeyRender | null {
    const isFirstMeasure = this.document.isFirstMeasure(this.key);
    const isFirstFragment = this.document.isFirstFragment(this.key);
    const isFirstMeasureFragment = isFirstMeasure && isFirstFragment;

    const currentKey = this.document.getStave(this.key).signature.key;
    const previousKey = this.document.getPreviouslyPlayedStave(this.key)?.signature.key;

    const didKeyChange =
      currentKey.rootNote !== previousKey?.rootNote ||
      currentKey.fifths !== previousKey?.fifths ||
      currentKey.mode !== previousKey?.mode;

    if (isFirstMeasureFragment || didKeyChange) {
      const keyRender = new Key(this.config, this.log, this.document, this.key).render();
      vexflowStave.addModifier(keyRender.vexflowKeySignature);
      return keyRender;
    }

    return null;
  }

  private renderMetronome(vexflowStave: vexflow.Stave): void {
    const isFirstSystem = this.document.isFirstSystem(this.key);
    const isFirstMeasure = this.document.isFirstMeasure(this.key);
    const isFirstFragment = this.document.isFirstFragment(this.key);
    const isAbsolutelyFirst = isFirstSystem && isFirstMeasure && isFirstFragment;

    const currentMetronome = this.document.getFragment(this.key).signature.metronome;
    const previousMetronome = this.document.getPreviousFragment(this.key)?.signature.metronome;

    const didMetronomeChange =
      currentMetronome.bpm !== previousMetronome?.bpm ||
      currentMetronome.dots !== previousMetronome?.dots ||
      currentMetronome.dots2 !== previousMetronome?.dots2 ||
      currentMetronome.duration !== previousMetronome?.duration;

    const hasMetronome =
      currentMetronome.bpm || currentMetronome.dots || currentMetronome.dots2 || currentMetronome.duration;

    if (hasMetronome && (isAbsolutelyFirst || didMetronomeChange)) {
      vexflowStave.setTempo(currentMetronome, -METRONOME_TOP_PADDING);
    }
  }

  private renderRepetitionSymbol(vexflowStave: vexflow.Stave): void {
    const isFirstPart = this.document.isFirstPart(this.key);
    const isFirstStave = this.document.isFirstStave(this.key);
    if (!isFirstPart || !isFirstStave) {
      return;
    }

    const measure = this.document.getMeasure(this.key);

    for (const repetitionSymbol of measure.repetitionSymbols) {
      switch (repetitionSymbol) {
        case 'segno':
          vexflowStave.setRepetitionType(vexflow.Repetition.type.SEGNO_LEFT);
          break;
        case 'coda':
          vexflowStave.setRepetitionType(vexflow.Repetition.type.CODA_LEFT);
          break;
      }
    }
  }
}
