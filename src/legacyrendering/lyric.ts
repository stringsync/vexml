import { Config } from '@/config';
import * as debug from '@/debug';
import * as vexflow from 'vexflow';
import * as musicxml from '@/musicxml';
import * as util from '@/util';

export type LyricRendering = {
  type: 'lyric';
  verseNumber: number;
  vexflow: {
    annotation: vexflow.Annotation;
  };
};

/** Represents a lyric attached to a single note. */
export class Lyric {
  private config: Config;
  private log: debug.Logger;
  private musicXML: { lyric: musicxml.Lyric };

  constructor(opts: { config: Config; log: debug.Logger; musicXML: { lyric: musicxml.Lyric } }) {
    this.config = opts.config;
    this.log = opts.log;
    this.musicXML = opts.musicXML;
  }

  /** Renders the Lyric. */
  render(): LyricRendering {
    const verseNumber = this.musicXML.lyric.getVerseNumber();

    this.log.debug('rendering lyric', { verseNumber });

    const text = this.getText();
    const vfAnnotation = new vexflow.Annotation(text).setVerticalJustification(
      vexflow.AnnotationVerticalJustify.BOTTOM
    );

    return {
      type: 'lyric',
      verseNumber,
      vexflow: {
        annotation: vfAnnotation,
      },
    };
  }

  @util.memoize()
  private getText(): string {
    const machine = new TextStateMachine();
    for (const component of this.musicXML.lyric.getComponents()) {
      machine.process(component);
    }
    return machine.getText();
  }
}

/** A state machine for calculating the text that should come from a <lyric> element. */
class TextStateMachine {
  private state: 'INITIAL' | 'IN_SYLLABLE' | 'AFTER_SYLLABLE' = 'INITIAL';
  private parts = new Array<string>();

  process(component: musicxml.LyricComponent): void {
    switch (this.state) {
      case 'INITIAL':
        this.processInitial(component);
        break;
      case 'IN_SYLLABLE':
        this.processInSyllable(component);
        break;
      case 'AFTER_SYLLABLE':
        this.processAfterSyllable(component);
        break;
    }
  }

  getText(): string {
    return this.parts.join('');
  }

  private processInitial(component: musicxml.LyricComponent): void {
    switch (component.type) {
      case 'syllabic':
        switch (component.value) {
          case 'begin':
          case 'middle':
            this.state = 'IN_SYLLABLE';
            break;
        }
        break;
      case 'text':
        this.parts.push(component.value);
        break;
    }
  }

  private processInSyllable(component: musicxml.LyricComponent): void {
    switch (component.type) {
      case 'syllabic':
        switch (component.value) {
          case 'single':
          case 'end':
            this.state = 'AFTER_SYLLABLE';
            break;
        }
        break;
      case 'text':
        this.parts.push(component.value);
        break;
    }
  }

  private processAfterSyllable(component: musicxml.LyricComponent): void {
    switch (component.type) {
      case 'elision':
        this.parts.push(component.value);
        this.state = 'INITIAL';
        break;
    }
  }
}
