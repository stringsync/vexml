import { Beam, BeamFragment, BeamRendering } from './beam';
import * as util from '@/util';

/** The result of rendering spanners. */
export type SpannersRendering = {
  beams: BeamRendering[];
};

/** The accounting for all spanners. */
export class Spanners {
  private beams = new Array<Beam>();

  /** Returns the additional padding needed to accommodate some spanners. */
  getPadding(): number {
    return 0;
  }

  /** Adds a beam fragment */
  addBeamFragment(beamFragment: BeamFragment): void {
    const value = beamFragment.musicXml.beam.getBeamValue();

    const beam = util.last(this.beams);

    if (beam?.canAddFragment(beamFragment)) {
      beam.addFragment(beamFragment);
    } else if (value === 'begin') {
      this.beams.push(new Beam({ fragment: beamFragment }));
    } else {
      console.debug('found invalid beam fragment, skipping');
    }
  }

  /** Renders all the spanners. */
  render(): SpannersRendering {
    return {
      beams: this.beams.map((beam) => beam.render()),
    };
  }
}
