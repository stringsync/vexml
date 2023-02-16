import * as vexflow from 'vexflow';
import { CodePrinter } from './codeprinter';
import { Measure } from './measure';
import { NamedNode } from './namednode';
import { Part } from './part';
import { Score } from './score';
import { CodeTracker } from './types';

export type RenderOptions = {
  codeTracker?: CodeTracker;
};

export class Vexml {
  static render(elementId: string, xml: string, opts: RenderOptions = {}): void {
    // get code tracker
    const t = opts.codeTracker ?? CodePrinter.noop();

    // declare vexflow
    t.literal(`const vexflow = Vex.Flow;`);
    t.newline();

    // setup vexflow Factory, which renders an empty <svg>
    const vf = new vexflow.Factory({ renderer: { elementId, width: 2000, height: 400 } });
    t.literal(`const vf = new vexflow.Factory({ renderer: { elementId: '${elementId}', width: 2000, height: 400 } });`);
    t.newline();

    // parse xml
    const parser = new DOMParser();
    const root = parser.parseFromString(xml, 'application/xml');

    // find exactly 1 <score-partwise> element
    const elements = root.getElementsByTagName('score-partwise');
    if (elements.length !== 1) {
      throw new Error(`expected exactly 1 <score-partwise> element, got ${elements.length}`);
    }
    const scorePartwise = NamedNode.of<'score-partwise'>(elements.item(0)!);

    // create Vexml instance
    const score = new Score(scorePartwise);
    const vexml = new Vexml({ score, t: t, factory: vf });

    // render
    vexml.render();
  }

  private score: Score;
  private t: CodeTracker;
  private vf: vexflow.Factory;

  private constructor(opts: { score: Score; t: CodeTracker; factory: vexflow.Factory }) {
    this.score = opts.score;
    this.t = opts.t;
    this.vf = opts.factory;
  }

  private render(): void {
    this.t.comment('global variables');
    this.t.literal('let system;');
    this.t.newline();

    for (const part of this.score.getParts()) {
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

    let system: vexflow.System;
    const width = measure.getWidth();
    if (width === -1) {
      system = this.vf.System({ x: 0, y: 0, autoWidth: true });
      this.t.literal(`system = factory.System({ x: 0, y: 0, autoWidth: true })`);
    } else {
      system = this.vf.System({ x: 0, y: 0, width });
      this.t.literal(`system = factory.System({ x: 0, y: 0, width: ${width} })`);
    }

    system
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
}
