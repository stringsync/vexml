import * as VF from 'vexflow';
import { CodePrinter } from './codeprinter';
import { NamedNode } from './namednode';
import { Score } from './score';
import { CodeTracker } from './types';

export type RenderOptions = {
  codeTracker?: CodeTracker;
};

export class Vexml {
  static render(elementId: string, xml: string, opts: RenderOptions = {}): void {
    // parse xml
    const parser = new DOMParser();
    const root = parser.parseFromString(xml, 'application/xml');

    // find exactly 1 <score-partwise> element
    const elements = root.getElementsByTagName('score-partwise');
    if (elements.length !== 1) {
      throw new Error(`expected exactly 1 <score-partwise> element, got ${elements.length}`);
    }
    const scorePartwise = NamedNode.of<'score-partwise'>(elements.item(0)!);

    // create instance
    const score = new Score(scorePartwise);
    const codeTracker = opts.codeTracker ?? CodePrinter.noop();
    const vexml = new Vexml({ score, codeTracker, elementId });

    // render
    vexml.render();
  }

  private score: Score;
  private codeTracker: CodeTracker;
  private elementId: string;

  private constructor(opts: { score: Score; codeTracker: CodeTracker; elementId: string }) {
    this.score = opts.score;
    this.codeTracker = opts.codeTracker;
    this.elementId = opts.elementId;
  }

  private render(): void {
    const { codeTracker: t, elementId } = this;

    // declare VF
    t.literal('const VF = Vex.Flow;');
    t.newline();

    // create factory, which has a side effect of rendering an empty <svg>
    const factory = new VF.Factory({ renderer: { elementId, width: 2000, height: 400 } });
    t.literal(`const factory = new VF.Factory({ renderer: { elementId: '${elementId}', width: 2000, height: 400 } });`);
  }
}
