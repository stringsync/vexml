import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';

/** The result of rendering an ornament. */
export type OrnamentRendering = {
  type: 'ornament';
  vexflow: {
    ornament: vexflow.Ornament;
  };
};

/** Represents a note ornament. */
export class Ornament {
  private musicXML: { ornaments: musicxml.Ornaments };

  constructor(opts: { musicXML: { ornaments: musicxml.Ornaments } }) {
    this.musicXML = opts.musicXML;
  }

  render(): OrnamentRendering {
    const vfOrnamentType = this.getOrnamentType();
    const vfOrnament = new vexflow.Ornament(vfOrnamentType);

    return {
      type: 'ornament',
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
