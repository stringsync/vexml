import { Config } from '@/config';
import * as debug from '@/debug';
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
  private config: Config;
  private log: debug.Logger;

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

  constructor(opts: { config: Config; log: debug.Logger }) {
    this.config = opts.config;
    this.log = opts.log;
  }

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
    const config = this.config;
    const log = this.log;

    Beam.process({ config, log, data, container: this.beams });
    Tuplet.process({ config, log, data, container: this.tuplets });
    Slur.process({ config, log, data, container: this.slurs });
    Tie.process({ config, log, data, container: this.ties });
    Wedge.process({ config, log, data, container: this.wedges });
    Pedal.process({ config, log, data, container: this.pedals });
    Vibrato.process({ config, log, data, container: this.vibratos });
    OctaveShift.process({ config, log, data, container: this.octaveShifts });
    HammerOn.process({ config, log, data, container: this.hammerOns });
    PullOff.process({ config, log, data, container: this.pullOffs });
    Slide.process({ config, log, data, container: this.slides });
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
