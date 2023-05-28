import * as vexflow from 'vexflow';
import { MusicXml } from './musicxml';
import { Measure } from './measure';
import { ClefType } from './enums';
import { TimeSignature } from './types';
import { Barline } from './barline';
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
    this.height = 500;
  }

  private render(): void {
    const systems = new Array<System>();
    const parts = this.musicXml.getScorePartwise()?.getParts() ?? [];

    // Populate systems with each part.
    for (const part of parts) {
      const measures = part.getMeasures().slice(0, 1);
      for (let index = 0; index < measures.length; index++) {
        systems[index] ??= new System();
        const system = systems[index];
        const measure = measures[index];
        this.addMeasurePart(measure, system);
      }
    }

    this.updateStaveWidthMetadata(systems);

    const lines = this.partitionToLines(systems);

    // Stretch all the lines except the last one.
    for (const line of lines.slice(0, -1)) {
      this.stretchToWidth(line, this.width);
    }

    this.renderer.resize(this.width, this.height);
    const ctx = this.renderer.getContext();
    lines.flatMap((line) => this.formatLine(line)).forEach((element) => element.setContext(ctx).draw());
  }

  private addMeasurePart(measure: Measure, system: System): void {
    const stave = new Stave();

    // TODO: Handle more than one attributes
    const attributes = measure.getAttributes();

    const clef = attributes[0]?.getClefs()[0]?.getClefType() ?? undefined;
    stave.setClef(clef);

    const timeSignature: TimeSignature | undefined = attributes[0]?.getTimes()[0]?.getTimeSignatures()[0];
    if (timeSignature) {
      stave.setTimeSignature(`${timeSignature.numerator}/${timeSignature.denominator}`);
    }

    for (const barline of measure.getBarlines()) {
      const barlineType = this.getBarlineType(barline);
      if (typeof barlineType !== 'number') {
        continue;
      }
      switch (barline.getLocation()) {
        case 'left':
          stave.setBegBarType(barlineType);
          break;
        case 'right':
          stave.setEndBarType(barlineType);
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

    const voice = new Voice().setMode(vexflow.VoiceMode.SOFT).addTickables(tickables);
    stave.setVoice(voice);

    system.addStave(stave);
    system.addVoice(voice);
  }

  private getBarlineType(barline: Barline): vexflow.BarlineType | null {
    switch (barline.getBarStyle()) {
      case 'regular':
      case 'short':
      case 'dashed':
      case 'dotted':
      case 'heavy':
        return vexflow.BarlineType.SINGLE;
      case 'heavy-light':
      case 'heavy-heavy':
      case 'light-light':
      case 'tick':
        return vexflow.BarlineType.DOUBLE;
      case 'light-heavy':
        return vexflow.BarlineType.END;
      case 'none':
        return vexflow.BarlineType.NONE;
      default:
        return null;
    }
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

  private updateStaveWidthMetadata(systems: System[]): void {
    let lastTimeSignature: string | undefined;
    for (const system of systems) {
      for (const stave of system.getStaves()) {
        lastTimeSignature = stave.getTimeSignature() ?? lastTimeSignature;
        const voiceWidth = this.getVoiceWidth(stave);
        const modifiersWidth = this.getModifiersWidth(stave, lastTimeSignature);
        stave.setVoiceWidth(voiceWidth).setModifiersWidth(modifiersWidth);
      }
    }
  }

  private getVoiceWidth(stave: Stave) {
    const vfVoice = stave.getVoice()?.toVexflow();
    return typeof vfVoice === 'undefined' ? 0 : new vexflow.Formatter().preCalculateMinTotalWidth([vfVoice]);
  }

  private getModifiersWidth(stave: Stave, timeSignature: string | undefined) {
    return stave.clone().setTimeSignature(timeSignature).setX(0).toVexflow().getNoteStartX();
  }

  private partitionToLines(systems: System[]): Line[] {
    let line = new Line();
    const lines = [line];
    let remainingWidth = this.width;

    for (const system of systems) {
      let requiredWidth = system.getVoiceWidth() + vexflow.Stave.rightPadding;

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

  private stretchToWidth(line: Line, width: number): void {
    const remainingWidth = width - line.getWidth();
    const systems = line.getSystems();
    const numSystems = systems.length;

    const additionalWidth = remainingWidth / numSystems;

    for (const system of systems) {
      const currentWidth = system.getWidth();
      const nextWidth = currentWidth + additionalWidth;
      system.setWidth(nextWidth);
    }
  }

  private formatLine(line: Line): vexflow.Element[] {
    const elements = new Array<vexflow.Element>();

    let x = 0;
    for (const system of line.getSystems()) {
      system.setX(x);
      x += system.getWidth();

      const nextElements = this.formatSystem(system);
      for (const nextElement of nextElements) {
        elements.push(nextElement);
      }
    }

    return elements;
  }

  private formatSystem(system: System): vexflow.Element[] {
    const formatter = new vexflow.Formatter();

    const vfStaves = [];
    const vfVoices = [];
    for (const stave of system.getStaves()) {
      const vfVoice = stave.getVoice()?.toVexflow();
      if (typeof vfVoice === 'undefined') {
        continue;
      }
      const vfStave = stave.toVexflow();
      vfVoice.setStave(vfStave);
      vfVoices.push(vfVoice);
      vfStaves.push(vfStave);
    }

    formatter.joinVoices(vfVoices);
    formatter.format(vfVoices, system.getWidth());
    formatter.postFormat();

    vexflow.Stave.formatBegModifiers(vfStaves);

    return [...vfStaves, ...vfVoices];
  }
}
