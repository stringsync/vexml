import { Beam, BeamFragment, BeamRendering } from './beam';
import * as util from '@/util';

/** The result of rendering spanners. */
export type Spanners2Rendering = {
  beams: BeamRendering[];
};

/** The accounting for all spanners. */
export class Spanners2 {
  private beams: Record<number, Beam[]> = {};

  addBeamFragment(beamFragment: BeamFragment): void {
    const number = beamFragment.musicXml.beam.getNumber();
    const value = beamFragment.musicXml.beam.getBeamValue();

    this.beams[number] ??= [];
    const beam = util.last(this.beams[number]);

    if (beam?.canAddFragment(beamFragment)) {
      beam.addFragment(beamFragment);
    } else if (value === 'begin') {
      this.beams[number].push(new Beam({ fragment: beamFragment }));
    } else {
      console.debug('found invalid beam fragment, skipping');
    }
  }

  render(): Spanners2Rendering {
    return {
      beams: Object.values(this.beams)
        .flat()
        .map((beam) => beam.render()),
    };
  }
}
