import * as vexflow from 'vexflow';
import { Attributes } from './attributes';
import { Clef } from './clef';
import { CodePrinter, CodeTracker } from './codeprinter';
import { History } from './history';
import { Key } from './key';
import { Measure } from './measure';
import { MusicXml } from './musicxml';
import { Note } from './note';
import { Part } from './part';
import { Print } from './print';
import { Time } from './time';
import { ClefType } from './types';

export type RenderOptions = {
  codeTracker?: CodeTracker;
};

/** Vexml contains the core operation of this library: rendering MusicXML in a web browser. */
export class Vexml {
  /**
   * Renders a MusicXML document to an HTML element.
   *
   * @param elementId The ID of the element to render the SVG to.
   * @param xml The MusicXML document as a string.
   * @param opts Rendering options.
   */
  static render(elementId: string, xml: string, opts: RenderOptions = {}): void {
    const t = opts.codeTracker ?? CodePrinter.noop();

    t.literal(`const vexflow = Vex.Flow;`);
    t.newline();

    // Constructing a vexflow.Factory also renders an empty <svg>.
    const vf = new vexflow.Factory({ renderer: { elementId, width: 2000, height: 400 } });
    t.literal(`const vf = new vexflow.Factory({ renderer: { elementId: '${elementId}', width: 2000, height: 400 } });`);
    t.newline();

    const parser = new DOMParser();
    const root = parser.parseFromString(xml, 'application/xml');

    const musicXml = new MusicXml(root);
    const vexml = new Vexml({ musicXml, t, vf });

    vexml.render();
  }

  private musicXml: MusicXml;
  private t: CodeTracker;
  private vf: vexflow.Factory;
  private system = new History<vexflow.System>();
  private systems = new Array<vexflow.System>();
  private clefByStaffNumber: Record<number, Clef> = {};

  private constructor(opts: { musicXml: MusicXml; t: CodeTracker; vf: vexflow.Factory }) {
    this.musicXml = opts.musicXml;
    this.t = opts.t;
    this.vf = opts.vf;
  }

  private render(): void {
    const score = this.musicXml.getScorePartwise();
    if (!score) {
      console.warn('nothing to render: missing top-level <score-partwise>');
      return;
    }

    for (const part of score.getParts()) {
      this.renderPart(part);
    }

    this.vf.draw();
  }

  private renderPart(part: Part): void {
    this.t.newline();
    this.t.comment(`part ${part.getId()}`);

    for (const measure of part.getMeasures()) {
      this.renderMeasure(measure);
    }
  }

  private renderMeasure(measure: Measure): void {
    this.t.newline();
    this.t.comment(`measure ${measure.getNumber()}`);

    this.addSystem(measure);

    this.addStaves(measure);

    for (const attributes of measure.getAttributes()) {
      this.renderAttributes(attributes);
    }

    for (const print of measure.getPrints()) {
      this.processPrint(print);
    }

    const tickables = new Array<vexflow.Tickable>();
    for (const note of measure.getNotes()) {
      if (note.isChordTail()) {
        continue;
      } else if (note.isChordHead()) {
        this.renderChord([note, ...note.getChordTail()]);
      } else if (note.isRest()) {
        this.renderRest(note);
      } else if (note.isGrace()) {
        this.renderGrace(note);
      } else {
        tickables.push(this.createStaveNote(note));
      }
    }

    const system = this.system.getCurrent()!;
    system.addVoices([this.vf.Voice().setMode(vexflow.VoiceMode.SOFT).addTickables(tickables)]);
    system.format();
  }

  private renderAttributes(attributes: Attributes): void {
    const staves = this.system.getCurrent()?.getStaves() ?? [];
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

  private processPrint(print: Print): void {
    const systemLayout = print.getSystemLayout();
    const leftMargin = systemLayout.leftMargin ?? 0;
    const systemDistance = systemLayout.systemDistance ?? 50;

    const currentSystem = this.system.getCurrent();
    const previousSystem = this.system.getPrevious();

    if (currentSystem) {
      currentSystem.setX(leftMargin);
      currentSystem.setY(systemDistance);
    }
    if (currentSystem && previousSystem) {
      currentSystem.setY(previousSystem.getY() + previousSystem.getBoundingBox()!.getH() + systemDistance);
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

    const staveNote = this.vf.StaveNote({
      keys: [note.getPitch()],
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
      const accidental = this.vf.Accidental({ type: accidentalCode });
      if (note.hasAccidentalCautionary()) {
        accidental.setAsCautionary();
      }
      staveNote.addModifier(accidental);
    }

    return staveNote;
  }

  private renderChord(notes: Note[]): void {
    // TODO: Flesh this out.
  }

  private renderRest(note: Note): void {
    // TODO: Flesh this out.
  }

  private renderGrace(note: Note): void {
    // TODO: Flesh this out.
  }

  private addSystem(measure: Measure): void {
    const currentSystem = this.system.getCurrent();

    let x = 0;
    let y = 0;
    if (currentSystem) {
      x = currentSystem.getX() + currentSystem.getBoundingBox()!.getW();
      y = currentSystem.getY();
    }

    const width = measure.getWidth();
    if (typeof width === 'number') {
      this.system.set(this.vf.System({ x, y, width }));
    } else {
      this.system.set(this.vf.System({ x, y, autoWidth: true }));
    }

    this.systems.push(this.system.getCurrent()!);
  }

  private addStaves(measure: Measure): void {
    const system = this.system.getCurrent();
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
}
