import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';
import * as conversions from './conversions';

/** The result of rendering an accidental mark. */
export type AccidentalMarkRendering = {
  type: 'accidentalmark';
  vexflow: {
    ornament: vexflow.Ornament;
  };
};

/** Represents an accidental mark that is placed above or below (not next) a note. */
export class AccidentalMark {
  private musicXML: { accidentalMark: musicxml.AccidentalMark };

  constructor(opts: { musicXML: { accidentalMark: musicxml.AccidentalMark } }) {
    this.musicXML = opts.musicXML;
  }

  /** Renders the accidental mark. */
  render(): AccidentalMarkRendering {
    const accidentalType = this.musicXML.accidentalMark.getType();
    const accidentalCode = conversions.fromAccidentalTypeToAccidentalCode(accidentalType) ?? '';

    const vfOrnament = new vexflow.Ornament('').setUpperAccidental(accidentalCode);

    return {
      type: 'accidentalmark',
      vexflow: {
        ornament: vfOrnament,
      },
    };
  }
}
