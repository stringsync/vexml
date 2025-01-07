import * as vexflow from 'vexflow';
import * as util from '@/util';
import { Point, Rect } from '@/spatial';
import { ClefRender, StaveKey, StaveRender, TimeRender, VoiceRender } from './types';
import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';
import { Voice } from './voice';
import { Clef } from './clef';
import { Time } from './time';

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

    this.renderMeasureLabel(vexflowStave);
    this.renderBarlines(vexflowStave);

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
      voiceRender.vexflowVoice.setStave(vexflowStave);
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
    const measureLabel = this.document.getMeasure(this.key).label;
    if (isFirstPart && isFirstStave && measureLabel) {
      vexflowStave.setMeasure(measureLabel);
    }
  }

  private renderBarlines(vexflowStave: vexflow.Stave): void {
    const isLastSystem = this.document.isLastSystem(this.key);
    const isFirstMeasure = this.document.isFirstMeasure(this.key);
    const isFirstFragment = this.document.isFirstFragment(this.key);
    const isLastMeasure = this.document.isLastMeasure(this.key);
    const isLastFragment = this.document.isLastFragment(this.key);

    const partCount = this.document.getPartCount(this.key);
    const staveCount = this.document.getStaveCount(this.key);
    const hasStaveConnector = partCount > 1 || staveCount > 1;

    if (!isFirstMeasure && isFirstFragment && !hasStaveConnector) {
      vexflowStave.setBegBarType(vexflow.Barline.type.SINGLE);
    } else {
      vexflowStave.setBegBarType(vexflow.Barline.type.NONE);
    }

    if (isLastFragment && !hasStaveConnector) {
      if (isLastSystem && isLastMeasure) {
        vexflowStave.setEndBarType(vexflow.Barline.type.END);
      } else {
        vexflowStave.setEndBarType(vexflow.Barline.type.SINGLE);
      }
    } else {
      vexflowStave.setEndBarType(vexflow.Barline.type.NONE);
    }
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
}
