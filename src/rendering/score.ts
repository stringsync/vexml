import * as util from '@/util';
import { Document } from './document';
import { Config } from './config';
import { Logger } from '@/debug';
import { System, SystemRender } from './system';
import { SystemKey } from './types';
import { Label } from './label';
import { Rect } from '@/spatial';
import { Pen } from './pen';

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

    const systemCount = this.document.getSystemCount();

    for (let systemIndex = 0; systemIndex < systemCount; systemIndex++) {
      const key: SystemKey = { systemIndex };

      const systemRender = new System(this.config, this.log, this.document, key, pen.position()).render();
      systemRenders.push(systemRender);

      const excessHeight = util.max(
        systemRender.measureRenders.flatMap((m) => m.entryRenders).flatMap((e) => e.excessHeight)
      );
      new SystemRenderMover().moveBy(systemRender, excessHeight);

      const bottomLeft = systemRender.rect.bottomLeft();
      pen.moveTo(bottomLeft.x, bottomLeft.y);
      pen.moveBy({ dy: this.config.SYSTEM_MARGIN_BOTTOM });
    }

    return systemRenders;
  }
}

type Movable = {
  rect: Rect;
};

/**
 * After a system is rendered, we may learn there is excess height from its components. This class recursivley moves
 * all the rects by the excess height such that we can honor the SYSTEM_MARGIN_BOTTOM configuration without
 * re-rendering. This is much faster than re-rendering the system at a different position.
 */
class SystemRenderMover {
  moveBy(systemRender: SystemRender, dy: number) {
    const seen = new Set<any>(); // avoid circular references

    const move = (obj: any) => {
      if (seen.has(obj)) {
        return;
      }
      seen.add(obj);
      if (this.isMovable(obj)) {
        obj.rect = obj.rect.translate({ dy });
      }
      if (Array.isArray(obj)) {
        for (const item of obj) {
          move(item);
        }
      } else if (util.isPOJO(obj)) {
        for (const key in obj) {
          move(obj[key]);
        }
      }
    };
    move(systemRender);

    // Before finishing, we move the vexflow staves. Since everything is linked to them, this should complete the move.
    // Any future supported vexflow object not connected to a stave will need to be moved here.
    systemRender.measureRenders
      .flatMap((m) => m.entryRenders)
      .flatMap((e) => e.partRenders)
      .flatMap((p) => p.staveRenders)
      .map((s) => s.vexflowStave)
      .forEach((s) => {
        s.setY(s.getY() + dy);
      });
  }

  private isMovable(obj: any): obj is Movable {
    return !!obj && obj.rect instanceof Rect;
  }
}
