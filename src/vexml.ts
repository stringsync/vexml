import * as vexflow from 'vexflow';
import { MusicXml } from './musicxml';
import { Measure } from './measure';
import { ClefType } from './enums';
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

    const ctx = this.renderer.getContext();
    const elements = lines.flatMap((line) => this.formatLine(line));
    this.renderer.resize(this.width, this.height);
    elements.forEach((element) => element.setContext(ctx).draw());
  }

  private addMeasurePart(measure: Measure, system: System): void {
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

    const tickables = new Array<vexflow.Tickable>();
    for (const note of measure.getNotes()) {
      if (note.isChordTail()) {
        continue;
      } else if (note.isChordHead()) {
        continue;
      } else if (note.isRest()) {
        continue;
      } else if (note.isGrace()) {
        continue;
      } else {
        const staveNote = this.createStaveNote(note, clef);
        tickables.push(staveNote);
      }
    }

    const voice = new Voice().addTickables(tickables);

    stave.addVoice(voice);
    system.addStave(stave);
    system.addVoice(voice);
  }

  private createStaveNote(note: Note, clefType: ClefType | undefined): vexflow.StaveNote {
    let key = note.getPitch();
    const suffix = note.getNoteheadSuffix();
    if (suffix) {
      key += `/${suffix}`;
    }

    const staveNote = new vexflow.StaveNote({
      keys: [key],
      duration: note.getDurationDenominator().toString(),
      dots: note.getDotCount(),
      clef: clefType,
    });

    const stem = note.getStem();
    if (stem === 'up') {
      staveNote.setStemDirection(vexflow.Stem.UP);
    } else if (stem === 'down') {
      staveNote.setStemDirection(vexflow.Stem.DOWN);
    } else {
      staveNote.autoStem();
    }

    const accidentalCode = note.getAccidentalCode();
    if (accidentalCode) {
      const accidental = new vexflow.Accidental(accidentalCode);
      if (note.hasAccidentalCautionary()) {
        accidental.setAsCautionary();
      }
      staveNote.addModifier(accidental);
    }

    return staveNote;
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

      formatter.joinVoices(vfVoices).formatToStave(vfVoices, vfStave).postFormat();

      vfStaves.push(vfStave);
      elements.push(vfStave, ...vfVoices);
    }

    vexflow.Stave.formatBegModifiers(vfStaves);

    return elements;
  }
}
