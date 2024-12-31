import * as util from '@/util';
import { Document } from './document';
import { Config } from './config';
import { Logger } from '@/debug';
import { System, SystemRender } from './system';
import { SystemKey } from './types';
import { Label } from './label';
import { Point, Rect } from '@/spatial';
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

    const position = this.getTitlePosition(pen.position());
    const label = new Label(this.config, this.log, title, position, this.getTitlePadding(), this.getTitleFont());
    const rect = label.rect();
    pen.moveBy({ dy: rect.h });

    return {
      type: 'title',
      rect,
      label,
    };
  }

  private getTitlePosition(position: Point): Point {
    const title = this.document.getTitle();
    if (!title) {
      return position;
    }

    const width = this.config.WIDTH;
    if (!width) {
      return position;
    }

    const rect = new Label(
      this.config,
      this.log,
      title,
      Point.origin(),
      this.getTitlePadding(),
      this.getTitleFont()
    ).rect();

    return new Point((width - rect.w) / 2, position.y);
  }

  private getTitlePadding() {
    return { bottom: this.config.TITLE_PADDING_BOTTOM };
  }

  private getTitleFont() {
    return {
      color: 'black',
      family: this.config.TITLE_FONT_FAMILY,
      size: this.config.TITLE_FONT_SIZE,
    };
  }

  private renderSystems(pen: Pen): SystemRender[] {
    const systemRenders = new Array<SystemRender>();

    const systemCount = this.document.getSystems().length;

    for (let systemIndex = 0; systemIndex < systemCount; systemIndex++) {
      const key: SystemKey = { systemIndex };
      const systemRender = new System(this.config, this.log, this.document, key, pen.position()).render();
      systemRenders.push(systemRender);
      pen.moveBy({ dy: systemRender.rect.h });
    }

    return systemRenders;
  }
}
