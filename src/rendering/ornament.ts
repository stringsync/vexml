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
  private musicXml: { ornaments: musicxml.Ornaments };

  constructor(opts: { musicXml: { ornaments: musicxml.Ornaments } }) {
    this.musicXml = opts.musicXml;
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
    if (this.musicXml.ornaments.hasTrillMark()) {
      return 'tr';
    }
    return '';
  }
}
