import * as vexflow from 'vexflow';
import * as components from '@/components';
import { Logger } from '@/debug';
import { Config } from './config';
import { Document } from './document';
import { DebugRect } from './debugrect';
import { ScoreRender } from './types';

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
    const fragmentRenders = measureRenders.flatMap((m) => m.fragmentRenders);
    const partLabelGroupRenders = fragmentRenders.flatMap((m) => m.partLabelGroupRender ?? []);
    const partLabelRenders = partLabelGroupRenders.flatMap((p) => p.partLabelRenders);
    const partRenders = fragmentRenders.flatMap((m) => m.partRenders);
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
    fragmentRenders
      .flatMap((m) => m.vexflowStaveConnectors)
      .forEach((v) => {
        v.setContext(ctx).draw();
      });

    // Draw the voices.
    voiceRenders
      .flatMap((v) => v.vexflowVoices)
      .forEach((v) => {
        v.setContext(ctx).draw();
      });

    // Draw the non-grace beams.
    voiceRenders
      .flatMap((v) => v.beamRenders)
      .flatMap((b) => b.vexflowBeams)
      .forEach((v) => {
        v.setContext(ctx).draw();
      });

    // Draw the grace beams.
    voiceEntryRenders
      .filter((e) => e.type === 'note')
      .flatMap((e) => e.graceBeamRenders)
      .flatMap((b) => b.vexflowBeams)
      .forEach((v) => {
        v.setContext(ctx).draw();
      });

    // Draw the curves.
    scoreRender.curveRenders
      .flatMap((c) => c.vexflowElements)
      .forEach((v) => {
        v.setContext(ctx).draw();
      });

    // Draw the tuplets.
    voiceRenders
      .flatMap((v) => v.tupletRenders)
      .forEach((t) => {
        t.vexflowTuplet.setContext(ctx).draw();
      });

    // Draw the multi rests.
    staveRenders.forEach((s) => {
      s.vexflowMultiMeasureRest?.setContext(ctx).draw();
    });

    // Draw the stave hairpins.
    scoreRender.wedgeRenders
      .flatMap((w) => w.vexflowStaveHairpins)
      .forEach((v) => {
        v.setContext(ctx).draw();
      });

    // Draw pedal markings.
    scoreRender.pedalRenders
      .flatMap((p) => p.vexflowPedalMarkings)
      .forEach((v) => {
        v.setContext(ctx).draw();
      });

    // Draw octave shifts.
    scoreRender.octaveShiftRenders
      .flatMap((o) => o.vexflowTextBrackets)
      .forEach((v) => {
        v.setContext(ctx).draw();
      });

    // Draw vibratos brackets.
    scoreRender.vibratoRenders
      .flatMap((v) => v.vexflowVibratoBrackets)
      .forEach((v) => {
        v.setContext(ctx).draw();
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

    // Draw the debug fragment rects.
    if (config.DEBUG_DRAW_FRAGMENT_RECTS) {
      fragmentRenders.forEach((f) => {
        new DebugRect(config, log, `f${f.key.fragmentIndex}`, f.rect).setContext(ctx).draw();
      });
    }

    if (config.DEBUG_DRAW_PART_RECTS) {
      partRenders.forEach((p) => {
        new DebugRect(config, log, `p${p.key.partIndex}`, p.rect).setContext(ctx).draw();
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
        new DebugRect(config, log, `s${s.key.staveIndex}`, s.intrinsicRect).setContext(ctx).draw();
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

  /** Returns the element that vexflow is directly rendered on. */
  getVexflowElement(): SVGElement | HTMLCanvasElement {
    return this.root.getVexflowElement();
  }

  /** Clears the rendering. */
  clear(): void {
    this.root.remove();
  }
}
