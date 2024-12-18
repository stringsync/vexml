import * as debug from '@/debug';
import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';
import { Config } from '@/config';

/** The result of rendering an ending bracket. */
export type EndingBracketRendering = {
  type: 'endingbracket';
  label: string;
  vexflow: {
    voltaType: vexflow.VoltaType;
  };
};

/** The types of ending brackets. */
export type EndingBracketType = 'start' | 'stop' | 'discontinue';

/** Represents a volta, which is the ending bracket for a repeated section of music. */
export class EndingBracket {
  private config: Config;
  private log: debug.Logger;
  private label: string;
  private type: EndingBracketType;

  constructor(opts: { config: Config; log: debug.Logger; label: string; type: EndingBracketType }) {
    this.config = opts.config;
    this.log = opts.log;
    this.label = opts.label;
    this.type = opts.type;
  }

  static fromMusicXML(opts: { config: Config; log: debug.Logger; musicXML: { barline: musicxml.Barline } }) {
    const barline = opts.musicXML.barline;
    if (!barline.isEnding()) {
      throw new Error('Barline is not an ending');
    }

    const type = barline.getEndingType();
    const text = barline.getEndingText();
    const number = barline.getEndingNumber();
    const label = text ? text : `${number}.`;
    const config = opts.config;
    const log = opts.log;

    return new EndingBracket({ config, log, label, type });
  }

  render(): EndingBracketRendering {
    this.log.debug('rendering ending bracket', { label: this.label, type: this.type });

    return {
      type: 'endingbracket',
      label: this.label,
      vexflow: {
        voltaType: this.getVfVoltaType(),
      },
    };
  }

  private getVfVoltaType(): vexflow.VoltaType {
    switch (this.type) {
      case 'start':
        return vexflow.Volta.type.BEGIN;
      case 'stop':
        return vexflow.Volta.type.END;
      case 'discontinue':
        return vexflow.Volta.type.BEGIN_END;
    }
  }
}
