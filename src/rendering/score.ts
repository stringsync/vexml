import { System, SystemRendering } from './system';
import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';
import * as util from '@/util';
import { Config, DEFAULT_CONFIG } from './config';
import { Title, TitleRendering } from './title';
import { MultiRestRendering } from './multirest';
import { ChorusRendering } from './chorus';

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
  private systemLayout: musicxml.SystemLayout | null;
  private title: Title;

  private constructor(opts: {
    config: Config;
    system: System;
    staveLayouts: musicxml.StaveLayout[];
    systemLayout: musicxml.SystemLayout | null;
    title: Title;
  }) {
    this.config = opts.config;
    this.system = opts.system;
    this.systemLayout = opts.systemLayout;
    this.title = opts.title;
  }

  /** Creates a Score. */
  static create(opts: { musicXml: musicxml.MusicXml; config?: Partial<Config> }): Score {
    const config = { ...DEFAULT_CONFIG, ...opts.config };
    const scorePartwise = opts.musicXml.getScorePartwise();
    const parts = scorePartwise?.getParts() ?? [];
    const defaults = scorePartwise?.getDefaults() ?? null;
    const staveLayouts = defaults?.getStaveLayouts() ?? [];
    const systemLayout = defaults?.getSystemLayout() ?? null;

    const title = Title.create({ config, text: scorePartwise?.getTitle() ?? '' });
    const system = System.create({ config, staveLayouts, musicXml: { parts } });

    return new Score({ system, staveLayouts, systemLayout, config, title });
  }

  /** Renders the Score. */
  render(opts: { element: HTMLDivElement | HTMLCanvasElement; width: number }): ScoreRendering {
    // Track the system rendering results.
    const systemRenderings = new Array<SystemRendering>();

    // Split the main system into smaller ones to fit in the width.
    const systems = this.system.split(opts.width);

    let y = 0;

    // Produce the title rendering, but only if it has text.
    let titleRendering: TitleRendering | null = null;
    if (this.title.hasText()) {
      y += this.config.TITLE_TOP_PADDING;

      titleRendering = this.title.render({ y, containerWidth: opts.width });

      y += titleRendering.approximateHeight;
    }

    y += this.systemLayout?.topSystemDistance ?? 0;

    // Render the entire hierarchy.
    for (let index = 0; index < systems.length; index++) {
      const system = systems[index];
      const systemRendering = system.render({
        x: 0,
        y,
        width: opts.width - END_BARLINE_OFFSET,
        isLastSystem: index === systems.length - 1,
      });
      systemRenderings.push(systemRendering);

      // Height is calculated during render time to avoid duplicate work that would've been done if we were using
      // instance methods on the rendering.Stave object.
      const maxY = util.max([
        y,
        ...systemRendering.parts
          .flatMap((part) => part.measures)
          .flatMap((measure) => measure.fragments)
          .flatMap((measureFragment) => measureFragment.staves)
          .map((stave) => {
            const box = stave.vexflow.stave.getBoundingBox();
            return box.getY() + box.getH();
          }),
      ]);
      const height = maxY - y;

      y += height;
      y += this.systemLayout?.systemDistance ?? this.config.DEFAULT_SYSTEM_DISTANCE;
    }

    const parts = systemRenderings.flatMap((system) => system.parts);
    const measures = parts.flatMap((part) => part.measures);
    const measureFragments = measures.flatMap((measure) => measure.fragments);
    const staves = measureFragments.flatMap((measureFragment) => measureFragment.staves);

    const vfRenderer = new vexflow.Renderer(opts.element, vexflow.Renderer.Backends.SVG);
    vfRenderer.resize(opts.width, y);
    const vfContext = vfRenderer.getContext();

    // Render the title.
    titleRendering?.text.draw(vfContext);

    // Render vexflow.Stave elements.
    staves
      .map((stave) => stave.vexflow.stave)
      .forEach((vfStave) => {
        vfStave.setContext(vfContext).draw();
      });

    // Render vexflow.StaveConnector elements from measures.
    measures
      .flatMap((measure) => measure.vexflow.staveConnectors)
      .forEach((vfStaveConnector) => {
        vfStaveConnector.setContext(vfContext).draw();
      });

    // Render vexflow.StaveConnector elements from parts.
    parts
      .map((part) => part.vexflow.staveConnector)
      .forEach((vfStaveConnector) => {
        vfStaveConnector?.setContext(vfContext).draw();
      });

    // Render vexflow.MultiMeasureRest elements.
    staves
      .map((stave) => stave.entry)
      .filter((entry): entry is MultiRestRendering => entry.type === 'multirest')
      .map((entry) => entry.vexflow.multiMeasureRest)
      .filter(
        (vfMultiMeasureRest): vfMultiMeasureRest is vexflow.MultiMeasureRest =>
          vfMultiMeasureRest instanceof vexflow.MultiMeasureRest
      )
      .forEach((vfMultiMeasureRest) => {
        vfMultiMeasureRest.setContext(vfContext).draw();
      });

    // Render vexflow.Voice elements.
    staves
      .map((stave) => stave.entry)
      .filter((entry): entry is ChorusRendering => entry.type === 'chorus')
      .flatMap((entry) => entry.voices)
      .map((voice) => voice.vexflow.voice)
      .forEach((vfVoice) => {
        vfVoice.setContext(vfContext).draw();
      });

    // Render vexflow.Beam elements.
    measures
      .flatMap((measure) => measure.fragments)
      .flatMap((fragment) => fragment.vexflow.beams)
      .forEach((vfBeam) => {
        vfBeam.setContext(vfContext).draw();
      });

    // Render measure labels.
    measures
      .map((measure) => measure.label)
      .forEach((label) => {
        label.draw(vfContext);
      });

    return { type: 'score', systems: systemRenderings };
  }
}
