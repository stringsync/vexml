import { Beam, BeamRendering } from './beam';
import { Tuplet, TupletRendering } from './tuplet';
import { Slur, SlurRendering } from './slur';
import { Wedge, WedgeRendering } from './wedge';
import { Pedal, PedalRendering } from './pedal';
import { Vibrato, VibratoRendering } from './vibrato';
import { OctaveShift, OctaveShiftRendering } from './octaveshift';
import { SpannerData } from './types';
import { SpannerMap } from './spannermap';
import * as util from '@/util';
import { Address } from './address';

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
  private pedals = SpannerMap.keyless<Pedal>();
  private vibratos = SpannerMap.keyless<Vibrato>();
  private octaveShifts = SpannerMap.keyless<OctaveShift>();

  /** Returns the additional padding needed to accommodate some spanners. */
  getExtraMeasureFragmentWidth(address: Address<'measurefragment'>): number {
    return util.sum(this.tuplets.values().map((tuplet) => tuplet.getExtraMeasureFragmentWidth(address)));
  }

  /** Extracts and processes all the spanners within the given data. */
  process(data: SpannerData): void {
    Beam.process(data, this.beams);
    Tuplet.process(data, this.tuplets);
    Slur.process(data, this.slurs);
    Wedge.process(data, this.wedges);
    Pedal.process(data, this.pedals);
    Vibrato.process(data, this.vibratos);
    OctaveShift.process(data, this.octaveShifts);
  }

  /** Renders all the spanners. */
  render(): SpannersRendering {
    return {
      type: 'spanners',
      beams: this.beams.values().map((beam) => beam.render()),
      tuplets: this.tuplets.values().map((tuplet) => tuplet.render()),
      slurs: this.slurs.values().map((slur) => slur.render()),
      wedges: this.wedges.values().map((wedge) => wedge.render()),
      pedals: this.pedals.values().map((pedal) => pedal.render()),
      vibratos: this.vibratos.values().map((vibrato) => vibrato.render()),
      octaveShifts: this.octaveShifts.values().map((octaveShift) => octaveShift.render()),
    };
  }
}
