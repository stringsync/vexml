import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';

export type TremoloRendering = {
  type: 'tremolo';
  vexflow: {
    tremolo: vexflow.Tremolo;
  };
};

/** Represents a tremolo. */
export class Tremolo {
  private musicXML: { tremolo: musicxml.Tremolo };

  constructor(opts: { musicXML: { tremolo: musicxml.Tremolo } }) {
    this.musicXML = opts.musicXML;
  }

  /** Renders the tremolo. */
  render(): TremoloRendering {
    return {
      type: 'tremolo',
      vexflow: {
        tremolo: new vexflow.Tremolo(this.musicXML.tremolo.getTremoloMarksCount()),
      },
    };
  }
}
