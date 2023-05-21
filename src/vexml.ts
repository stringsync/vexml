import * as vexflow from 'vexflow';
import { MusicXml } from './musicxml';
import { Measure } from './measure';
import { Part } from './part';
import { ClefType } from './enums';
import { TimeSignature } from './types';
import { Barline } from './barline';
import { Note } from './note';
import { StaveBuilder } from './stavebuilder';

export type RenderOptions = {
  element: HTMLDivElement | HTMLCanvasElement;
  xml: string;
  width: number;
};

const DEFAULT_STAVE_WIDTH_PX = 400;

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
  private height = 500;

  private staveX = 0;
  private staveY = 0;

  private staves = new Array<vexflow.Stave>();
  private voices = new Array<vexflow.Voice>();

  private constructor(opts: { musicXml: MusicXml; renderer: vexflow.Renderer; width: number }) {
    this.musicXml = opts.musicXml;
    this.renderer = opts.renderer;
    this.width = opts.width;
  }

  private render(): void {
    const scorePartwise = this.musicXml.getScorePartwise();
    if (!scorePartwise) {
      return;
    }

    const parts = scorePartwise.getParts();
    for (const part of parts) {
      this.renderPart(part);
    }

    const ctx = this.renderer.getContext();
    this.staves.forEach((stave) => stave.setContext(ctx).draw());
    this.voices.forEach((voice) => voice.setContext(ctx).draw());
  }

  private renderPart(part: Part) {
    const measures = part.getMeasures();
    for (const measure of measures) {
      this.renderMeasure(measure);
    }
  }

  private renderMeasure(measure: Measure) {
    const stave = this.createStave();

    // TODO: Handle more than one attributes
    const attributes = measure.getAttributes();

    const clefType: ClefType | undefined = attributes[0]?.getClefs()[0]?.getClefType() ?? undefined;
    if (clefType) {
      stave.addClef(clefType);
    }

    const timeSignature: TimeSignature | undefined = attributes[0]?.getTimes()[0]?.getTimeSignatures()[0];
    if (timeSignature) {
      stave.addTimeSignature(`${timeSignature.numerator}/${timeSignature.denominator}`);
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
        const staveNote = this.createStaveNote(note, clefType);
        tickables.push(staveNote);
      }
    }
    if (timeSignature) {
      const voice = new vexflow.Voice().setStave(stave).setMode(vexflow.VoiceMode.SOFT).addTickables(tickables);
      const formatter = new vexflow.Formatter();
      formatter.format([voice]);
      this.voices.push(voice);
    }
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

  private createStave(): vexflow.Stave {
    const stave = new vexflow.Stave(this.staveX, this.staveY, DEFAULT_STAVE_WIDTH_PX);
    this.staves.push(stave);
    return stave;
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
}

// const stave = new vexflow.Stave(0, 0, 400)
//   .addClef('treble')
//   .addTimeSignature('4/4')
//   .setEndBarType(vexflow.BarlineType.SINGLE);

// const voice = new vexflow.Voice({ num_beats: 4, beat_value: 4 })
//   .setStave(stave)
//   .setStrict(false)
//   .addTickables([
//     new vexflow.StaveNote({ keys: ['c/4'], duration: 'q' }),
//     new vexflow.StaveNote({ keys: ['d/4'], duration: 'q' }),
//     new vexflow.StaveNote({ keys: ['b/4'], duration: 'qr' }),
//     new vexflow.StaveNote({ keys: ['c/4', 'e/4', 'g/4'], duration: 'q' }),
//   ]);

// const formatter = new vexflow.Formatter();
// formatter.joinVoices([voice]).formatToStave([voice], stave);

// this.renderer.resize(this.width, this.height);

// const ctx = this.renderer.getContext();

// stave.setContext(ctx).draw();
// voice.setContext(ctx).draw();
