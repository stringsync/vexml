import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';

export type BeamRendering = {
  type: 'beam';
  vexflow: {
    beam: vexflow.Beam;
  };
};

export class Beam {
  private beamNumber: number;
  private beamValue: musicxml.BeamValue;

  private constructor(opts: { beamNumber: number; beamValue: musicxml.BeamValue }) {
    this.beamNumber = opts.beamNumber;
    this.beamValue = opts.beamValue;
  }

  static create(opts: {
    musicXml: {
      beam: musicxml.Beam;
    };
  }): Beam {
    const beamNumber = opts.musicXml.beam.getNumber();
    const beamValue = opts.musicXml.beam.getBeamValue();
    return new Beam({ beamNumber, beamValue });
  }

  clone(): Beam {
    return new Beam({
      beamNumber: this.beamNumber,
      beamValue: this.beamValue,
    });
  }

  render(): BeamRendering {
    const vfBeam = new vexflow.Beam([]);
    return { type: 'beam', vexflow: { beam: vfBeam } };
  }
}
