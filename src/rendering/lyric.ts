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
  private lyric: musicxml.Lyric;

  private constructor(opts: { lyric: musicxml.Lyric }) {
    this.lyric = opts.lyric;
  }

  /** Creates a Lyric. */
  static create(opts: { lyric: musicxml.Lyric }): Lyric {
    const lyric = opts.lyric;
    return new Lyric({ lyric });
  }

  /** Renders the Lyric. */
  render(): LyricRendering {
    const verseNumber = this.lyric.getVerseNumber();
    const text = this.getAnnotationText();
    const vfAnnotation = new vexflow.Annotation(text).setPosition(vexflow.ModifierPosition.BELOW);

    return {
      type: 'lyric',
      verseNumber,
      vexflow: {
        annotation: vfAnnotation,
      },
    };
  }

  private getAnnotationText(): string {
    const machine = new LyricStateMachine();

    for (const component of this.lyric.getComponents()) {
      machine.process(component);
    }

    return machine.getText();
  }
}

/** A state machine for calculating the text that should come from a <lyric> element. */
class LyricStateMachine {
  private state: 'INITIAL' | 'IN_SYLLABLE' | 'AFTER_SYLLABLE' = 'INITIAL';
  private textParts = new Array<string>();

  process(component: musicxml.LyricComponent): void {
    switch (this.state) {
      case 'INITIAL':
        if (component.type === 'syllabic' || component.type === 'text') {
          this.push(component.value);
          this.state =
            component.type === 'syllabic' && (component.value === 'begin' || component.value === 'middle')
              ? 'IN_SYLLABLE'
              : 'AFTER_SYLLABLE';
        }
        break;
      case 'IN_SYLLABLE':
        if (component.type === 'text') {
          this.push(component.value);
        } else if (component.type === 'syllabic' && (component.value === 'end' || component.value === 'single')) {
          this.state = 'AFTER_SYLLABLE';
        } else if (component.type === 'elision') {
          this.push(component.value);
        }
        break;
      case 'AFTER_SYLLABLE':
        if (component.type === 'elision') {
          this.push(component.value);
          this.state = 'INITIAL';
        }
        break;
    }
  }

  getText(): string {
    return this.textParts.join('');
  }

  private push(part: string): void {
    this.textParts.push(part);
  }
}
