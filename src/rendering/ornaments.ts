import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';

/** The result of rendering an ornament. */
export type OrnamentsRendering = {
  type: 'ornaments';
  vexflow: {
    ornament: vexflow.Ornament;
  };
};

/** Represents multiple note ornaments. */
export class Ornaments {
  private musicXML: { ornaments: musicxml.Ornaments };

  constructor(opts: { musicXML: { ornaments: musicxml.Ornaments } }) {
    this.musicXML = opts.musicXML;
  }

  render(): OrnamentsRendering {
    const vfOrnamentType = this.getOrnamentType();
    const vfOrnament = new vexflow.Ornament(vfOrnamentType);

    return {
      type: 'ornaments',
      vexflow: {
        ornament: vfOrnament,
      },
    };
  }

  private getOrnamentType(): string {
    if (this.musicXML.ornaments.getTrillMarks().length > 0) {
      return 'tr';
    }
    return '';
  }
}
