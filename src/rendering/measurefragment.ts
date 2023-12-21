import { Config } from './config';
import { Stave, StaveModifier, StaveRendering } from './stave';
import * as musicxml from '@/musicxml';
import * as util from '@/util';
import { MeasureEntry, StaveSignature } from './stavesignature';
import { Address } from './address';
import { Spanners } from './spanners';

const STAVE_SIGNATURE_ONLY_MEASURE_FRAGMENT_PADDING = 8;

/** The result of rendering a measure fragment. */
export type MeasureFragmentRendering = {
  type: 'measurefragment';
  address: Address<'measurefragment'>;
  staves: StaveRendering[];
  width: number;
};

/**
 * Represents a fragment of a measure.
 *
 * A measure fragment is necessary when stave modifiers change. It is not a formal musical concept, and it is moreso an
 * outcome of vexflow's Stave implementation.
 */
export class MeasureFragment {
  private config: Config;
  private index: number;
  private leadingStaveSignature: StaveSignature;
  private measureEntries: MeasureEntry[];
  private staveLayouts: musicxml.StaveLayout[];
  private staveCount: number;
  private beginningBarStyle: musicxml.BarStyle;
  private endBarStyle: musicxml.BarStyle;

  constructor(opts: {
    config: Config;
    index: number;
    leadingStaveSignature: StaveSignature;
    measureEntries: MeasureEntry[];
    staveLayouts: musicxml.StaveLayout[];
    staveCount: number;
    beginningBarStyle: musicxml.BarStyle;
    endBarStyle: musicxml.BarStyle;
  }) {
    this.config = opts.config;
    this.index = opts.index;
    this.leadingStaveSignature = opts.leadingStaveSignature;
    this.measureEntries = opts.measureEntries;
    this.staveLayouts = opts.staveLayouts;
    this.staveCount = opts.staveCount;
    this.beginningBarStyle = opts.beginningBarStyle;
    this.endBarStyle = opts.endBarStyle;
  }

  /** Returns the index of the measure fragment within the measure. */
  getIndex(): number {
    return this.index;
  }

  /** Returns the minimum required width for the measure fragment. */
  getMinRequiredWidth(opts: {
    address: Address<'measurefragment'>;
    previousMeasureFragment: MeasureFragment | null;
  }): number {
    const staveModifiers = this.getStaveModifiers({
      address: opts.address,
      previousMeasureFragment: opts.previousMeasureFragment,
    });
    const staveModifiersWidth = this.getStaveModifiersWidth(Array.from(staveModifiers));

    return this.getMinJustifyWidth(opts.address) + staveModifiersWidth + this.getRightPadding();
  }

  /** Returns the top padding for the measure fragment. */
  getTopPadding(): number {
    return util.max(this.getStaves().map((stave) => stave.getTopPadding()));
  }

  getMultiRestCount(): number {
    // TODO: One stave could be a multi measure rest, while another one could have voices.
    return util.max(this.getStaves().map((stave) => stave.getMultiRestCount()));
  }

  /** Renders the MeasureFragment. */
  render(opts: {
    x: number;
    y: number;
    address: Address<'measurefragment'>;
    spanners: Spanners;
    systemCount: number;
    targetSystemWidth: number;
    minRequiredSystemWidth: number;
    previousMeasureFragment: MeasureFragment | null;
    nextMeasureFragment: MeasureFragment | null;
  }): MeasureFragmentRendering {
    const staveRenderings = new Array<StaveRendering>();

    const isLastSystem = opts.address.getSystemIndex() === opts.systemCount - 1;
    const width = isLastSystem
      ? this.getMinRequiredWidth({
          address: opts.address,
          previousMeasureFragment: opts.previousMeasureFragment,
        })
      : this.getSystemFitWidth({
          address: opts.address,
          minRequiredSystemWidth: opts.minRequiredSystemWidth,
          targetSystemWidth: opts.targetSystemWidth,
          previousMeasureFragment: opts.previousMeasureFragment,
        });

    let y = opts.y;

    const staveModifiers = this.getStaveModifiers({
      address: opts.address,
      previousMeasureFragment: opts.previousMeasureFragment,
    });

    // Render staves.
    util.forEachTriple(this.getStaves(), ([previousStave, currentStave, nextStave], { isFirst, isLast }) => {
      if (isFirst) {
        previousStave = util.last(opts.previousMeasureFragment?.getStaves() ?? []);
      }
      if (isLast) {
        nextStave = util.first(opts.nextMeasureFragment?.getStaves() ?? []);
      }

      const staveRendering = currentStave.render({
        x: opts.x,
        y,
        address: opts.address.stave({ staveNumber: currentStave.getNumber() }),
        spanners: opts.spanners,
        width,
        modifiers: staveModifiers,
        previousStave,
        nextStave,
      });
      staveRenderings.push(staveRendering);

      const staveDistance =
        this.staveLayouts.find((staveLayout) => staveLayout.staveNumber === staveRendering.staveNumber)
          ?.staveDistance ?? this.config.DEFAULT_STAVE_DISTANCE;

      y += staveDistance;
    });

    return {
      type: 'measurefragment',
      address: opts.address,
      staves: staveRenderings,
      width,
    };
  }

  @util.memoize()
  private getStaves(): Stave[] {
    const staves = new Array<Stave>(this.staveCount);

    for (let staveIndex = 0; staveIndex < this.staveCount; staveIndex++) {
      const staveNumber = staveIndex + 1;

      staves[staveIndex] = new Stave({
        config: this.config,
        staveSignature: this.leadingStaveSignature,
        number: staveNumber,
        musicXml: {
          beginningBarStyle: this.beginningBarStyle,
          endBarStyle: this.endBarStyle,
        },
        measureEntries: this.measureEntries.filter((entry) => {
          if (entry instanceof musicxml.Note) {
            return entry.getStaveNumber() === staveNumber;
          }
          return true;
        }),
      });
    }

    return staves;
  }

  /** Returns the minimum justify width. */
  @util.memoize()
  private getMinJustifyWidth(address: Address<'measurefragment'>): number {
    return util.max(
      this.getStaves().map((stave) => stave.getMinJustifyWidth(address.stave({ staveNumber: stave.getNumber() })))
    );
  }

  /** Returns the right padding of the measure fragment. */
  private getRightPadding(): number {
    let padding = 0;

    if (this.measureEntries.length === 1 && this.measureEntries[0] instanceof StaveSignature) {
      padding += STAVE_SIGNATURE_ONLY_MEASURE_FRAGMENT_PADDING;
    }

    return padding;
  }

  /** Returns the width needed to stretch to fit the target width of the System. */
  private getSystemFitWidth(opts: {
    address: Address<'measurefragment'>;
    targetSystemWidth: number;
    minRequiredSystemWidth: number;
    previousMeasureFragment: MeasureFragment | null;
  }): number {
    const minRequiredWidth = this.getMinRequiredWidth({
      address: opts.address,
      previousMeasureFragment: opts.previousMeasureFragment,
    });

    const widthDeficit = opts.targetSystemWidth - opts.minRequiredSystemWidth;
    const widthFraction = minRequiredWidth / opts.minRequiredSystemWidth;
    const widthDelta = widthDeficit * widthFraction;

    return minRequiredWidth + widthDelta;
  }

  /** Returns what modifiers to render. */
  private getStaveModifiers(opts: {
    address: Address<'measurefragment'>;
    previousMeasureFragment: MeasureFragment | null;
  }): StaveModifier[] {
    if (opts.address.getSystemMeasureIndex() === 0 && this.index === 0) {
      return ['clef', 'keySignature', 'timeSignature'];
    }

    const staveModifiersChanges = new Set<StaveModifier>();

    for (let staveIndex = 0; staveIndex < this.staveCount; staveIndex++) {
      const currentStave = this.getStaves()[staveIndex];
      const previousStave = opts.previousMeasureFragment?.getStaves()[staveIndex] ?? null;

      for (const staveModifier of currentStave.getModifierChanges({ previousStave })) {
        staveModifiersChanges.add(staveModifier);
      }
    }

    return Array.from(staveModifiersChanges);
  }

  /** Returns the modifiers width. */
  private getStaveModifiersWidth(staveModifiers: StaveModifier[]): number {
    return util.max(this.getStaves().map((stave) => stave.getModifiersWidth(staveModifiers)));
  }
}
