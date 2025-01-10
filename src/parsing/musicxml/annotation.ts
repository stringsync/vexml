import * as data from '@/data';
import * as musicxml from '@/musicxml';
import { TextStateMachine } from './textstatemachine';

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
