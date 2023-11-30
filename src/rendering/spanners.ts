import * as util from '@/util';
import { Beam, BeamRendering } from './beam';
import { Tuplet, TupletFragment, TupletRendering } from './tuplet';
import { Slur, SlurFragment, SlurRendering } from './slur';
import { Wedge, WedgeRendering } from './wedge';
import { Pedal, PedalFragment, PedalRendering } from './pedal';
import { Vibrato, VibratoFragment, VibratoRendering } from './vibrato';
import { OctaveShift, OctaveShiftFragment, OctaveShiftRendering } from './octaveshift';
import { SpannerData } from './types';
import { SpannerMap } from './spannermap';

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
  private beams = SpannerMap.keyless<Beam>();
  private tuplets = new Array<Tuplet>();
  private slurs = new SpannerMap<number, Slur>();
  private wedges = SpannerMap.keyless<Wedge>();
  private pedals = new Array<Pedal>();
  private vibratos = new Array<Vibrato>();
  private octaveShifts = new Array<OctaveShift>();

  /** Returns the additional padding needed to accommodate some spanners. */
  getPadding(): number {
    // TODO: When there are spanners that affect width, use them to determine how much padding to add.
    return 0;
  }

  /** Extracts and processes all the spanners within the given data. */
  process(data: SpannerData): void {
    Beam.process(data, this.beams);
    Wedge.process(data, this.wedges);
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
    const slur = this.slurs.get(number);

    if (slur?.isAllowed(slurFragment)) {
      slur.addFragment(slurFragment);
    } else if (slurFragment.type === 'start') {
      this.slurs.push(number, new Slur({ fragment: slurFragment }));
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
      beams: this.beams.values().map((beam) => beam.render()),
      tuplets: this.tuplets.map((tuplet) => tuplet.render()),
      slurs: this.slurs.values().map((slur) => slur.render()),
      wedges: this.wedges.values().map((wedge) => wedge.render()),
      pedals: this.pedals.map((pedal) => pedal.render()),
      vibratos: this.vibratos.map((vibrato) => vibrato.render()),
      octaveShifts: this.octaveShifts.map((octaveShift) => octaveShift.render()),
    };
  }
}
