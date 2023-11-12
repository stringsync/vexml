import { Config } from './config';
import { Stave, StaveModifier, StaveRendering } from './stave';
import * as musicxml from '@/musicxml';
import * as util from '@/util';
import { MeasureEntry, StaveSignature } from './stavesignature';

const STAVE_SIGNATURE_ONLY_MEASURE_FRAGMENT_PADDING = 8;

/** The result of rendering a measure fragment. */
export type MeasureFragmentRendering = {
  type: 'measurefragment';
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
  private leadingStaveSignature: StaveSignature | null;
  private measureEntries: MeasureEntry[];
  private staveLayouts: musicxml.StaveLayout[];
  private staveCount: number;
  private previousMeasureFragment: MeasureFragment | null;
  private beginningBarStyle: musicxml.BarStyle;
  private endBarStyle: musicxml.BarStyle;

  constructor(opts: {
    config: Config;
    index: number;
    leadingStaveSignature: StaveSignature | null;
    measureEntries: MeasureEntry[];
    staveLayouts: musicxml.StaveLayout[];
    staveCount: number;
    previousMeasureFragment: MeasureFragment | null;
    beginningBarStyle: musicxml.BarStyle;
    endBarStyle: musicxml.BarStyle;
  }) {
    this.config = opts.config;
    this.index = opts.index;
    this.leadingStaveSignature = opts.leadingStaveSignature;
    this.measureEntries = opts.measureEntries;
    this.staveLayouts = opts.staveLayouts;
    this.staveCount = opts.staveCount;
    this.previousMeasureFragment = opts.previousMeasureFragment;
    this.beginningBarStyle = opts.beginningBarStyle;
    this.endBarStyle = opts.endBarStyle;
  }

  /** Returns the minimum required width for the measure fragment. */
  getMinRequiredWidth(systemMeasureIndex: number): number {
    const staveModifiers = this.getStaveModifiers(systemMeasureIndex);
    const staveModifiersWidth = this.getStaveModifiersWidth(Array.from(staveModifiers));

    return this.getMinJustifyWidth() + staveModifiersWidth + this.getRightPadding();
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
    isLastSystem: boolean;
    targetSystemWidth: number;
    minRequiredSystemWidth: number;
    systemMeasureIndex: number;
    previousMeasureFragment: MeasureFragment | null;
    nextMeasureFragment: MeasureFragment | null;
  }): MeasureFragmentRendering {
    const staveRenderings = new Array<StaveRendering>();

    const width = opts.isLastSystem
      ? this.getMinRequiredWidth(opts.systemMeasureIndex)
      : this.getSystemFitWidth({
          systemMeasureIndex: opts.systemMeasureIndex,
          minRequiredSystemWidth: opts.minRequiredSystemWidth,
          targetSystemWidth: opts.targetSystemWidth,
        });

    let y = opts.y;

    const staveModifiers = this.getStaveModifiers(opts.systemMeasureIndex);

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
        staveNumber,
        previousStave: this.previousMeasureFragment?.getStave(staveIndex) ?? null,
        beginningBarStyle: this.beginningBarStyle,
        endBarStyle: this.endBarStyle,
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
  private getMinJustifyWidth(): number {
    return util.max(this.getStaves().map((stave) => stave.getMinJustifyWidth()));
  }

  private getStave(staveIndex: number): Stave | null {
    const staves = this.getStaves();
    return staves[staveIndex] ?? null;
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
    systemMeasureIndex: number;
    targetSystemWidth: number;
    minRequiredSystemWidth: number;
  }): number {
    const minRequiredWidth = this.getMinRequiredWidth(opts.systemMeasureIndex);

    const widthDeficit = opts.targetSystemWidth - opts.minRequiredSystemWidth;
    const widthFraction = minRequiredWidth / opts.minRequiredSystemWidth;
    const widthDelta = widthDeficit * widthFraction;

    return minRequiredWidth + widthDelta;
  }

  /** Returns what modifiers to render. */
  private getStaveModifiers(systemMeasureIndex: number): StaveModifier[] {
    if (systemMeasureIndex === 0 && this.index === 0) {
      return ['clef', 'keySignature', 'timeSignature'];
    }

    const staveModifiersChanges = new Set<StaveModifier>();

    for (const stave of this.getStaves()) {
      for (const staveModifier of stave.getModifierChanges()) {
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
