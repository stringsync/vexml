import * as components from '@/components';
import * as vexflow from 'vexflow';
import { Document } from './document';
import { Logger } from '@/debug';
import { Config } from './config';
import { Rendering } from './rendering';
import { Score } from './score';

/** Formats unpositioned rendered elements. */
export class Prerendering {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private width: number,
    private height: number
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

    const score = new Score(this.config, this.log, this.document).render();
    const rect = score.getRect();
    const ctx = renderer.resize(rect.w, rect.h).getContext();
    score.setContext(ctx).draw();

    return new Rendering(root, { score });
  }
}
