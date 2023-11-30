import * as util from '@/util';
import { Beam, BeamRendering } from './beam';
import { Tuplet, TupletRendering } from './tuplet';
import { Slur, SlurRendering } from './slur';
import { Wedge, WedgeRendering } from './wedge';
import { Pedal, PedalFragment, PedalRendering } from './pedal';
import { Vibrato, VibratoRendering } from './vibrato';
import { OctaveShift, OctaveShiftRendering } from './octaveshift';
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
  private tuplets = SpannerMap.keyless<Tuplet>();
  private slurs = new SpannerMap<number, Slur>();
  private wedges = SpannerMap.keyless<Wedge>();
  private pedals = new Array<Pedal>();
  private vibratos = SpannerMap.keyless<Vibrato>();
  private octaveShifts = SpannerMap.keyless<OctaveShift>();

  /** Returns the additional padding needed to accommodate some spanners. */
  getPadding(): number {
    // TODO: When there are spanners that affect width, use them to determine how much padding to add.
    return 0;
  }

  /** Extracts and processes all the spanners within the given data. */
  process(data: SpannerData): void {
    Beam.process(data, this.beams);
    Tuplet.process(data, this.tuplets);
    Slur.process(data, this.slurs);
    Wedge.process(data, this.wedges);
    Vibrato.process(data, this.vibratos);
    OctaveShift.process(data, this.octaveShifts);
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

  /** Renders all the spanners. */
  render(): SpannersRendering {
    return {
      type: 'spanners',
      beams: this.beams.values().map((beam) => beam.render()),
      tuplets: this.tuplets.values().map((tuplet) => tuplet.render()),
      slurs: this.slurs.values().map((slur) => slur.render()),
      wedges: this.wedges.values().map((wedge) => wedge.render()),
      pedals: this.pedals.map((pedal) => pedal.render()),
      vibratos: this.vibratos.values().map((vibrato) => vibrato.render()),
      octaveShifts: this.octaveShifts.values().map((octaveShift) => octaveShift.render()),
    };
  }
}
