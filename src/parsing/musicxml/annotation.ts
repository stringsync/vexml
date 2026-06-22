import * as data from '@/data';
import * as musicxml from '@/musicxml';
import type * as mdom from '@stringsync/mdom';
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

  static fromMdomLyric(config: Config, log: Logger, mdom: { lyric: mdom.MElement }): Annotation {
    const machine = new TextStateMachine();
    for (const child of mdom.lyric.children) {
      const element = child as mdom.MElement;
      if (element.tag === 'syllabic') {
        machine.process({ type: 'syllabic', value: element.text ?? 'single' } as musicxml.LyricComponent);
      } else if (element.tag === 'text') {
        machine.process({ type: 'text', value: element.text ?? '' });
      } else if (element.tag === 'elision') {
        machine.process({ type: 'elision', value: element.text ?? '' });
      }
    }
    return new Annotation(config, log, machine.getText(), 'center', 'bottom');
  }

  static fromMdomFingering(config: Config, log: Logger, mdom: { fingering: mdom.MElement }): Annotation | null {
    const raw = mdom.fingering.text;
    const number = typeof raw === 'string' ? parseInt(raw, 10) : NaN;
    if (!Number.isNaN(number)) {
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
