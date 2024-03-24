import * as vexflow from 'vexflow';
import * as util from '@/util';
import * as conversions from './conversions';
import { SpannerData } from './types';
import { SpannerMap } from './spannermap';

/** The result of rendering a beam. */
export type BeamRendering = {
  type: 'beam';
  vexflow: {
    beam: vexflow.Beam | null;
  };
};

/** A piece of a beam. */
export type BeamFragment = {
  type: BeamFragmentType;
  vexflow: {
    stemmableNote: vexflow.StemmableNote;
  };
};

export type BeamFragmentType = 'start' | 'continue' | 'stop';

/** A container for wedges. */
export type BeamContainer = SpannerMap<null, Beam>;

/** Represents a stem connector for a group of notes within a measure. */
export class Beam {
  private fragments: [BeamFragment, ...BeamFragment[]];

  private constructor(opts: { fragment: BeamFragment }) {
    this.fragments = [opts.fragment];
  }

  static process(data: SpannerData, container: BeamContainer): void {
    // vexflow does the heavy lifting of figuring out the specific beams. We just need to know when a beam starts,
    // continues, or stops.
    const beams = util.sortBy(data.musicXML.note?.getBeams() ?? [], (beam) => beam.getNumber());
    const beamValue = util.first(beams)?.getBeamValue() ?? null;
    const type = conversions.fromBeamValueToBeamFragmentType(beamValue);

    if (type) {
      Beam.commit(
        {
          type,
          vexflow: {
            stemmableNote: data.vexflow.note,
          },
        },
        container
      );
    }
  }

  /** Conditionally commits the fragment when it can be accepted. */
  private static commit(fragment: BeamFragment, container: BeamContainer): void {
    const beam = container.get(null);
    const last = beam?.getLastFragment();
    const isAllowedType = Beam.getAllowedTypes(last?.type).includes(fragment.type);

    if (fragment.type === 'start') {
      container.push(null, new Beam({ fragment }));
    } else if (beam && isAllowedType) {
      beam.fragments.push(fragment);
    }
  }

  private static getAllowedTypes(type: BeamFragmentType | undefined): BeamFragmentType[] {
    switch (type) {
      case 'start':
      case 'continue':
        return ['continue', 'stop'];
      case 'stop':
        return [];
      default:
        return [];
    }
  }

  /** Renders the beam. */
  render(): BeamRendering {
    const vfStemmableNotes = this.fragments.map((fragment) => fragment.vexflow.stemmableNote);
    const beam = vfStemmableNotes.length > 1 ? new vexflow.Beam(vfStemmableNotes) : null;

    return {
      type: 'beam',
      vexflow: { beam },
    };
  }

  private getLastFragment(): BeamFragment {
    return util.last(this.fragments)!;
  }
}
