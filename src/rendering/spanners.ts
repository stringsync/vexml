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
import { Tie, TieRendering } from './tie';
import { HammerOn, HammerOnRendering } from './hammeron';
import { PullOff, PullOffRendering } from './pulloff';
import { Slide, SlideRendering } from './slide';

/** The result of rendering spanners. */
export type SpannersRendering = {
  type: 'spanners';
  beams: BeamRendering[];
  tuplets: TupletRendering[];
  slurs: SlurRendering[];
  ties: TieRendering[];
  wedges: WedgeRendering[];
  pedals: PedalRendering[];
  vibratos: VibratoRendering[];
  octaveShifts: OctaveShiftRendering[];
  hammerOns: HammerOnRendering[];
  pullOffs: PullOffRendering[];
  slides: SlideRendering[];
};

/** The accounting for all spanners. */
export class Spanners {
  private beams = SpannerMap.keyless<Beam>();
  private tuplets = SpannerMap.keyless<Tuplet>();
  private slurs = new SpannerMap<number, Slur>();
  private ties = new SpannerMap<number, Tie>();
  private wedges = SpannerMap.keyless<Wedge>();
  private pedals = SpannerMap.keyless<Pedal>();
  private vibratos = SpannerMap.keyless<Vibrato>();
  private octaveShifts = SpannerMap.keyless<OctaveShift>();
  private hammerOns = new SpannerMap<number, HammerOn>();
  private pullOffs = new SpannerMap<number, PullOff>();
  private slides = new SpannerMap<number, Slide>();

  /** Returns the additional padding needed to accommodate some spanners. */
  getExtraMeasureFragmentWidth(address: Address<'measurefragment'>): number {
    const tupletExtraWidth = util.sum(
      this.tuplets.values().map((tuplet) => tuplet.getExtraMeasureFragmentWidth(address))
    );

    const slurExtraWidth = util.sum(this.slurs.values().map((slur) => slur.getExtraMeasureFragmentWidth(address)));

    return tupletExtraWidth + slurExtraWidth;
  }

  /** Extracts and processes all the spanners within the given data. */
  process(data: SpannerData): void {
    Beam.process(data, this.beams);
    Tuplet.process(data, this.tuplets);
    Slur.process(data, this.slurs);
    Tie.process(data, this.ties);
    Wedge.process(data, this.wedges);
    Pedal.process(data, this.pedals);
    Vibrato.process(data, this.vibratos);
    OctaveShift.process(data, this.octaveShifts);
    HammerOn.process(data, this.hammerOns);
    PullOff.process(data, this.pullOffs);
    Slide.process(data, this.slides);
  }

  /** Renders all the spanners. */
  render(): SpannersRendering {
    return {
      type: 'spanners',
      beams: this.beams.values().map((beam) => beam.render()),
      tuplets: this.tuplets.values().map((tuplet) => tuplet.render()),
      slurs: this.slurs.values().map((slur) => slur.render()),
      ties: this.ties.values().map((tie) => tie.render()),
      wedges: this.wedges.values().map((wedge) => wedge.render()),
      pedals: this.pedals.values().map((pedal) => pedal.render()),
      vibratos: this.vibratos.values().map((vibrato) => vibrato.render()),
      octaveShifts: this.octaveShifts.values().map((octaveShift) => octaveShift.render()),
      hammerOns: this.hammerOns.values().map((hammerOn) => hammerOn.render()),
      pullOffs: this.pullOffs.values().map((pullOff) => pullOff.render()),
      slides: this.slides.values().map((slide) => slide.render()),
    };
  }
}
