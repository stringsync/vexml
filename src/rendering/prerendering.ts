import * as components from '@/components';
import * as vexflow from 'vexflow';
import * as elements from '@/elements';
import { Document } from './document';
import { Logger } from '@/debug';
import { Config } from './config';
import { Rendering } from './rendering';
import { Score } from './score';

/**
 * An intermediate data container that houses unpositioned elements for the purpose of querying their width and height.
 */
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

    const ctx = renderer.getContext();

    // TODO: Copy the document, format the width and positions of the elements, and render them.

    const score = new Score(this.config, this.log, this.document).render(ctx);

    return new Rendering(root, { score });
  }
}
