import { Config } from '@/config';
import * as debug from '@/debug';
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
  private config: Config;
  private log: debug.Logger;
  private musicXML: { tremolo: musicxml.Tremolo };

  constructor(opts: { config: Config; log: debug.Logger; musicXML: { tremolo: musicxml.Tremolo } }) {
    this.config = opts.config;
    this.log = opts.log;
    this.musicXML = opts.musicXML;
  }

  /** Renders the tremolo. */
  render(): TremoloRendering {
    const marksCount = this.musicXML.tremolo.getTremoloMarksCount();

    this.log.debug('rendering tremolo', { marksCount });

    return {
      type: 'tremolo',
      vexflow: {
        tremolo: new vexflow.Tremolo(marksCount),
      },
    };
  }
}
