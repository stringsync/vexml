import * as rendering from '@/rendering';
import * as vexflow from 'vexflow';
import * as components from '@/components';
import * as util from '@/util';
import * as playback from '@/playback';
import { Config } from '@/config';
import { VexmlElement } from './types';
import { Point, Rect } from '@/spatial';
import { EventListener } from '@/events';
import { Logger } from '@/debug';
import { EventMap } from './types';
import { System } from './system';
import { Events } from './events';
import { Locator } from './locator';
import { Measure } from './measure';

/** Score is a rendered musical score. */
export class Score {
  private isEventsCreated = false;
  private cursors = new Array<playback.Cursor>();

  private constructor(
    private config: Config,
    private log: Logger,
    private document: rendering.Document,
    private ctx: vexflow.RenderContext,
    private root: components.Root,
    private scoreRender: rendering.ScoreRender,
    private systems: System[]
  ) {}

  static create(
    config: Config,
    log: Logger,
    document: rendering.Document,
    ctx: vexflow.RenderContext,
    root: components.Root,
    scoreRender: rendering.ScoreRender
  ): Score {
    const systems = scoreRender.systemRenders.map((systemRender) => System.create(config, log, document, systemRender));
    return new Score(config, log, document, ctx, root, scoreRender, systems);
  }

  /** The name of the element, which can be used as a type discriminant. */
  public readonly name = 'score';

  /** Returns the bounding box of the element. */
  rect(): Rect {
    return this.scoreRender.rect;
  }

  /** Returns the element that houses the VexFlow score. */
  getVexflowElement(): SVGElement | HTMLCanvasElement {
    return this.root.getVexflowElement();
  }

  /** Returns the element used as an overlay. */
  getOverlayElement(): HTMLDivElement {
    return this.root.getOverlay().getElement();
  }

  /** Returns the element used for the scroll container. */
  getScrollContainer(): HTMLDivElement {
    return this.root.getScrollContainer();
  }

  addCursor(opts?: { partIndex?: number }): playback.Cursor {
    const partIndex = opts?.partIndex ?? 0;
    const sequence = this.getSequences().find((sequence) => sequence.getPartIndex() === partIndex);
    util.assertDefined(sequence);
    const cursor = playback.Cursor.create(this.root.getScrollContainer(), this, partIndex, sequence);
    this.cursors.push(cursor);
    return cursor;
  }

  /** Returns the title of the score. */
  getTitle(): string | null {
    return this.document.getTitle();
  }

  /** Returns the systems of the score. */
  getSystems(): System[] {
    return this.systems;
  }

  /** Returns the measures of the score. */
  getMeasures(): Measure[] {
    return this.systems.flatMap((system) => system.getMeasures());
  }

  /** Returns the duration of the score in milliseconds. */
  getDurationMs(): number {
    return Math.max(0, ...this.getSequences().map((sequence) => sequence.getDuration().ms));
  }

  /** Returns the max number of parts in this score. */
  getPartCount(): number {
    return Math.max(0, ...this.systems.map((system) => system.getPartCount()));
  }

  /** Removes the score from the DOM. */
  destroy(): void {
    this.root?.remove();

    if (this.isEventsCreated) {
      this.events().removeAllEventListeners();
    }

    for (const cursor of this.cursors) {
      cursor.removeAllEventListeners();
    }
  }

  /** Dispatches a native event to the overlay. */
  dispatchNativeEvent(event: Event): void {
    this.events().dispatchNativeEvent(event);
  }

  /** Adds an event listener to the score. */
  addEventListener<N extends keyof EventMap>(type: N, listener: EventListener<EventMap[N]>): number {
    return this.events().addEventListener(type, listener);
  }

  /** Removes an event listener from the score. */
  removeEventListener(...ids: number[]): void {
    this.events().removeEventListener(...ids);
  }

  /**
   * Returns all the elements at a given point.
   *
   * Functions similar to document.elementsFromPoint.
   * See https://developer.mozilla.org/en-US/docs/Web/API/Document/elementsFromPoint
   */
  elementsFromPoint(x: number, y: number): VexmlElement[] {
    const point = new Point(x, y);
    // TODO: Order the elements by [paint order, distance]. The score should always be the last element.
    return this.getElementLocator().locate(point);
  }

  /** Renders the entire score. */
  render(): void {
    // TODO: For now, Score is the only renderable object. Eventually, I think it will be good to render/unrender
    // subtrees of elements. This will unlock lazy rendering, which is useful for large scores and editing.

    // Collect all the render objects.
    const config = this.config;
    const log = this.log;
    const ctx = this.ctx;
    const scoreRender = this.scoreRender;
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

    // Draw gap overlays.
    fragmentRenders
      .map((f) => f.gapOverlay)
      .forEach((g) => {
        g?.setContext(ctx).draw();
      });

    // Draw the debug system rects.
    if (config.DEBUG_DRAW_SYSTEM_RECTS) {
      systemRenders.forEach((s) => {
        new rendering.DebugRect(config, log, `s${s.key.systemIndex}`, s.rect).setContext(ctx).draw();
      });
    }

    // Draw the debug measure rects.
    if (config.DEBUG_DRAW_MEASURE_RECTS) {
      measureRenders.forEach((m) => {
        new rendering.DebugRect(config, log, `m${m.key.measureIndex}`, m.rect).setContext(ctx).draw();
      });
    }

    // Draw the debug fragment rects.
    if (config.DEBUG_DRAW_FRAGMENT_RECTS) {
      fragmentRenders.forEach((f) => {
        new rendering.DebugRect(config, log, `f${f.key.fragmentIndex}`, f.rect).setContext(ctx).draw();
      });
    }

    if (config.DEBUG_DRAW_PART_RECTS) {
      partRenders.forEach((p) => {
        new rendering.DebugRect(config, log, `p${p.key.partIndex}`, p.rect).setContext(ctx).draw();
      });
    }

    // Draw the debug stave rects.
    if (config.DEBUG_DRAW_STAVE_RECTS) {
      staveRenders.forEach((s) => {
        new rendering.DebugRect(config, log, `s${s.key.staveIndex}`, s.rect).setContext(ctx).draw();
      });
    }

    // Draw the debug stave intrinsic rects.
    if (config.DEBUG_DRAW_STAVE_INTRINSIC_RECTS) {
      staveRenders.forEach((s) => {
        new rendering.DebugRect(config, log, `s${s.key.staveIndex}`, s.intrinsicRect).setContext(ctx).draw();
      });
    }

    // Draw the debug stave plyable rects.
    if (config.DEBUG_DRAW_STAVE_PLAYABLE_RECTS) {
      staveRenders.forEach((s) => {
        new rendering.DebugRect(config, log, `s${s.key.staveIndex}`, s.playableRect).setContext(ctx).draw();
      });
    }

    // Draw the debug voice rects.
    if (config.DEBUG_DRAW_VOICE_RECTS) {
      voiceRenders.forEach((v) => {
        new rendering.DebugRect(config, log, `v${v.key.voiceIndex}`, v.rect).setContext(ctx).draw();
      });
    }

    // Draw the debug voice entries.
    if (config.DEBUG_DRAW_VOICE_ENTRY_RECTS) {
      const style = { fill: 'rgba(255, 0, 0, 0.1)' };

      voiceEntryRenders.forEach((e) => {
        new rendering.DebugRect(config, log, `e${e.key.voiceEntryIndex}`, e.rect, style).setContext(ctx).draw();
      });
    }
  }

  @util.memoize()
  private events(): Events {
    this.isEventsCreated = true;
    return Events.create(this.config, this.root, this.getElementLocator(), this.getTimestampLocator());
  }

  @util.memoize()
  private getSequences(): playback.Sequence[] {
    const sequences = new playback.SequenceFactory(this.log, this).create();
    return sequences;
  }

  @util.memoize()
  private getElementLocator(): Locator {
    return Locator.create(this);
  }

  @util.memoize()
  private getTimestampLocator(): playback.TimestampLocator {
    return playback.TimestampLocator.create(this, this.getSequences());
  }
}
