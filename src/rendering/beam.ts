import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';

/** The result of rendering a Beam. */
export type BeamRendering = {
  type: 'beam';
  vexflow: {
    beam: vexflow.Beam;
  };
};

/**
 * Represents a musical beam, which connects consecutive notes of shorter durations.
 *
 * The `Beam` class encapsulates the linear graphical symbols used to group consecutive quavers (eighth notes) and
 * shorter duration notes. Beaming affects the visual presentation of music but not its rhythmic interpretation. By
 * connecting these notes, beams help in visually organizing the music, making it easier to read, especially in passages
 * with complex rhythms.
 *
 * Beams are crucial in indicating metric groupings and showing phrasing, especially in pieces with irregular or complex
 * time signatures.
 */
export class Beam {
  private beamNumber: number;
  private beamValue: musicxml.BeamValue;

  private constructor(opts: { beamNumber: number; beamValue: musicxml.BeamValue }) {
    this.beamNumber = opts.beamNumber;
    this.beamValue = opts.beamValue;
  }

  /** Creates a Beam. */
  static create(opts: {
    musicXml: {
      beam: musicxml.Beam;
    };
  }): Beam {
    const beamNumber = opts.musicXml.beam.getNumber();
    const beamValue = opts.musicXml.beam.getBeamValue();
    return new Beam({ beamNumber, beamValue });
  }

  /** Clones the Beam. */
  clone(): Beam {
    return new Beam({
      beamNumber: this.beamNumber,
      beamValue: this.beamValue,
    });
  }

  /** Renders the Beam. */
  render(): BeamRendering {
    const vfBeam = new vexflow.Beam([]);
    return { type: 'beam', vexflow: { beam: vfBeam } };
  }
}
