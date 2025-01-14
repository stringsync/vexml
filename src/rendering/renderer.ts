import * as data from '@/data';
import * as vexflow from 'vexflow';
import * as components from '@/components';
import * as elements from '@/elements';
import * as formatting from '@/formatting';
import { Score } from './score';
import { Config, DEFAULT_CONFIG } from '@/config';
import { Logger, NoopLogger, Stopwatch } from '@/debug';
import { Document } from './document';

export type RenderOptions = {
  formatter?: formatting.Formatter;
  config?: Partial<Config>;
  logger?: Logger;
};

export class Renderer {
  constructor(private document: data.Document) {}

  render(div: HTMLDivElement, opts?: RenderOptions): elements.Score {
    const config = { ...DEFAULT_CONFIG, ...opts?.config };
    const log = opts?.logger ?? new NoopLogger();

    const width = config.WIDTH ?? undefined;
    const height = config.HEIGHT ?? undefined;

    let root: components.Root;
    let container: HTMLDivElement | HTMLCanvasElement;
    let renderer: vexflow.Renderer;
    switch (config.DRAWING_BACKEND) {
      case 'svg':
        root = components.Root.svg(div, width, height);
        container = root.getVexflowContainerElement() as HTMLDivElement;
        renderer = new vexflow.Renderer(container, vexflow.Renderer.Backends.SVG);
        break;
      case 'canvas':
        root = components.Root.canvas(div, width, height);
        container = root.getVexflowContainerElement() as HTMLCanvasElement;
        renderer = new vexflow.Renderer(container, vexflow.Renderer.Backends.CANVAS);
        break;
      default:
        log.info(`backend not specified or supported, defaulting to 'svg'`);
        root = components.Root.svg(div, width, height);
        container = root.getVexflowContainerElement() as HTMLDivElement;
        renderer = new vexflow.Renderer(container, vexflow.Renderer.Backends.SVG);
    }

    let formatter = opts?.formatter;
    if (!formatter) {
      if (width && height) {
        formatter = new formatting.DefaultFormatter();
      } else if (width) {
        formatter = new formatting.DefaultFormatter();
      } else if (height) {
        formatter = new formatting.PanoramicFormatter();
      } else {
        formatter = new formatting.PanoramicFormatter();
      }
    }

    const stopwatch = Stopwatch.start();

    const formattedDocument = formatter.format(config, this.document);
    const renderingDocument = new Document(formattedDocument);
    const scoreRender = new Score(config, log, renderingDocument, config.WIDTH).render();
    const ctx = renderer.resize(scoreRender.rect.w, scoreRender.rect.h).getContext();
    const scoreElement = elements.Score.create(config, log, renderingDocument, ctx, root, scoreRender);
    scoreElement.render();

    const lap = stopwatch.lap();
    if (lap < 1) {
      log.info(`rendered score in ${lap.toFixed(3)}ms`);
    } else {
      log.info(`rendered score in ${Math.round(lap)}ms`);
    }

    return scoreElement;
  }
}
