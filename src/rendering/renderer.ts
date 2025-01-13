import * as data from '@/data';
import * as formatters from './formatters';
import * as vexflow from 'vexflow';
import * as components from '@/components';
import * as elements from '@/elements';
import { Document } from './document';
import { Score } from './score';
import { Config, DEFAULT_CONFIG } from './config';
import { Logger, NoopLogger, Stopwatch } from '@/debug';
import { Formatter, ScoreRender } from './types';

export type RenderOptions = {
  config?: Partial<Config>;
  logger?: Logger;
};

export class Renderer {
  private document: Document;

  constructor(document: data.Document) {
    this.document = new Document(document);
  }

  render(div: HTMLDivElement, opts?: RenderOptions): elements.Score {
    const config = { ...DEFAULT_CONFIG, ...opts?.config };
    const log = opts?.logger ?? new NoopLogger();

    let root: components.Root;
    let container: HTMLDivElement | HTMLCanvasElement;
    let renderer: vexflow.Renderer;
    switch (config.DRAWING_BACKEND) {
      case 'svg':
        root = components.Root.svg(div, config.HEIGHT ?? undefined);
        container = root.getVexflowContainerElement() as HTMLDivElement;
        renderer = new vexflow.Renderer(container, vexflow.Renderer.Backends.SVG);
        break;
      case 'canvas':
        root = components.Root.canvas(div, config.HEIGHT ?? undefined);
        container = root.getVexflowContainerElement() as HTMLCanvasElement;
        renderer = new vexflow.Renderer(container, vexflow.Renderer.Backends.CANVAS);
        break;
      default:
        log.info(`backend not specified or supported, defaulting to 'svg'`);
        root = components.Root.svg(div, config.HEIGHT ?? undefined);
        container = root.getVexflowContainerElement() as HTMLDivElement;
        renderer = new vexflow.Renderer(container, vexflow.Renderer.Backends.SVG);
    }

    // We'll create a score that thinks the configured dimensions are undefined. This is necessary since the score (and
    // its children) may need to render elements into order to compute rects. This will provide the formatter a
    // mechanism to measure the elements and make decisions on the system layout.
    const unformattedScore = new Score({ ...config, WIDTH: null, HEIGHT: null }, log, this.document);

    const stopwatch = Stopwatch.start();

    const unformattedScoreRender = unformattedScore.render();
    const formatter = this.getFormatter(config, log, unformattedScoreRender);
    const formattedDocument = formatter.format(this.document);
    const formattedScore = new Score(config, log, formattedDocument);

    let lap = stopwatch.lap();
    if (lap < 1) {
      log.info(`formatted score in ${lap.toFixed(3)}ms`);
    } else {
      log.info(`formatted score in ${Math.round(lap)}ms`);
    }

    const formattedScoreRender = formattedScore.render();
    const ctx = renderer.resize(formattedScoreRender.rect.w, formattedScoreRender.rect.h).getContext();
    const scoreElement = elements.Score.create(config, log, formattedDocument, ctx, root, formattedScoreRender);
    scoreElement.render();

    lap = stopwatch.lap();
    if (lap < 1) {
      log.info(`rendered score in ${lap.toFixed(3)}ms`);
    } else {
      log.info(`rendered score in ${Math.round(lap)}ms`);
    }

    return scoreElement;
  }

  private getFormatter(config: Config, log: Logger, scoreRender: ScoreRender): Formatter {
    const width = config.WIDTH;
    const height = config.HEIGHT;

    if (width && !height) {
      log.debug('using UndefinedHeightFormatter');
      return new formatters.UndefinedHeightFormatter(config, log, scoreRender);
    }

    if (!width && height) {
      log.debug('using UndefinedWidthFormatter');
      return new formatters.UndefinedWidthFormatter();
    }

    if (!width && !height) {
      log.debug('using UndefinedWidthFormatter');
      return new formatters.UndefinedWidthFormatter();
    }

    log.debug('using DefaultFormatter');
    return new formatters.DefaultFormatter();
  }
}
