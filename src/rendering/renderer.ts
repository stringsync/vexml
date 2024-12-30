import * as data from '@/data';
import * as formatters from './formatters';
import * as vexflow from 'vexflow';
import * as components from '@/components';
import { Document } from './document';
import { Score } from './score';
import { Config, DEFAULT_CONFIG } from './config';
import { Logger, NoopLogger } from '@/debug';
import { Rendering } from './rendering';
import { Formatter } from './types';

export type RenderOptions = {
  config?: Partial<Config>;
  logger?: Logger;
};

export class Renderer {
  private document: Document;

  constructor(document: data.Document) {
    this.document = new Document(document);
  }

  render(div: HTMLDivElement, opts?: RenderOptions): Rendering {
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

    const unformattedScore = new Score(config, log, this.document);
    const formatter = this.getFormatter(config, log, unformattedScore);
    const formattedDocument = formatter.format();
    const formattedScore = new Score(config, log, formattedDocument);

    const ctx = renderer.resize(formattedScore.rect.w, formattedScore.rect.h).getContext();

    formattedScore.render(ctx);

    return new Rendering(root, formattedScore);
  }

  private getFormatter(config: Config, log: Logger, score: Score): Formatter {
    const width = config.WIDTH;
    const height = config.HEIGHT;

    if (width && !height) {
      log.debug('using UndefinedHeightFormatter');
      return new formatters.UndefinedHeightFormatter(config, log, this.document, score);
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
