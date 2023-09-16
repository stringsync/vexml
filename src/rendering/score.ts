import { System, SystemRendering } from './system';
import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';
import * as util from '@/util';
import { Config, DEFAULT_CONFIG } from './config';

// Space needed to be able to show the end barlines.
const END_BARLINE_OFFSET = 1;

/** The result of rendering a Score. */
export type ScoreRendering = {
  type: 'score';
  systems: SystemRendering[];
};

/**
 * Represents a Score in a musical composition, serving as the top-level container for all musical elements and
 * metadata. The Score encompasses the entirety of a piece, housing individual parts, systems, and other musical
 * components. It also provides contextual information like title, composer, and other pertinent details.
 */
export class Score {
  private config: Config;
  private system: System;
  private staffLayouts: musicxml.StaffLayout[];
  private systemLayout: musicxml.SystemLayout | null;

  private constructor(opts: {
    config: Config;
    system: System;
    staffLayouts: musicxml.StaffLayout[];
    systemLayout: musicxml.SystemLayout | null;
  }) {
    this.config = opts.config;
    this.system = opts.system;
    this.staffLayouts = opts.staffLayouts;
    this.systemLayout = opts.systemLayout;
  }

  /** Creates a Score. */
  static create(opts: { musicXml: musicxml.MusicXml; config?: Partial<Config> }): Score {
    const config = { ...DEFAULT_CONFIG, ...opts.config };
    const scorePartwise = opts.musicXml.getScorePartwise();
    const parts = scorePartwise?.getParts() ?? [];
    const defaults = scorePartwise?.getDefaults() ?? null;
    const staffLayouts = defaults?.getStaffLayouts() ?? [];
    const systemLayout = defaults?.getSystemLayout() ?? null;

    const system = System.create({ config, musicXml: { parts } });

    return new Score({ system, staffLayouts, systemLayout, config });
  }

  /** Renders the Score. */
  render(opts: { element: HTMLDivElement | HTMLCanvasElement; width: number }): ScoreRendering {
    // Track the system rendering results.
    const systemRenderings = new Array<SystemRendering>();

    // Split the main system into smaller ones to fit in the width.
    const systems = this.system.split(opts.width);

    let y = this.systemLayout?.topSystemDistance ?? 0;

    // Render the entire hierarchy.
    for (let index = 0; index < systems.length; index++) {
      const system = systems[index];
      const systemRendering = system.render({
        x: 0,
        y,
        width: opts.width - END_BARLINE_OFFSET,
        isLastSystem: index === systems.length - 1,
        staffLayouts: this.staffLayouts,
      });
      systemRenderings.push(systemRendering);

      // Height is calculated during render time to avoid duplicate work that would've been done if we were using
      // instance methods on the rendering.Stave object.
      const maxY = util.max([
        y,
        ...systemRendering.parts
          .flatMap((part) => part.measures)
          .flatMap((measure) => measure.staves)
          .map((stave) => {
            const box = stave.vexflow.stave.getBoundingBox();
            return box.getY() + box.getH();
          }),
      ]);
      const height = maxY - y;

      y += height;
      y += this.systemLayout?.systemDistance ?? this.config.defaultSystemDistance;
    }

    // Get a reference to the staves.
    const staves = systemRenderings
      .flatMap((system) => system.parts)
      .flatMap((part) => part.measures)
      .flatMap((measure) => measure.staves);

    const vfRenderer = new vexflow.Renderer(opts.element, vexflow.Renderer.Backends.SVG);
    vfRenderer.resize(opts.width, y);
    const vfContext = vfRenderer.getContext();

    // Render vexflow.Stave elements.
    const vfStaves = staves.map((stave) => stave.vexflow.stave);
    for (const vfStave of vfStaves) {
      vfStave.setContext(vfContext).draw();
    }

    // Render vexflow.Voice elements.
    const vfVoices = staves.flatMap((stave) => stave.voices).map((voice) => voice.vexflow.voice);
    for (const vfVoice of vfVoices) {
      vfVoice.setContext(vfContext).draw();
    }

    return { type: 'score', systems: systemRenderings };
  }
}
