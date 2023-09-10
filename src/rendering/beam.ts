import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';

type CreateOptions = {
  musicXml: {
    beam: musicxml.Beam;
  };
};

type RenderOptions = {
  ctx: vexflow.RenderContext;
};

export class Beam {
  static create(opts: CreateOptions): Beam {
    const beamNumber = opts.musicXml.beam.getNumber();
    const beamValue = opts.musicXml.beam.getBeamValue();
    return new Beam(beamNumber, beamValue);
  }

  private beamNumber: number;
  private beamValue: musicxml.BeamValue;

  private constructor(beamNumber: number, beamValue: musicxml.BeamValue) {
    this.beamNumber = beamNumber;
    this.beamValue = beamValue;
  }

  render(opts: RenderOptions): void {
    // noop
  }
}
