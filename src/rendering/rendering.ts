import * as vexflow from 'vexflow';
import * as components from '@/components';
import { ScoreRender } from './score';
import { Logger } from '@/debug';
import { Config } from './config';
import { Document } from './document';
import { DebugRect } from './debugrect';

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
    // Collect all the render objects.
    const titleRender = scoreRender.titleRender;
    const systemRenders = scoreRender.systemRenders;
    const measureRenders = systemRenders.flatMap((s) => s.measureRenders);
    const measureEntryRenders = measureRenders.flatMap((m) => m.entryRenders);
    const partLabelGroupRenders = measureEntryRenders.flatMap((m) => m.partLabelGroupRender ?? []);
    const partLabelRenders = partLabelGroupRenders.flatMap((p) => p.partLabelRenders);
    const partRenders = measureEntryRenders.flatMap((m) => m.partRenders);
    const staveRenders = partRenders.flatMap((p) => p.staveRenders);
    const voiceRenders = staveRenders.flatMap((s) => s.voiceRenders);
    const voiceEntryRenders = voiceRenders.flatMap((v) => v.entryRenders);

    // Draw the title.
    titleRender?.label.setContext(ctx).draw();

    // Draw the part labels.
    partLabelRenders.forEach((p) => {
      p.label.setContext(ctx).draw();
    });

    // Draw the staves.
    staveRenders.forEach((s) => {
      s.vexflowStave.setContext(ctx).draw();
    });

    // Draw the stave braces.
    partRenders
      .flatMap((p) => p.vexflowBrace)
      .filter((b) => b !== null)
      .forEach((v) => {
        v.setContext(ctx).draw();
      });

    // Draw the stave connectors.
    measureEntryRenders
      .flatMap((m) => m.vexflowStaveConnectors)
      .forEach((v) => {
        v.setContext(ctx).draw();
      });

    // Draw the voices.
    voiceRenders.forEach((v) => {
      v.vexflowVoice.setContext(ctx).draw();
    });

    // Draw the multi rests.
    staveRenders.forEach((s) => {
      s.vexflowMultiMeasureRest?.setContext(ctx).draw();
    });

    // Draw the debug system rects.
    if (config.DEBUG_DRAW_SYSTEM_RECTS) {
      systemRenders.forEach((s) => {
        new DebugRect(config, log, `s${s.key.systemIndex}`, s.rect).setContext(ctx).draw();
      });
    }

    // Draw the debug measure rects.
    if (config.DEBUG_DRAW_MEASURE_RECTS) {
      measureRenders.forEach((m) => {
        new DebugRect(config, log, `m${m.key.measureIndex}`, m.rect).setContext(ctx).draw();
      });
    }

    // Draw the debug stave rects.
    if (config.DEBUG_DRAW_STAVE_RECTS) {
      staveRenders.forEach((s) => {
        new DebugRect(config, log, `s${s.key.staveIndex}`, s.rect).setContext(ctx).draw();
      });
    }

    // Draw the debug stave intrinsic rects.
    if (config.DEBUG_DRAW_STAVE_INTRINSIC_RECTS) {
      staveRenders.forEach((s) => {
        new DebugRect(config, log, `s${s.key.staveIndex}`, s.intrisicRect).setContext(ctx).draw();
      });
    }

    // Draw the debug voice rects.
    if (config.DEBUG_DRAW_VOICE_RECTS) {
      voiceRenders.forEach((v) => {
        new DebugRect(config, log, `v${v.key.voiceIndex}`, v.rect).setContext(ctx).draw();
      });
    }

    // Draw the debug voice entries.
    if (config.DEBUG_DRAW_VOICE_ENTRY_RECTS) {
      const style = { fill: 'rgba(255, 0, 0, 0.1)' };

      voiceEntryRenders.forEach((e) => {
        new DebugRect(config, log, `e${e.key.voiceEntryIndex}`, e.rect, style).setContext(ctx).draw();
      });
    }

    return new Rendering(config, log, document, ctx, root, scoreRender);
  }

  clear(): void {
    this.root.remove();
  }
}
