import * as data from '@/data';
import * as musicxml from '@/musicxml';

export class Annotation {
  constructor(
    private text: string,
    private horizontalJustification: data.AnnotationHorizontalJustification | null,
    private verticalJustification: data.AnnotationVerticalJustification | null
  ) {}

  static fromLyric(musicXML: { lyric: musicxml.Lyric }): Annotation {
    const machine = new TextStateMachine();
    for (const component of musicXML.lyric.getComponents()) {
      machine.process(component);
    }
    return new Annotation(machine.getText(), 'center', 'bottom');
  }

  parse(): data.Annotation {
    return {
      type: 'annotation',
      text: this.text,
      horizontalJustification: this.horizontalJustification,
      verticalJustification: this.verticalJustification,
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
