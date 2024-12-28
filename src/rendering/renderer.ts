import * as data from '@/data';
import * as elements from '@/elements';
import * as components from '@/components';
import * as vexflow from 'vexflow';
import { Document } from './document';
import { Score } from './score';
import { Config, DEFAULT_CONFIG } from './config';
import { Logger, NoopLogger } from '@/debug';
import { System } from './system';
import { Title } from './title';

export type RenderOptions = {
  config?: Partial<Config>;
  logger?: Logger;
};

export class Renderer {
  private document: Document;

  constructor(document: data.Document) {
    this.document = new Document(document);
  }

  render(element: HTMLDivElement, opts?: RenderOptions): elements.Score {
    const config = { ...DEFAULT_CONFIG, ...opts?.config };
    const log = opts?.logger || new NoopLogger();

    const root = this.getRoot(element, config, log);
    const ctx = this.getRenderingCtx(root);

    const start = performance.now();
    log.debug('prerender start');

    const result = this.renderScore(ctx, new Score(config, log, this.document));

    const end = performance.now();
    log.debug('prerender stop', { duration: `${end - start}ms` });

    return result;
  }

  private getRoot(container: HTMLDivElement, config: Config, log: Logger): components.Root {
    switch (config.DRAWING_BACKEND) {
      case 'svg':
        return components.Root.svg(container, config.HEIGHT ?? undefined);
      case 'canvas':
        return components.Root.canvas(container, config.HEIGHT ?? undefined);
      default:
        log.info(`backend not specified or supported, defaulting to 'svg'`);
        return components.Root.svg(container, config.HEIGHT ?? undefined);
    }
  }

  private getRenderingCtx(root: components.Root): vexflow.RenderContext {
    const container = root.getVexflowContainerElement();
    if (container instanceof HTMLCanvasElement) {
      return new vexflow.Renderer(container, vexflow.Renderer.Backends.CANVAS).getContext();
    }
    return new vexflow.Renderer(container, vexflow.Renderer.Backends.SVG).getContext();
  }

  private renderScore(ctx: vexflow.RenderContext, score: Score): elements.Score {
    const title = this.renderTitle(ctx, score.getTitle());

    return new elements.Score(title, []);
  }

  private renderTitle(ctx: vexflow.RenderContext, title: Title): elements.Title {
    const text = title.getText();
    text.draw(ctx);

    return new elements.Title(text);
  }

  private renderSystem(system: System): elements.System {
    throw new Error('Not implemented');
  }
}
