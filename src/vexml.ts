import * as vexflow from 'vexflow';
import { CodePrinter, CodeTracker } from './codeprinter';
import { History } from './history';
import { Measure } from './measure';
import { MusicXml } from './musicxml';
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

    this.system
      .getCurrent()!
      .addStave({
        voices: [
          this.vf
            .Voice()
            .setMode(2)
            .addTickables([this.vf.StaveNote({ duration: '4', keys: ['C/4'] })]),
        ],
      })
      .addClef('treble')
      .addTimeSignature('4/4');
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
}
