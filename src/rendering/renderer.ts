import * as data from '@/data';
import * as vexflow from 'vexflow';
import * as components from '@/components';
import * as elements from '@/elements';
import * as formatting from '@/formatting';
import { Score } from './score';
import { Config, DEFAULT_CONFIG } from '@/config';
import { Logger, NoopLogger, Stopwatch } from '@/debug';
import { Document } from './document';

export type RendererOptions = {
  formatter?: formatting.Formatter;
  config?: Partial<Config>;
  logger?: Logger;
};

export class Renderer {
  private config: Config;
  private log: Logger;

  constructor(opts?: RendererOptions) {
    this.config = { ...DEFAULT_CONFIG, ...opts?.config };
    this.log = opts?.logger ?? new NoopLogger();
  }

  render(div: HTMLDivElement, document: data.Document): elements.Score {
    const width = this.config.WIDTH ?? undefined;
    const height = this.config.HEIGHT ?? undefined;

    let root: components.Root;
    let container: HTMLDivElement | HTMLCanvasElement;
    let renderer: vexflow.Renderer;
    switch (this.config.DRAWING_BACKEND) {
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
        this.log.info(`backend not specified or supported, defaulting to 'svg'`);
        root = components.Root.svg(div, width, height);
        container = root.getVexflowContainerElement() as HTMLDivElement;
        renderer = new vexflow.Renderer(container, vexflow.Renderer.Backends.SVG);
    }

    const stopwatch = Stopwatch.start();

    const renderingDocument = new Document(document);
    const scoreRender = new Score(this.config, this.log, renderingDocument, this.config.WIDTH).render();
    const ctx = renderer.resize(scoreRender.rect.w, scoreRender.rect.h).getContext();
    const scoreElement = elements.Score.create(this.config, this.log, renderingDocument, ctx, root, scoreRender);
    scoreElement.render();

    const lap = stopwatch.lap();
    if (lap < 1) {
      this.log.info(`rendered score in ${lap.toFixed(3)}ms`);
    } else {
      this.log.info(`rendered score in ${Math.round(lap)}ms`);
    }

    return scoreElement;
  }
}
