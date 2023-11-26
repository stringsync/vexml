import * as vexflow from 'vexflow';
import * as musicxml from '@/musicxml';
import * as util from '@/util';

/** The result of rendering a beam. */
export type BeamRendering = {
  type: 'beam';
  number: number;
  vexflow: {
    beam: vexflow.Beam;
  };
};

/** A piece of a beam. */
export type BeamFragment = {
  musicXml: {
    beam: musicxml.Beam;
  };
  vexflow: {
    stemmableNote: vexflow.StemmableNote;
  };
};

/** Represents a stem connector for a group of notes within a measure. */
export class Beam {
  private fragments: [BeamFragment, ...BeamFragment[]];

  constructor(opts: { fragment: BeamFragment }) {
    this.fragments = [opts.fragment];
  }

  /** Whether the fragment can be added. */
  canAddFragment(fragment: BeamFragment): boolean {
    const beam = fragment.musicXml.beam;
    const last = util.last(this.fragments.map((fragment) => fragment.musicXml.beam.getBeamValue()));
    const allowed = this.getAllowedBeamValues(last);
    return beam.getNumber() === this.getNumber() && allowed.includes(beam.getBeamValue());
  }

  /** Adds a fragment to the beam. */
  addFragment(fragment: BeamFragment): void {
    this.fragments.push(fragment);
  }

  /** Renders the beam. */
  render(): BeamRendering {
    const vfStemmableNotes = this.fragments.map((fragment) => fragment.vexflow.stemmableNote);
    const beam = new vexflow.Beam(vfStemmableNotes);

    return {
      type: 'beam',
      number: this.getNumber(),
      vexflow: { beam },
    };
  }

  private getNumber(): number {
    return this.fragments[0].musicXml.beam.getNumber();
  }

  private getAllowedBeamValues(beamValue: musicxml.BeamValue | null): musicxml.BeamValue[] {
    switch (beamValue) {
      case null:
        return ['begin'];
      case 'begin':
      case 'continue':
      case 'backward hook':
      case 'forward hook':
        return ['continue', 'backward hook', 'forward hook', 'end'];
      case 'end':
        return [];
    }
  }
}
