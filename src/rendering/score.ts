import { System, SystemRendering } from './system';
import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';
import * as util from '@/util';
import * as drawables from '@/drawables';
import { Config } from './config';
import { Title, TitleRendering } from './title';
import { MultiRestRendering } from './multirest';
import { Seed } from './seed';
import { Spanners } from './spanners';
import { Address } from './address';
import { ChorusRendering } from './chorus';
import { Rendering } from './rendering';

const Y_SHIFT_PADDING = 10;

/** The result of rendering a Score. */
export type ScoreRendering = {
  type: 'score';
  systems: SystemRendering[];
  container: HTMLDivElement | HTMLCanvasElement;
};

/**
 * Represents a Score in a musical composition, serving as the top-level container for all musical elements and
 * metadata. The Score encompasses the entirety of a piece, housing individual parts, systems, and other musical
 * components. It also provides contextual information like title, composer, and other pertinent details.
 */
export class Score {
  private config: Config;
  private musicXML: {
    scorePartwise: musicxml.ScorePartwise | null;
  };

  constructor(opts: {
    config: Config;
    musicXML: {
      scorePartwise: musicxml.ScorePartwise | null;
    };
  }) {
    this.config = opts.config;
    this.musicXML = opts.musicXML;
  }

  /** Renders the Score. */
  render(opts: { element: HTMLDivElement | HTMLCanvasElement; width: number }): Rendering {
    // Track the system rendering results.
    const systemRenderings = new Array<SystemRendering>();

    // Create the systems.
    const systems = this.seed().split(opts.width);

    // Initialize the rendering coordinates.
    const x = 0;
    let y = 0;

    // Initialize spanners for rendering.
    const spanners = new Spanners();

    // Draw the title if it has text.
    let titleRendering: TitleRendering | null = null;
    const title = this.getTitle();
    if (title.hasText()) {
      y += this.config.TITLE_TOP_PADDING;
      titleRendering = title.render({ y, containerWidth: opts.width });
      y += titleRendering.approximateHeight;
    }

    y += this.getTopSystemDistance(systems);

    // Render the entire hierarchy.
    util.forEachTriple(systems, ([previousSystem, currentSystem, nextSystem]) => {
      const address = Address.system({
        systemIndex: currentSystem.getIndex(),
        origin: 'Score.prototype.render',
      });

      const systemRendering = currentSystem.render({
        x,
        y,
        address,
        previousSystem,
        nextSystem,
        spanners,
      });
      systemRenderings.push(systemRendering);

      // TODO: Add height property to SystemRendering instead.
      const maxY = util.max([
        y,
        ...systemRendering.measures
          .flatMap((measure) => measure.fragments)
          .flatMap((measureFragment) => measureFragment.parts)
          .flatMap((part) => part.staves)
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
    const spannersRendering = spanners.render();

    // Precalculate different parts of the rendering for readability later.
    const measures = systemRenderings.flatMap((system) => system.measures);
    const measureFragments = measures.flatMap((measure) => measure.fragments);
    const parts = measureFragments.flatMap((measureFragment) => measureFragment.parts);
    const staves = measureFragments.flatMap((measureFragment) => measureFragment.parts).flatMap((part) => part.staves);

    // Prepare the vexflow rendering objects.
    const vfRenderer = new vexflow.Renderer(opts.element, vexflow.Renderer.Backends.SVG).resize(opts.width, y);
    const vfContext = vfRenderer.getContext();

    // Draw the title.
    titleRendering?.text.draw(vfContext);

    // Draw the part names.
    parts
      .map((part) => part.name?.text)
      .filter((text): text is drawables.Text => text instanceof drawables.Text)
      .forEach((text) => {
        text.draw(vfContext);
      });

    // Draw vexflow.Stave elements.
    staves
      .map((stave) => stave.vexflow.stave)
      .forEach((vfStave) => {
        vfStave.setContext(vfContext).draw();
      });

    // Draw vexflow.StaveConnector elements.
    measureFragments
      .flatMap((measureFragment) => measureFragment.vexflow.staveConnectors)
      .forEach((vfStaveConnector) => {
        vfStaveConnector.setContext(vfContext).draw();
      });

    // Draw vexflow.MultiMeasureRest elements.
    staves
      .map((stave) => stave.entry)
      .filter((entry): entry is MultiRestRendering => entry.type === 'measurerest' && entry.coverage === 'multi')
      .map((entry) => entry.vexflow.multiMeasureRest)
      .filter(
        (vfMultiMeasureRest): vfMultiMeasureRest is vexflow.MultiMeasureRest =>
          vfMultiMeasureRest instanceof vexflow.MultiMeasureRest
      )
      .forEach((vfMultiMeasureRest) => {
        vfMultiMeasureRest.setContext(vfContext).draw();
      });

    // Draw vexflow.Voice elements.
    staves
      .map((stave) => stave.entry)
      .filter((entry): entry is ChorusRendering => entry.type === 'chorus')
      .flatMap((entry) => entry.voices)
      .flatMap((voice) => [voice.vexflow.voice, ...voice.placeholders.map((voice) => voice.vexflow.voice)])
      .forEach((vfVoice) => {
        vfVoice.setContext(vfContext).draw();
      });

    // Draw vexflow.Beam elements.
    spannersRendering.beams.forEach((beam) => {
      beam.vexflow.beam?.setContext(vfContext).draw();
    });

    // Draw vexflow.Curve elements for slurs.
    spannersRendering.slurs
      .flatMap((slur) => slur.vexflow.curve)
      .forEach((vfCurve) => {
        vfCurve?.setContext(vfContext).draw();
      });

    // Draw vexflow.StaveTie and vexflow.TabTie elements.
    spannersRendering.ties
      .flatMap((tie) => tie.vexflow.tie)
      .forEach((vfStaveTie) => {
        vfStaveTie.setContext(vfContext).draw();
      });

    // Draw vexflow.StaveTie elements for hammer-ons.
    spannersRendering.hammerOns
      .flatMap((hammerOn) => hammerOn.vexflow.tie)
      .forEach((vfStaveTie) => {
        vfStaveTie.setContext(vfContext).draw();
      });

    // Draw vexflow.StaveTie elements for pull-offs.
    spannersRendering.pullOffs
      .flatMap((pullOff) => pullOff.vexflow.tie)
      .forEach((vfStaveTie) => {
        vfStaveTie.setContext(vfContext).draw();
      });

    // Draw vexflow.Tuplet elements.
    spannersRendering.tuplets
      .map((tuplet) => tuplet.vexflow.tuplet)
      .forEach((vfTuplet) => {
        vfTuplet.setContext(vfContext).draw();
      });

    // Draw vexflow.StaveHairpin elements.
    spannersRendering.wedges
      .map((wedge) => wedge.vexflow.staveHairpin)
      .forEach((vfStaveHairpin) => {
        vfStaveHairpin.setContext(vfContext).draw();
      });

    // Draw vexflow.Vibrato elements.
    spannersRendering.vibratos
      .flatMap((wavyLine) => wavyLine.vexflow.vibratoBracket)
      .forEach((vibratoBracket) => {
        vibratoBracket.setContext(vfContext).draw();
      });

    // Draw vexflow.TextBracket elements.
    spannersRendering.octaveShifts
      .map((octaveShift) => octaveShift.vexflow.textBracket)
      .forEach((vfTextBracket) => {
        vfTextBracket.setContext(vfContext).draw();
      });

    // Draw vexflow.PedalMarking elements.
    spannersRendering.pedals
      .map((pedal) => pedal.vexflow.pedalMarking)
      .forEach((vfPedalMarking) => {
        vfPedalMarking.setContext(vfContext).draw();
      });

    // Draw vexflow.TabSlide elements.
    spannersRendering.slides
      .map((slide) => slide.vexflow.tabSlide)
      .forEach((vfTabSlide) => {
        vfTabSlide.setContext(vfContext).draw();
      });

    return new Rendering({ type: 'score', systems: systemRenderings, container: opts.element });
  }

  @util.memoize()
  private seed(): Seed {
    return new Seed({
      config: this.config,
      musicXML: {
        parts: this.musicXML.scorePartwise?.getParts() ?? [],
        partDetails: this.musicXML.scorePartwise?.getPartDetails() ?? [],
        staveLayouts: this.musicXML.scorePartwise?.getDefaults()?.getStaveLayouts() ?? [],
      },
    });
  }

  @util.memoize()
  private getSystemLayout() {
    return this.musicXML.scorePartwise?.getDefaults()?.getSystemLayout() ?? null;
  }

  @util.memoize()
  private getSystemDistance() {
    return this.getSystemLayout()?.systemDistance ?? this.config.DEFAULT_SYSTEM_DISTANCE;
  }

  @util.memoize()
  private getTitle() {
    return new Title({
      config: this.config,
      text: this.musicXML.scorePartwise?.getTitle() ?? '',
    });
  }

  private getTopSystemDistance(systems: System[]) {
    let result = 0;

    result += this.getSystemLayout()?.topSystemDistance ?? 0;

    if (systems.length > 0) {
      const systemRendering = systems[0].render({
        address: Address.system({ systemIndex: 0, origin: 'Score.prototype.getTopSystemDistance' }),
        x: 0,
        y: 0,
        previousSystem: null,
        nextSystem: systems[1] ?? null,
        spanners: new Spanners(),
      });

      const staves = systemRendering.measures
        .flatMap((measure) => measure.fragments)
        .flatMap((measureFragment) => measureFragment.parts)
        .flatMap((part) => part.staves);

      const vfElements: vexflow.Element[] = [
        ...staves.map((stave) => stave.vexflow.stave),
        ...staves.map((stave) => stave.vexflow.stave).flatMap((vfStave) => vfStave.getModifiers()),
        ...staves
          .map((stave) => stave.entry)
          .filter((staveEntry): staveEntry is ChorusRendering => staveEntry.type === 'chorus')
          .flatMap((chorus) => chorus.voices)
          .flatMap((voice) => [voice.vexflow.voice, ...voice.placeholders.flatMap((voice) => voice.vexflow.voice)]),
      ];

      // Calculate how much we need to shift the system down to make it fully visible. This should still work even when
      // there is a title, because we don't want the notes clashing with the title.
      result += util.max(
        vfElements
          .map((vfElement) => vfElement.getBoundingBox().getY())
          .filter((y) => y < 0)
          .map((y) => Math.abs(y) + Y_SHIFT_PADDING)
      );
    }

    return result;
  }
}
