import * as vexflow from 'vexflow';
import { Attributes } from './attributes';
import { Barline } from './barline';
import { Clef } from './clef';
import { ClefType } from './enums';
import { Factory } from './factory';
import { Measure } from './measure';
import { MusicXml } from './musicxml';
import { Note } from './note';
import { Print } from './print';

export type RenderOptions = {
  elementId: string;
  xml: string;
  width: number;
  height: number;
};

/**
 * Vexml contains the core operation of this library: rendering MusicXML in a web browser.
 */
export class Vexml {
  /**
   * Renders a MusicXML document to an HTML element.
   */
  static render(opts: RenderOptions): void {
    // Constructing a Factory also renders an empty <svg>.
    const factory = new Factory({
      renderer: {
        elementId: opts.elementId,
        width: opts.width,
        height: opts.height,
      },
    });

    const parser = new DOMParser();
    const root = parser.parseFromString(opts.xml, 'application/xml');
    const musicXml = new MusicXml(root);
    const vexml = new Vexml({ musicXml, factory });

    vexml.render();
  }

  private musicXml: MusicXml;
  private factory: Factory;
  private clefByStaffNumber: Record<number, Clef> = {};

  private constructor(opts: { musicXml: MusicXml; factory: Factory }) {
    this.musicXml = opts.musicXml;
    this.factory = opts.factory;
  }

  private render(): void {
    const scorePartwise = this.musicXml.getScorePartwise();
    if (!scorePartwise) {
      return;
    }

    for (const part of scorePartwise.getParts()) {
      for (const measure of part.getMeasures()) {
        this.renderMeasure(measure);
      }
    }

    this.factory.draw();
  }

  private renderMeasure(measure: Measure): void {
    // In VexFlow, each measure is backed by a system. VexFlow will automatically associate certain factory objects with
    // the last created system.
    const system = this.addSystem(measure);

    // Adding staves must be done after adding the system, because some factory objects need it to exists before they
    // can be created.
    this.addStaves(measure);

    // Now that the staves exist, apply the layouts.
    for (const print of measure.getPrints()) {
      this.applyLayouts(print);
    }

    // Renders measure attributes such as key signature, time signature, and clefs.
    for (const attributes of measure.getAttributes()) {
      this.renderAttributes(attributes);
    }

    // Renders the notes of the measure and collects them as Tickables.
    const tickables = new Array<vexflow.Tickable>();
    for (const note of measure.getNotes()) {
      if (note.isChordTail()) {
        continue;
      } else if (note.isChordHead()) {
        this.renderChord(note);
      } else if (note.isRest()) {
        this.renderRest(note);
      } else if (note.isGrace()) {
        this.renderGrace(note);
      } else {
        tickables.push(this.createStaveNote(note));
      }
    }
    const voices = [this.factory.Voice().setMode(vexflow.VoiceMode.SOFT).addTickables(tickables)];
    system.addVoices(voices);

    // Renders the barlines of the measure, if specified. Otherwise, defaults to the standard single line.
    for (const barline of measure.getBarlines()) {
      const barlineType = this.getBarlineType(barline);
      if (barlineType === null) {
        continue;
      }

      const barlineLocation = barline.getLocation();
      for (const stave of system.getStaves()) {
        if (barlineLocation === 'left') {
          stave.setEndBarType(barlineType);
        }
        if (barlineLocation === 'right') {
          stave.setBegBarType(barlineType);
        }
      }
    }

    system.format();
  }

  private renderAttributes(attributes: Attributes): void {
    const staves = this.factory.getCurrentSystem()?.getStaves() ?? [];
    if (staves.length === 0) {
      return;
    }
    const stave = staves[staves.length - 1];

    // TODO: Support more than one clef, key, and times.

    const clefs = attributes.getClefs();
    if (clefs.length > 0) {
      const clef = clefs[0];
      const staffNumber = clef.getStaffNumber();
      this.clefByStaffNumber[staffNumber] = clef;

      const clefType = clef.getClefType();
      const annotation = clef.getAnnotation() ?? undefined;

      if (clefType) {
        stave.addClef(clefType, 'default', annotation);
      }
    }

    const keys = attributes.getKeys();
    if (keys.length > 0) {
      const key = keys[0];
      stave.setKeySignature(key.getKeySignature());
    }

    const timeSignatures = attributes.getTimes().flatMap((time) => time.getTimeSignatures());
    if (timeSignatures.length > 0) {
      const timeSignature = timeSignatures[0];
      stave.setTimeSignature(`${timeSignature.numerator}/${timeSignature.denominator}`);
    }
  }

  private applyLayouts(print: Print): void {
    const systemLayout = print.getSystemLayout();
    const leftMargin = systemLayout.leftMargin ?? 0;
    const systemDistance = systemLayout.systemDistance ?? 50;

    const currentSystem = this.factory.getCurrentSystem();
    const previousSystem = this.factory.getPreviousSystem();

    if (currentSystem && previousSystem) {
      currentSystem.setX(leftMargin);
      currentSystem.setY(previousSystem.getY() + previousSystem.getBoundingBox()!.getH() + systemDistance);
    } else if (currentSystem) {
      currentSystem.setX(leftMargin);
      currentSystem.setY(systemDistance);
    }
  }

  private createStaveNote(note: Note): vexflow.StaveNote {
    let clefType: ClefType | undefined = undefined;
    const staffNumber = this.getStaffNumber(note);
    if (typeof staffNumber === 'number') {
      const clef = this.clefByStaffNumber[staffNumber];
      if (clef) {
        clefType = clef.getClefType() ?? undefined;
      }
    }

    let key = note.getPitch();
    const suffix = note.getNoteheadSuffix();
    if (suffix) {
      key += `/${suffix}`;
    }

    const staveNote = this.factory.StaveNote({
      keys: [key],
      duration: `${note.getDurationDenominator()}`,
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
      const accidental = this.factory.Accidental({ type: accidentalCode });
      if (note.hasAccidentalCautionary()) {
        accidental.setAsCautionary();
      }
      staveNote.addModifier(accidental);
    }

    return staveNote;
  }

  private renderChord(note: Note): void {
    // TODO: Flesh this out.
  }

  private renderRest(note: Note): void {
    // TODO: Flesh this out.
  }

  private renderGrace(note: Note): void {
    // TODO: Flesh this out.
  }

  private addSystem(measure: Measure): vexflow.System {
    const currentSystem = this.factory.getCurrentSystem();

    let x = 0;
    let y = 0;
    if (currentSystem) {
      x = currentSystem.getX() + currentSystem.getBoundingBox()!.getW();
      y = currentSystem.getY();
    }

    const width = measure.getWidth();
    if (typeof width === 'number') {
      return this.factory.System({ x, y, width });
    } else {
      return this.factory.System({ x, y, autoWidth: true });
    }
  }

  private addStaves(measure: Measure): void {
    const system = this.factory.getCurrentSystem();
    if (!system) {
      return;
    }

    const staveCounts = measure.getAttributes().map((attributes) => attributes.getStaveCount());
    const staveCount = staveCounts.length > 0 ? staveCounts[0] : 1;
    const spaceBelow = this.getSpaceBelow(measure);

    for (let ndx = 1; ndx <= staveCount; ndx++) {
      if (ndx < staveCount - 1) {
        system.addStave({ voices: [], spaceBelow });
      } else {
        system.addStave({ voices: [] });
      }
    }
  }

  private getSpaceBelow(measure: Measure): number {
    for (const print of measure.getPrints()) {
      for (const staffLayout of print.getStaffLayouts()) {
        if (typeof staffLayout.staffDistance === 'number') {
          return staffLayout.staffDistance / 5 - 12;
        }
      }
    }
    return 0;
  }

  private getStaffNumber(value: Clef | Note): number | null {
    if (value instanceof Clef) {
      return value.getStaffNumber();
    }
    if (value instanceof Note) {
      return value.getStaffNumber();
    }
    return null;
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
}
