import * as util from '@/util';
import { Document } from './document';
import { Config } from './config';
import { Logger } from '@/debug';
import { System } from './system';
import { CurveKey, CurveRender, ScoreRender, StaveNoteRender, SystemKey, SystemRender, TitleRender } from './types';
import { Label } from './label';
import { Rect } from '@/spatial';
import { Pen } from './pen';
import { SystemRenderMover } from './systemrendermover';
import { Curve } from './curve';

/**
 * Score is the top-level rendering object that is directly responsible for arranging systems.
 */
export class Score {
  constructor(private config: Config, private log: Logger, private document: Document) {}

  render(): ScoreRender {
    const pen = new Pen();

    pen.moveBy({ dy: this.config.SCORE_PADDING_TOP });

    const titleRender = this.renderTitle(pen);
    const systemRenders = this.renderSystems(pen);
    const curveRenders = this.renderCurves(systemRenders);

    pen.moveBy({ dy: this.config.SCORE_PADDING_BOTTOM });

    const width = this.config.WIDTH ?? util.max(systemRenders.map((system) => system.rect.w));
    const rect = new Rect(0, 0, width, pen.position().y);

    return {
      type: 'score',
      rect,
      titleRender,
      systemRenders,
      curveRenders,
    };
  }

  private renderTitle(pen: Pen): TitleRender | null {
    const title = this.document.getTitle();
    if (!title) {
      return null;
    }

    const position = pen.position();
    const padding = this.getTitlePadding();
    const font = this.getTitleFont();

    let label: Label;
    if (this.config.WIDTH) {
      label = Label.centerAligned(this.config, this.log, this.config.WIDTH, title, position, padding, font);
    } else {
      label = Label.singleLine(this.config, this.log, title, position, padding, font);
    }

    const rect = label.rect;
    pen.moveBy({ dy: rect.h });

    return {
      type: 'title',
      rect,
      label,
    };
  }

  private renderCurves(systemRenders: SystemRender[]): CurveRender[] {
    const curves = this.document.getCurves();

    const staveNoteRenders = systemRenders
      .flatMap((system) => system.measureRenders.flatMap((m) => m.fragmentRenders))
      .flatMap((f) => f.partRenders)
      .flatMap((p) => p.staveRenders)
      .flatMap((s) => s.voiceRenders)
      .flatMap((v) => v.entryRenders)
      .filter((e) => e.type === 'note');

    const staveNoteRegistry = new Map<string, StaveNoteRender[]>();

    for (const staveNoteRender of staveNoteRenders) {
      for (const curveId of staveNoteRender.curveIds) {
        if (!staveNoteRegistry.has(curveId)) {
          staveNoteRegistry.set(curveId, []);
        }
        staveNoteRegistry.get(curveId)!.push(staveNoteRender);
      }
    }

    const curveRenders = new Array<CurveRender>();

    for (let curveIndex = 0; curveIndex < curves.length; curveIndex++) {
      const key: CurveKey = { curveIndex };

      const staveNoteRenderCount = staveNoteRegistry.get(curves[curveIndex].id)?.length ?? 0;

      if (staveNoteRenderCount >= 1) {
        const curveRender = new Curve(this.config, this.log, this.document, key, staveNoteRegistry).render();
        curveRenders.push(curveRender);
      }
    }

    return curveRenders;
  }

  private getTitlePadding() {
    return { bottom: this.config.TITLE_PADDING_BOTTOM };
  }

  private getTitleFont() {
    return {
      color: 'black',
      family: this.config.TITLE_FONT_FAMILY,
      size: this.config.TITLE_FONT_SIZE,
      lineHeight: this.config.TITLE_FONT_LINE_HEIGHT_PX,
    };
  }

  private renderSystems(pen: Pen): SystemRender[] {
    const systemRenders = new Array<SystemRender>();

    const systemCount = this.document.getSystemCount();

    for (let systemIndex = 0; systemIndex < systemCount; systemIndex++) {
      const key: SystemKey = { systemIndex };

      const systemRender = new System(this.config, this.log, this.document, key, pen.position()).render();
      systemRenders.push(systemRender);

      const excessHeight = util.max(
        systemRender.measureRenders.flatMap((m) => m.fragmentRenders).flatMap((e) => e.excessHeight)
      );
      new SystemRenderMover().moveBy(systemRender, excessHeight);

      const bottomLeft = systemRender.rect.bottomLeft();
      pen.moveTo(bottomLeft.x, bottomLeft.y);
      pen.moveBy({ dy: this.config.SYSTEM_MARGIN_BOTTOM });
    }

    return systemRenders;
  }
}
