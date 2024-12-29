import * as components from '@/components';
import * as vexflow from 'vexflow';
import * as elements from '@/elements';
import * as formats from './formats';
import { Document } from './document';
import { Logger } from '@/debug';
import { Config } from './config';
import { Rendering } from './rendering';
import { Score } from './score';
import { Format } from './types';

/** Formats unpositioned rendered elements. */
export class Prerendering {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private elements: { score: elements.Score }
  ) {}

  render(element: HTMLDivElement): Rendering {
    let root: components.Root;
    let container: HTMLDivElement | HTMLCanvasElement;
    let renderer: vexflow.Renderer;
    switch (this.config.DRAWING_BACKEND) {
      case 'svg':
        root = components.Root.svg(element, this.config.HEIGHT ?? undefined);
        container = root.getVexflowContainerElement() as HTMLDivElement;
        renderer = new vexflow.Renderer(container, vexflow.Renderer.Backends.SVG);
        break;
      case 'canvas':
        root = components.Root.canvas(element, this.config.HEIGHT ?? undefined);
        container = root.getVexflowContainerElement() as HTMLCanvasElement;
        renderer = new vexflow.Renderer(container, vexflow.Renderer.Backends.CANVAS);
        break;
      default:
        this.log.info(`backend not specified or supported, defaulting to 'svg'`);
        root = components.Root.svg(element, this.config.HEIGHT ?? undefined);
        container = root.getVexflowContainerElement() as HTMLDivElement;
        renderer = new vexflow.Renderer(container, vexflow.Renderer.Backends.SVG);
    }

    const format = this.format();

    renderer.resize(format.getScoreWidth(), format.getScoreHeight());
    const ctx = renderer.getContext();

    const score = new Score(this.config, this.log, this.document, format).render(ctx).draw();

    return new Rendering(root, { score });
  }

  private format(): Format {
    const width = this.config.WIDTH;
    const height = this.config.HEIGHT;

    if (width && height) {
      return new formats.PagedFormat();
    } else if (width) {
      return new formats.InfiniteHeightFormat(this.config, this.elements, width);
    } else {
      return new formats.InfiniteWidthFormat();
    }
  }
}
