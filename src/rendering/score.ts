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

    const systemCount = this.document.getSystems().length;

    for (let systemIndex = 0; systemIndex < systemCount; systemIndex++) {
      const key: SystemKey = { systemIndex };
      const systemRender = new System(this.config, this.log, this.document, key, pen.position()).render();
      systemRenders.push(systemRender);
      // TODO: We do know how tall the other system will be, so we'll need to psuedo-render the system to get the
      // height and adjust accordingly.
      pen.moveBy({ dy: systemRender.rect.h });
    }

    return systemRenders;
  }
}
