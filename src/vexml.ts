import * as vexflow from 'vexflow';
import { Attributes } from './attributes';
import { CodePrinter, CodeTracker } from './codeprinter';
import { History } from './history';
import { Measure } from './measure';
import { MusicXml } from './musicxml';
import { Note } from './note';
import { Part } from './part';

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
  private attributes = new History<Attributes>();

  private staffByNumber: Record<number, vexflow.Stave> = {};
  private clefByStaffNumber: Record<number, vexflow.Clef> = {};

  private constructor(opts: { musicXml: MusicXml; t: CodeTracker; vf: vexflow.Factory }) {
    this.musicXml = opts.musicXml;
    this.t = opts.t;
    this.vf = opts.vf;
  }

  private render(): void {
    this.t.comment('global variables');
    this.t.literal('let system;');
    this.t.newline();

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

    // add a system
    let system: vexflow.System;
    const width = measure.getWidth();
    if (width === -1) {
      system = this.vf.System({ x: 0, y: 0, autoWidth: true });
    } else {
      system = this.vf.System({ x: 0, y: 0, width });
    }
    this.addSystem(system);

    // add staves to the system
    const staveCount = this.getStaveCount(measure);
    const spaceBelow = this.getSpaceBelow(measure);
    const staves = this.addStaves(staveCount, spaceBelow, system);

    // process attributes
    const attributes = measure.getAttributes();
    for (const attribute of attributes) {
      this.processAttributes(attribute);
    }

    // add the notes to the system
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
        this.renderNote(note);
      }
    }

    // this.system
    //   .getCurrent()!
    //   .addStave({
    //     voices: [
    //       this.vf
    //         .Voice()
    //         .setMode(2)
    //         .addTickables([this.vf.StaveNote({ duration: '4', keys: ['C/4'] })]),
    //     ],
    //   })
    //   .addClef('treble')
    //   .addTimeSignature('4/4');
  }

  private renderNote(note: Note): void {
    const noteStruct: vexflow.NoteStruct = {
      duration: `${note.getDurationDenominator()}`,
      dots: note.getDotCount(),
    };

    const number = note.getStaffNumber();
    const staff = this.staffByNumber[number];
    if (staff) {
      // this.vf.StaveNote(noteStruct).setStave(staff);
    } else {
      console.warn(`could not find staff number: ${number}, skipping`);
    }
  }

  private renderChord(notes: Note[]): void {
    // TODO: Flesh this out.
  }

  private renderRest(note: Note): void {
    // TODO: Flesh this out.
  }

  private renderGrace(note: Note): void {
    const graceNoteStruct: vexflow.GraceNoteStruct = {
      duration: `${note.getDurationDenominator()}`,
      dots: note.getDotCount(),
    };

    const stem = note.getStem();
    if (stem) {
      graceNoteStruct.stem_direction = stem === 'up' ? 1 : -1;
    }
  }

  private addSystem(system: vexflow.System): void {
    this.system.set(system);

    const current = this.system.getCurrent()!;
    const previous = this.system.getPrevious();

    if (previous) {
      previous.format();
      current.setX(previous.getX() + previous.getBoundingBox()!.getW());
      current.setY(previous.getY());
    }
  }

  private addStaves(staveCount: number, spaceBelow: number, system: vexflow.System): vexflow.Stave[] {
    const staves = new Array<vexflow.Stave>();

    const len = Object.keys(this.staffByNumber).length;
    for (let ndx = 0; ndx < staveCount; ndx++) {
      let stave: vexflow.Stave;
      if (ndx < staveCount - 1) {
        stave = system.addStave({ voices: [], spaceBelow });
      } else {
        stave = system.addStave({ voices: [] });
      }
      const number = len + ndx + 1;
      this.staffByNumber[number] = stave;
    }

    return staves;
  }

  private processAttributes(attributes: Attributes): void {
    // TODO: Flesh this out.
  }

  private getStaveCount(measure: Measure): number {
    const attributes = measure.getAttributes();
    return Math.max(...attributes.map((attribute) => attribute.getStaveCount()), 1);
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
}
