import * as util from '@/util';
import { Document } from './document';
import { Config } from './config';
import { Logger } from '@/debug';
import { System, SystemRender } from './system';
import { SystemKey } from './types';
import { Label } from './label';
import { Rect, Point } from '@/spatial';
import { Pen } from './pen';
import { FragmentRender } from './fragment';

export type ScoreRender = {
  type: 'score';
  rect: Rect;
  titleRender: TitleRender | null;
  systemRenders: SystemRender[];
};

export type TitleRender = {
  type: 'title';
  rect: Rect;
  label: Label;
};

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

    pen.moveBy({ dy: this.config.SCORE_PADDING_BOTTOM });

    const width = this.config.WIDTH ?? util.max(systemRenders.map((system) => system.rect.w));

    const rect = new Rect(0, 0, width, pen.position().y);

    return {
      type: 'score',
      rect,
      titleRender,
      systemRenders,
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

    const systemExcessHeights = this.getSystemExcessHeights();
    const systemCount = this.document.getSystemCount();

    for (let systemIndex = 0; systemIndex < systemCount; systemIndex++) {
      const key: SystemKey = { systemIndex };

      const systemExcessHeight = systemExcessHeights[systemIndex];
      pen.moveBy({ dy: systemExcessHeight });

      const systemRender = new System(this.config, this.log, this.document, key, pen.position()).render();
      systemRenders.push(systemRender);

      const bottomLeft = systemRender.rect.corners()[3];
      pen.moveTo(bottomLeft.x, bottomLeft.y);
      pen.moveBy({ dy: this.config.SYSTEM_MARGIN_BOTTOM });
    }

    return systemRenders;
  }

  /**
   * Precalculates the height of each system. This is necessary to do separately because the voices in a system can
   * exceed the stave boundaries, making the initial system position invalid.
   */
  private getSystemExcessHeights(): number[] {
    const systemExcessHeights = new Array<number>();

    const systemCount = this.document.getSystemCount();

    for (let systemIndex = 0; systemIndex < systemCount; systemIndex++) {
      const key: SystemKey = { systemIndex };

      const systemRender = new System(this.config, this.log, this.document, key, Point.origin()).render();
      const staveRender = systemRender.measureRenders
        .flatMap((m) => m.entryRenders)
        .filter((e): e is FragmentRender => e.type === 'fragment')
        .flatMap((f) => f.partRenders)
        .flatMap((p) => p.staveRenders)
        .at(0);

      if (staveRender) {
        // The excess height is the distance between the top of the vexflow stave and the top of the system rect (which
        // should account for the highest voice). The vexml stave rect / intrinsic rect are not correct to use.
        const systemExcessHeight = staveRender.vexflowStave.getBoundingBox().y - systemRender.rect.y;
        systemExcessHeights.push(systemExcessHeight);
      } else {
        systemExcessHeights.push(0);
      }
    }

    return systemExcessHeights;
  }
}
