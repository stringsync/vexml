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

  private constructor(beamNumber: number, beamValue: musicxml.BeamValue) {
    this.beamNumber = beamNumber;
    this.beamValue = beamValue;
  }

  static create(opts: {
    musicXml: {
      beam: musicxml.Beam;
    };
  }): Beam {
    const beamNumber = opts.musicXml.beam.getNumber();
    const beamValue = opts.musicXml.beam.getBeamValue();
    return new Beam(beamNumber, beamValue);
  }

  render(): BeamRendering {
    const vfBeam = new vexflow.Beam([]);
    return { type: 'beam', vexflow: { beam: vfBeam } };
  }
}
