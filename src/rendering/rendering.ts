import * as drawing from '@/drawing';
import * as vexflow from 'vexflow';
import * as components from '@/components';
import { ScoreRender } from './score';
import { Logger } from '@/debug';
import { Config } from './config';
import { Document } from './document';
import { FragmentRender } from './fragment';
import { PartLabelGroupRender } from './partlabelgroup';

export class Rendering {
  private constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private ctx: vexflow.RenderContext,
    private root: components.Root,
    private scoreRender: ScoreRender
  ) {}

  static finalize(
    config: Config,
    log: Logger,
    document: Document,
    ctx: vexflow.RenderContext,
    root: components.Root,
    scoreRender: ScoreRender
  ): Rendering {
    // Draw the title.
    scoreRender.titleRender?.label.setContext(ctx).draw();

    // Draw the part labels.
    scoreRender.systemRenders
      .flatMap((s) => s.measureRenders)
      .flatMap((m) => m.measureEntryRenders)
      .filter((m): m is FragmentRender => m.type === 'fragment')
      .flatMap((f) => f.partLabelGroupRender)
      .filter((p): p is PartLabelGroupRender => p?.type === 'partlabelgroup')
      .flatMap((p) => p.partLabelRenders)
      .forEach((p) => {
        p.label.setContext(ctx).draw();
      });

    // Draw the staves.
    scoreRender.systemRenders
      .flatMap((s) => s.measureRenders)
      .flatMap((m) => m.measureEntryRenders)
      .filter((m): m is FragmentRender => m.type === 'fragment')
      .flatMap((f) => f.partRenders)
      .flatMap((p) => p.staveRenders)
      .forEach((s) => {
        s.vexflowStave.setContext(ctx).draw();
      });

    // Draw the stave connectors.
    // scoreRender.systemRenders
    //   .flatMap((s) => s.measureRenders)
    //   .flatMap((m) => m.measureEntryRenders)
    //   .filter((m): m is FragmentRender => m.type === 'fragment')
    //   .flatMap((f) => f.partRenders)
    //   .flatMap((p) => p.vexflowStaveConnectors)
    //   .forEach((c) => {
    //     c.setContext(ctx).draw();
    //   });

    // Draw the voices.
    scoreRender.systemRenders
      .flatMap((s) => s.measureRenders)
      .flatMap((m) => m.measureEntryRenders)
      .filter((m): m is FragmentRender => m.type === 'fragment')
      .flatMap((f) => f.partRenders)
      .flatMap((p) => p.staveRenders)
      .flatMap((s) => s.voiceRenders)
      .forEach((v) => {
        v.vexflowVoice.setContext(ctx).draw();
      });

    return new Rendering(config, log, document, ctx, root, scoreRender);
  }

  private static debug(ctx: vexflow.RenderContext, bounds: { x: number; y: number; w: number; h: number }): void {
    new drawing.Rect({ bounds, fillStyle: 'rgba(255, 0, 0, 0.35)', strokeStyle: 'red' }).draw(ctx);
  }

  clear(): void {
    this.root.remove();
  }
}
