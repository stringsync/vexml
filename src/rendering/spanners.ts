import { Beam, BeamFragment, BeamRendering } from './beam';
import * as util from '@/util';
import { Tuplet, TupletFragment, TupletRendering } from './tuplet';
import { Slur, SlurFragment, SlurRendering } from './slur';
import { Wedge, WedgeFragment, WedgeRendering } from './wedge';
import { Pedal, PedalFragment, PedalRendering } from './pedal';
import { Vibrato, VibratoFragment, VibratoRendering } from './vibrato';
import { OctaveShift, OctaveShiftFragment, OctaveShiftRendering } from './octaveshift';

/** The result of rendering spanners. */
export type SpannersRendering = {
  type: 'spanners';
  beams: BeamRendering[];
  tuplets: TupletRendering[];
  slurs: SlurRendering[];
  wedges: WedgeRendering[];
  pedals: PedalRendering[];
  vibratos: VibratoRendering[];
  octaveShifts: OctaveShiftRendering[];
};

/** The accounting for all spanners. */
export class Spanners {
  private beams = new Array<Beam>();
  private tuplets = new Array<Tuplet>();
  private slurs: Record<number, Slur[]> = {};
  private wedges = new Array<Wedge>();
  private pedals = new Array<Pedal>();
  private vibratos = new Array<Vibrato>();
  private octaveShifts = new Array<OctaveShift>();

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
    } else if (beamFragment.type === 'begin') {
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

  /** Adds a slur fragment. */
  addSlurFragment(slurFragment: SlurFragment): void {
    const number = slurFragment.slurNumber;
    this.slurs[number] ??= [];
    const slur = util.last(this.slurs[number]);

    if (slur?.isAllowed(slurFragment)) {
      slur.addFragment(slurFragment);
    } else if (slurFragment.type === 'start') {
      this.slurs[number].push(new Slur({ fragment: slurFragment }));
    }
  }

  /** Adds a wedge fragment. */
  addWedgeFragment(wedgeFragment: WedgeFragment): void {
    const wedge = util.last(this.wedges);

    if (wedge?.isAllowed(wedgeFragment)) {
      wedge.addFragment(wedgeFragment);
    } else if (wedgeFragment.type === 'start') {
      this.wedges.push(new Wedge({ fragment: wedgeFragment }));
    }
  }

  /** Adds a pedal fragment. */
  addPedalFragment(pedalFragment: PedalFragment): void {
    const pedal = util.last(this.pedals);

    if (pedal?.isAllowed(pedalFragment)) {
      pedal.addFragment(pedalFragment);
    } else if (['start', 'sostenuto', 'resume'].includes(pedalFragment.type)) {
      this.pedals.push(new Pedal({ fragment: pedalFragment }));
    }
  }

  /** Adds a vibrato fragment. */
  addVibratoFragment(vibratoFragment: VibratoFragment): void {
    const vibrato = util.last(this.vibratos);

    if (vibrato?.isAllowed(vibratoFragment)) {
      vibrato.addFragment(vibratoFragment);
    } else if (vibratoFragment.type === 'start') {
      this.vibratos.push(new Vibrato({ fragment: vibratoFragment }));
    }
  }

  /** Adds an octave shift fragment. */
  addOctaveShiftFragment(octaveShiftFragment: OctaveShiftFragment): void {
    const octaveShift = util.last(this.octaveShifts);

    if (octaveShift?.isAllowed(octaveShiftFragment)) {
      octaveShift.addFragment(octaveShiftFragment);
    } else if (octaveShiftFragment.type === 'start') {
      this.octaveShifts.push(
        new OctaveShift({
          fragment: octaveShiftFragment,
        })
      );
    }
  }

  /** Renders all the spanners. */
  render(): SpannersRendering {
    return {
      type: 'spanners',
      beams: this.beams.map((beam) => beam.render()),
      tuplets: this.tuplets.map((tuplet) => tuplet.render()),
      slurs: Object.values(this.slurs)
        .flat()
        .map((slur) => slur.render()),
      wedges: this.wedges.map((wedge) => wedge.render()),
      pedals: this.pedals.map((pedal) => pedal.render()),
      vibratos: this.vibratos.map((vibrato) => vibrato.render()),
      octaveShifts: this.octaveShifts.map((octaveShift) => octaveShift.render()),
    };
  }
}
