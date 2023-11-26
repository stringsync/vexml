import { Beam, BeamFragment, BeamRendering } from './beam';
import * as util from '@/util';
import { Tuplet, TupletFragment, TupletRendering } from './tuplet';

/** The result of rendering spanners. */
export type SpannersRendering = {
  beams: BeamRendering[];
  tuplets: TupletRendering[];
};

/** The accounting for all spanners. */
export class Spanners {
  private beams = new Array<Beam>();
  private tuplets = new Array<Tuplet>();

  /** Returns the additional padding needed to accommodate some spanners. */
  getPadding(): number {
    return 0;
  }

  /**
   * Adds a beam fragment.
   *
   * NOTE: This assumes the beam fragment with the lowest number was chosen.
   */
  addBeamFragment(beamFragment: BeamFragment): void {
    const beam = util.last(this.beams);

    if (beam?.isAllowed(beamFragment)) {
      beam.addFragment(beamFragment);
    } else if (beamFragment.value === 'begin') {
      this.beams.push(new Beam({ fragment: beamFragment }));
    }
  }

  /** Adds a tuplet fragment. */
  addTupletFragment(tupletFragment: TupletFragment): void {
    const tuplet = util.last(this.tuplets);

    if (tuplet?.isAllowed(tupletFragment)) {
      tuplet.addFragment(tupletFragment);
    } else if (tupletFragment.type === 'start') {
      this.tuplets.push(new Tuplet({ fragment: tupletFragment }));
    }
  }

  /** Renders all the spanners. */
  render(): SpannersRendering {
    return {
      beams: this.beams.map((beam) => beam.render()),
      tuplets: this.tuplets.map((tuplet) => tuplet.render()),
    };
  }
}
