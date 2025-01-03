import * as vexflow from 'vexflow';
import * as components from '@/components';
import { ScoreRender } from './score';
import { Logger } from '@/debug';
import { Config } from './config';
import { Document } from './document';
import { FragmentRender } from './fragment';
import { PartLabelGroupRender } from './partlabelgroup';
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
    scoreRender.systemRenders
      .flatMap((s) => s.measureRenders)
      .flatMap((m) => m.measureEntryRenders)
      .filter((m): m is FragmentRender => m.type === 'fragment')
      .flatMap((f) => f.partRenders)
      .flatMap((p) => p.vexflowStaveConnectors)
      .forEach((c) => {
        c.setContext(ctx).draw();
      });

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

    // Draw the debug system rects.
    if (config.DEBUG_DRAW_SYSTEM_RECTS) {
      scoreRender.systemRenders.forEach((s) => {
        new DebugRect(config, log, `s${s.key.systemIndex}`, s.rect).setContext(ctx).draw();
      });
    }

    // Draw the debug measure rects.
    if (config.DEBUG_DRAW_MEASURE_RECTS) {
      scoreRender.systemRenders
        .flatMap((s) => s.measureRenders)
        .forEach((m) => {
          new DebugRect(config, log, `m${m.key.measureIndex}`, m.rect).setContext(ctx).draw();
        });
    }

    // Draw the debug stave rects.
    if (config.DEBUG_DRAW_STAVE_RECTS) {
      scoreRender.systemRenders
        .flatMap((s) => s.measureRenders)
        .flatMap((m) => m.measureEntryRenders)
        .filter((m): m is FragmentRender => m.type === 'fragment')
        .flatMap((f) => f.partRenders)
        .flatMap((p) => p.staveRenders)
        .forEach((s) => {
          new DebugRect(config, log, `s${s.key.staveIndex}`, s.rect).setContext(ctx).draw();
        });
    }

    // Draw the debug stave intrinsic rects.
    if (config.DEBUG_DRAW_STAVE_INTRINSIC_RECTS) {
      scoreRender.systemRenders
        .flatMap((s) => s.measureRenders)
        .flatMap((m) => m.measureEntryRenders)
        .filter((m): m is FragmentRender => m.type === 'fragment')
        .flatMap((f) => f.partRenders)
        .flatMap((p) => p.staveRenders)
        .forEach((s) => {
          new DebugRect(config, log, `s${s.key.staveIndex}`, s.intrisicRect).setContext(ctx).draw();
        });
    }

    // Draw the debug voice rects.
    if (config.DEBUG_DRAW_VOICE_RECTS) {
      scoreRender.systemRenders
        .flatMap((s) => s.measureRenders)
        .flatMap((m) => m.measureEntryRenders)
        .filter((m): m is FragmentRender => m.type === 'fragment')
        .flatMap((f) => f.partRenders)
        .flatMap((p) => p.staveRenders)
        .flatMap((s) => s.voiceRenders)
        .forEach((v) => {
          new DebugRect(config, log, `v${v.key.voiceIndex}`, v.rect).setContext(ctx).draw();
        });
    }

    // Draw the debug voice entries.
    if (config.DEBUG_DRAW_VOICE_ENTRY_RECTS) {
      const style = { fill: 'rgba(255, 0, 0, 0.1)' };

      scoreRender.systemRenders
        .flatMap((s) => s.measureRenders)
        .flatMap((m) => m.measureEntryRenders)
        .filter((m): m is FragmentRender => m.type === 'fragment')
        .flatMap((f) => f.partRenders)
        .flatMap((p) => p.staveRenders)
        .flatMap((s) => s.voiceRenders)
        .flatMap((v) => v.entryRenders)
        .forEach((e) => {
          new DebugRect(config, log, `e${e.key.voiceEntryIndex}`, e.rect, style).setContext(ctx).draw();
        });
    }

    return new Rendering(config, log, document, ctx, root, scoreRender);
  }

  clear(): void {
    this.root.remove();
  }
}
