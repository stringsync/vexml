import * as vexflow from 'vexflow';
import * as musicxml from '@/musicxml';

export type LyricRendering = {
  type: 'lyric';
  verseNumber: number;
  vexflow: {
    annotation: vexflow.Annotation;
  };
};

/** Represents a lyric attached to a single note. */
export class Lyric {
  private verseNumber: number;
  private text: string;

  private constructor(opts: { verseNumber: number; text: string }) {
    this.verseNumber = opts.verseNumber;
    this.text = opts.text;
  }

  /** Creates a Lyric. */
  static create(opts: { lyric: musicxml.Lyric }): Lyric {
    const verseNumber = opts.lyric.getVerseNumber();

    const machine = new TextStateMachine();
    for (const component of opts.lyric.getComponents()) {
      machine.process(component);
    }
    const text = machine.getText();

    return new Lyric({ verseNumber, text });
  }

  /** Clones the Lyric. */
  clone(): Lyric {
    return new Lyric({ verseNumber: this.verseNumber, text: this.text });
  }

  /** Renders the Lyric. */
  render(): LyricRendering {
    const vfAnnotation = new vexflow.Annotation(this.text).setVerticalJustification(
      vexflow.AnnotationVerticalJustify.BOTTOM
    );

    return {
      type: 'lyric',
      verseNumber: this.verseNumber,
      vexflow: {
        annotation: vfAnnotation,
      },
    };
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
