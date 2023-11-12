import { SystemRendering } from './system';
import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';
import * as util from '@/util';
import { Config } from './config';
import { Title, TitleRendering } from './title';
import { MultiRestRendering } from './multirest';
import { ChorusRendering } from './chorus';
import { Seed } from './seed';
import { NoteRendering } from './note';
import { ChordRendering } from './chord';
import { RestRendering } from './rest';
import { Spanners } from './spanners';
import { Address } from './address';

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
  private musicXml: {
    scorePartwise: musicxml.ScorePartwise | null;
  };

  constructor(opts: {
    config: Config;
    musicXml: {
      scorePartwise: musicxml.ScorePartwise | null;
    };
  }) {
    this.config = opts.config;
    this.musicXml = opts.musicXml;
  }

  /** Renders the Score. */
  render(opts: { element: HTMLDivElement | HTMLCanvasElement; width: number }): ScoreRendering {
    // Track the system rendering results.
    const systemRenderings = new Array<SystemRendering>();

    // Create the systems.
    const systems = this.seed().split(opts.width);

    // Initialize the rendering coordinates.
    const x = 0;
    let y = 0;

    // Draw the title if it has text.
    let titleRendering: TitleRendering | null = null;
    const title = this.getTitle();
    if (title.hasText()) {
      y += this.config.TITLE_TOP_PADDING;
      titleRendering = title.render({ y, containerWidth: opts.width });
      y += titleRendering.approximateHeight;
    }

    y += this.getTopSystemDistance();

    // Render the entire hierarchy.
    util.forEachTriple(systems, ([previousSystem, currentSystem, nextSystem], { isLast }) => {
      const systemRendering = currentSystem.render({
        x,
        y,
        width: opts.width - END_BARLINE_OFFSET,
        isLastSystem: isLast,
        previousSystem,
        nextSystem,
      });
      systemRenderings.push(systemRendering);

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
      y += this.getSystemDistance();
    });

    // Render spanners.
    const spanners = this.getSpanners(systemRenderings).render();

    // Precalculate different parts of the rendering for readability later.
    const parts = systemRenderings.flatMap((system) => system.parts);
    const measures = parts.flatMap((part) => part.measures);
    const measureFragments = measures.flatMap((measure) => measure.fragments);
    const staves = measureFragments.flatMap((measureFragment) => measureFragment.staves);

    // Prepare the vexflow rendering objects.
    const vfRenderer = new vexflow.Renderer(opts.element, vexflow.Renderer.Backends.SVG).resize(opts.width, y);
    const vfContext = vfRenderer.getContext();

    // Draw the title.
    titleRendering?.text.draw(vfContext);

    // Draw vexflow.Stave elements.
    staves
      .map((stave) => stave.vexflow.stave)
      .forEach((vfStave) => {
        vfStave.setContext(vfContext).draw();
      });

    // Draw vexflow.StaveConnector elements from measures.
    measures
      .flatMap((measure) => measure.vexflow.staveConnectors)
      .forEach((vfStaveConnector) => {
        vfStaveConnector.setContext(vfContext).draw();
      });

    // Draw vexflow.StaveConnector elements from parts.
    parts
      .map((part) => part.vexflow.staveConnector)
      .forEach((vfStaveConnector) => {
        vfStaveConnector?.setContext(vfContext).draw();
      });

    // Draw vexflow.MultiMeasureRest elements.
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

    // Format and draw vexflow.Voice elements.
    staves.forEach((stave) => {
      if (stave.entry.type !== 'chorus') {
        return;
      }
      const vfStave = stave.vexflow.stave;
      const vfVoices = stave.entry.voices.map((voice) => voice.vexflow.voice);

      if (vfVoices.some((vfVoice) => vfVoice.getTickables().length > 0)) {
        new vexflow.Formatter().joinVoices(vfVoices).formatToStave(vfVoices, vfStave);
      }

      vfVoices.forEach((vfVoice) => {
        vfVoice.setContext(vfContext).draw();
      });
    });

    // Draw vexflow.Beam elements.
    spanners.beams
      .map((beam) => beam.vexflow.beam)
      .forEach((vfBeam) => {
        vfBeam.setContext(vfContext).draw();
      });

    // Draw vexflow.StaveTie elements.
    spanners.slurs
      .flatMap((slur) => slur.vexflow.tie)
      .forEach((vfStaveTie) => {
        vfStaveTie.setContext(vfContext).draw();
      });

    // Draw vexflow.Tuplet elements.
    spanners.tuplets
      .map((tuplet) => tuplet.vexflow.tuplet)
      .forEach((vfTuplet) => {
        vfTuplet.setContext(vfContext).draw();
      });

    // Draw vexflow.StaveHairpin elements.
    spanners.wedges
      .map((wedge) => wedge.vexflow.staveHairpin)
      .forEach((vfStaveHairpin) => {
        vfStaveHairpin.setContext(vfContext).draw();
      });

    // Draw vexflow.Ornament wavy line elements.
    spanners.wavyLines
      .flatMap((wavyLine) => wavyLine.vexflow.ornaments)
      .forEach((ornament) => {
        ornament.setContext(vfContext).draw();
      });

    // Draw vexflow.TextBracket elements.
    spanners.octaveShifts
      .map((octaveShift) => octaveShift.vexflow.textBracket)
      .forEach((vfTextBracket) => {
        vfTextBracket.setContext(vfContext).draw();
      });

    // Draw measure labels.
    measures
      .map((measure) => measure.label)
      .forEach((label) => {
        label.draw(vfContext);
      });

    return { type: 'score', systems: systemRenderings };
  }

  @util.memoize()
  private seed(): Seed {
    return new Seed({
      config: this.config,
      musicXml: {
        parts: this.musicXml.scorePartwise?.getParts() ?? [],
        staveLayouts: this.musicXml.scorePartwise?.getDefaults()?.getStaveLayouts() ?? [],
      },
    });
  }

  @util.memoize()
  private getSystemLayout() {
    return this.musicXml.scorePartwise?.getDefaults()?.getSystemLayout() ?? null;
  }

  @util.memoize()
  private getSystemDistance() {
    return this.getSystemLayout()?.systemDistance ?? this.config.DEFAULT_SYSTEM_DISTANCE;
  }

  @util.memoize()
  private getTopSystemDistance() {
    return this.getSystemLayout()?.topSystemDistance ?? 0;
  }

  @util.memoize()
  private getTitle() {
    return new Title({
      config: this.config,
      text: this.musicXml.scorePartwise?.getTitle() ?? '',
    });
  }

  private getSpanners(systemRenderings: SystemRendering[]): Spanners {
    const entries = systemRenderings.flatMap((system) => {
      const systemId = Symbol();
      const address = new Address(systemId);

      return system.parts
        .flatMap((part) => part.measures.flatMap((measure) => measure.fragments))
        .flatMap((fragment) => fragment.staves)
        .flatMap((stave) => stave.entry)
        .filter((entry): entry is ChorusRendering => entry.type === 'chorus')
        .flatMap((entry) => entry.voices)
        .flatMap((voice) => voice.entries)
        .filter(
          (entry): entry is NoteRendering | ChordRendering | RestRendering =>
            entry.type === 'note' || entry.type === 'chord' || entry.type === 'rest'
        )
        .flatMap((entry) => {
          switch (entry.type) {
            case 'note':
            case 'rest':
              return entry.spannerFragments;
            case 'chord':
              return util.first(entry.notes)?.spannerFragments ?? [];
          }
        })
        .map((fragment) => ({ address, fragment }));
    });

    return new Spanners({ entries });
  }
}
