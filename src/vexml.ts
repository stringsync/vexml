import * as vexflow from 'vexflow';
import { MusicXml } from './musicxml';
import { Measure } from './measure';
import { BeamValue, ClefType } from './enums';
import { TimeSignature } from './timesignature';
import { Note } from './note';
import { Stave } from './stave';
import { Voice } from './voice';
import { System } from './system';
import { Line } from './line';

export type RenderOptions = {
  element: HTMLDivElement | HTMLCanvasElement;
  xml: string;
  width: number;
};

const JUSTIFY_PADDING = 100;
const TOP_PADDING = 50;
const LINE_PADDING = 100;
const END_BARLINE_OFFSET = 1;

/**
 * Vexml contains the core operation of this library: rendering MusicXML in a web browser.
 */
export class Vexml {
  /**
   * Renders a MusicXML document to an HTML element.
   */
  static render(opts: RenderOptions): void {
    const renderer = new vexflow.Renderer(opts.element, vexflow.Renderer.Backends.SVG);

    const parser = new DOMParser();
    const root = parser.parseFromString(opts.xml, 'application/xml');
    const musicXml = new MusicXml(root);

    const vexml = new Vexml({ musicXml, renderer, width: opts.width });
    vexml.render();
  }

  private musicXml: MusicXml;
  private renderer: vexflow.Renderer;
  private width: number;
  private height: number;
  private beams = new Array<vexflow.Beam>();

  private constructor(opts: { musicXml: MusicXml; renderer: vexflow.Renderer; width: number }) {
    this.musicXml = opts.musicXml;
    this.renderer = opts.renderer;
    this.width = opts.width;
    this.height = TOP_PADDING;
  }

  private render(): void {
    const systems = new Array<System>();
    const parts = this.musicXml.getScorePartwise()?.getParts() ?? [];

    // Populate systems with each part.
    for (const part of parts) {
      const measures = part.getMeasures();
      for (let index = 0; index < measures.length; index++) {
        systems[index] ??= new System();
        const system = systems[index];
        const measure = measures[index];
        this.addMeasurePart(measure, system);
      }
    }

    const lines = this.partitionToLines(systems);

    // Add modifiers to all the lines using the latest modifiers.
    let timeSignature: TimeSignature | undefined;
    let clef: ClefType | undefined;
    for (const line of lines) {
      for (const system of line.getSystems()) {
        for (const stave of system.getStaves()) {
          timeSignature = stave.getTimeSignature() ?? timeSignature;
          clef = stave.getClef() ?? clef;
        }
      }
      line.setBeginningModifiers({ timeSignature, clef });
    }

    // Add barlines to all lines if it doesn't exist.
    for (const line of lines) {
      if (!line.hasEndBarType()) {
        line.setEndBarType('regular');
      }
    }

    // Fit all the lines to width except the last one.
    const width = this.width - END_BARLINE_OFFSET;
    for (const line of lines.slice(0, -1)) {
      line.fit(width);
    }

    const elements = [...lines.flatMap((line) => this.formatLine(line)), ...this.beams];

    this.renderer.resize(this.width, this.height);

    const ctx = this.renderer.getContext();
    elements.forEach((element) => element.setContext(ctx).draw());

    // Render measure numbers.
    for (const system of systems) {
      const measureNumber = system.getMeasureNumber();
      if (measureNumber > 0) {
        const systemX = system.getX();
        const systemY = system.getY();
        ctx.fillText(measureNumber.toString(), systemX, systemY);
      }
    }
  }

  private addMeasurePart(measure: Measure, system: System): void {
    const measureNumber = parseInt(measure.getNumber(), 10);
    if (Number.isFinite(measureNumber)) {
      system.setMeasureNumber(measureNumber);
    }

    const stave = new Stave();

    // TODO: Handle more than one attributes
    const attributes = measure.getAttributes();

    const clef = attributes[0]?.getClefs()[0]?.getClefType() ?? undefined;
    stave.setClef(clef);

    const timeSignature: TimeSignature | undefined = attributes[0]?.getTimes()[0]?.getTimeSignatures()[0];
    if (timeSignature) {
      stave.setTimeSignature(timeSignature);
    }

    for (const barline of measure.getBarlines()) {
      const barStyle = barline.getBarStyle();
      switch (barline.getLocation()) {
        case 'left':
          stave.setBeginningBarStyle(barStyle);
          break;
        case 'right':
          stave.setEndBarStyle(barStyle);
          break;
      }
    }

    // Create tickables, but keep associations with MusicXML note.
    const notes = new Array<[note: Note, tickables: vexflow.Tickable[]]>();
    for (const note of measure.getNotes()) {
      const tickables = new Array<vexflow.Tickable>();

      if (note.isChordTail()) {
        // This should already be handled when encountering the chord head note.
        continue;
      } else if (note.isChordHead()) {
        tickables.push(this.createStaveNote([note, ...note.getChordTail()], clef));
      } else if (note.isRest()) {
        tickables.push(this.createRest(note, clef));
      } else if (note.isGrace()) {
        continue;
      } else {
        tickables.push(this.createStaveNote([note], clef));
      }

      notes.push([note, tickables]);
    }

    // Create beams.
    // TODO: Fix this, see http://localhost:8080/beam.xml
    let beamNotes = new Array<vexflow.StemmableNote>();
    for (const [note, tickables] of notes) {
      const stemmables = tickables.filter(
        (tickable): tickable is vexflow.StemmableNote => tickable instanceof vexflow.StemmableNote
      );

      // TODO: Handle more than one beam.
      const beamValue: BeamValue | undefined = note.getBeams()[0]?.getBeamValue();
      switch (beamValue) {
        case 'begin':
        case 'continue':
          beamNotes.push(...stemmables);
          break;
        case 'end':
          beamNotes.push(...stemmables);
          // TODO: Honor the stem that the notes specify.
          const beam = new vexflow.Beam(beamNotes);

          this.beams.push(beam);
          beamNotes = [];
          break;
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const tickables = notes.flatMap(([note, tickables]) => tickables);
    const voice = new Voice().addTickables(tickables);

    stave.addVoice(voice);
    system.addStave(stave);
  }

  private createStaveNote(notes: Note[], clef: ClefType | undefined): vexflow.StaveNote {
    const keys = notes.map((note) => {
      let key = note.getPitch();
      const suffix = note.getNoteheadSuffix();
      if (suffix) {
        key += `/${suffix}`;
      }
      return key;
    });

    const head = notes[0];

    const staveNote = new vexflow.StaveNote({
      keys,
      duration: head.getDurationDenominator(),
      dots: head.getDotCount(),
      clef,
    });

    const stem = head.getStem();
    if (stem === 'up') {
      staveNote.setStemDirection(vexflow.Stem.UP);
    } else if (stem === 'down') {
      staveNote.setStemDirection(vexflow.Stem.DOWN);
    } else {
      staveNote.autoStem();
    }

    const accidentalCode = head.getAccidentalCode();
    if (accidentalCode) {
      const accidental = new vexflow.Accidental(accidentalCode);
      if (head.hasAccidentalCautionary()) {
        accidental.setAsCautionary();
      }
      staveNote.addModifier(accidental);
    }

    return staveNote;
  }

  private createRest(note: Note, clef: ClefType | undefined): vexflow.StaveNote {
    return new vexflow.StaveNote({
      keys: [this.getRestKey(clef)],
      duration: `${note.getDurationDenominator()}r`,
      dots: note.getDotCount(),
      clef: clef,
    });
  }

  private getRestKey(clef: ClefType | undefined): string {
    switch (clef) {
      case 'bass':
        return 'D/2';
      default:
        return 'B/4';
    }
  }

  private partitionToLines(systems: System[]): Line[] {
    let line = new Line();
    const lines = [line];
    let remainingWidth = this.width;

    for (const system of systems) {
      let requiredWidth = system.getJustifyWidth() + JUSTIFY_PADDING;

      const needsModifiers = line.isEmpty();
      if (needsModifiers) {
        requiredWidth += system.getModifiersWidth();
      }

      if (requiredWidth <= remainingWidth) {
        remainingWidth -= requiredWidth;
      } else {
        line = new Line();
        lines.push(line);
        requiredWidth += system.getModifiersWidth();
        remainingWidth = this.width - requiredWidth;
      }

      line.addSystem(system);
      system.setWidth(requiredWidth);
    }

    return lines.filter((line) => !line.isEmpty());
  }

  private formatLine(line: Line): vexflow.Element[] {
    const elements = new Array<vexflow.Element>();

    let x = 0;
    for (const system of line.getSystems()) {
      system.setX(x);
      system.setY(this.height);
      x += system.getWidth();

      const nextElements = this.formatSystem(system);
      for (const nextElement of nextElements) {
        elements.push(nextElement);
      }
    }

    this.height += LINE_PADDING + Math.max(0, ...elements.map((element) => element.getBoundingBox()!.getH()));

    return elements;
  }

  private formatSystem(system: System): vexflow.Element[] {
    const elements = new Array<vexflow.Element>();

    const vfStaves = new Array<vexflow.Stave>();
    for (const stave of system.getStaves()) {
      const formatter = new vexflow.Formatter();
      const vfStave = stave.toVexflow();
      const vfVoices = stave.getVoices().map((voice) => voice.toVexflow().setStave(vfStave));

      formatter.joinVoices(vfVoices).formatToStave(vfVoices, vfStave);

      vfStaves.push(vfStave);
      elements.push(vfStave, ...vfVoices);
    }

    vexflow.Stave.formatBegModifiers(vfStaves);

    return elements;
  }
}
