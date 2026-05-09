import * as data from '@/data';
import * as musicxml from '@/musicxml';
import { TextStateMachine } from './textstatemachine';
import { Config } from '@/config';
import { Logger } from '@/debug';

export class Annotation {
  constructor(
    private config: Config,
    private log: Logger,
    private text: string,
    private horizontalJustification: data.AnnotationHorizontalJustification | null,
    private verticalJustification: data.AnnotationVerticalJustification | null
  ) {}

  static fromLyric(config: Config, log: Logger, musicXML: { lyric: musicxml.Lyric }): Annotation {
    const machine = new TextStateMachine();
    for (const component of musicXML.lyric.getComponents()) {
      machine.process(component);
    }
    return new Annotation(config, log, machine.getText(), 'center', 'bottom');
  }

  static fromFingering(config: Config, log: Logger, musicXML: { fingering: musicxml.Fingering }): Annotation | null {
    const number = musicXML.fingering.getNumber();
    if (typeof number === 'number') {
      return new Annotation(config, log, `${number}`, 'center', 'top');
    }
    return null;
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
