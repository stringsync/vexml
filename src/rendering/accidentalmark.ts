import * as debug from '@/debug';
import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';
import * as conversions from './conversions';
import { Config } from '@/config';

/** The result of rendering an accidental mark. */
export type AccidentalMarkRendering = {
  type: 'accidentalmark';
  vexflow: {
    ornament: vexflow.Ornament;
  };
};

/** Represents an accidental mark that is placed above or below (not next) a note. */
export class AccidentalMark {
  private config: Config;
  private log: debug.Logger;
  private musicXML: { accidentalMark: musicxml.AccidentalMark };

  constructor(opts: { config: Config; log: debug.Logger; musicXML: { accidentalMark: musicxml.AccidentalMark } }) {
    this.config = opts.config;
    this.log = opts.log;
    this.musicXML = opts.musicXML;
  }

  /** Renders the accidental mark. */
  render(): AccidentalMarkRendering {
    const accidentalType = this.musicXML.accidentalMark.getType();
    const accidentalCode = conversions.fromAccidentalTypeToAccidentalCode(accidentalType) ?? '';

    this.log.debug('rendering accidental mark', { accidentalType, accidentalCode });

    const vfOrnament = new vexflow.Ornament('').setUpperAccidental(accidentalCode);

    return {
      type: 'accidentalmark',
      vexflow: {
        ornament: vfOrnament,
      },
    };
  }
}
