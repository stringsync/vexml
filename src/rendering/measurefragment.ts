import { Config } from './config';
import { Stave, StaveModifier, StaveRendering } from './stave';
import * as musicxml from '@/musicxml';
import * as util from '@/util';

/** The result of rendering a measure fragment. */
export type MeasureFragmentRendering = {
  type: 'measurefragment';
  staves: StaveRendering[];
  width: number;
};

/** Represents a fragment of a measure. */
export class MeasureFragment {
  private config: Config;
  private systemId: symbol;
  private beginningBarStyle: musicxml.BarStyle;
  private endBarStyle: musicxml.BarStyle;
  private staves: Stave[];

  private constructor(opts: {
    config: Config;
    systemId: symbol;
    beginningBarStyle: musicxml.BarStyle;
    endBarStyle: musicxml.BarStyle;
    staves: Stave[];
  }) {
    this.config = opts.config;
    this.systemId = opts.systemId;
    this.beginningBarStyle = opts.beginningBarStyle;
    this.endBarStyle = opts.endBarStyle;
    this.staves = opts.staves;
  }

  /** Creates a MeasureFragment. */
  static create(opts: {
    config: Config;
    systemId: symbol;
    musicXml: {
      attributes: musicxml.Attributes | null;
      measureEntries: musicxml.MeasureEntry[];
      beginningBarStyle: musicxml.BarStyle;
      endBarStyle: musicxml.BarStyle;
    };
    staveCount: number;
    previousFragment: MeasureFragment | null;
  }): MeasureFragment {
    const config = opts.config;
    const systemId = opts.systemId;
    const attributes = opts.musicXml.attributes;
    const measureEntries = opts.musicXml.measureEntries;
    const staveCount = opts.staveCount;
    const beginningBarStyle = opts.musicXml.beginningBarStyle;
    const endBarStyle = opts.musicXml.endBarStyle;
    const previousFragment = opts.previousFragment;

    const staves = new Array<Stave>(staveCount);
    for (let staveNumber = 1; staveNumber <= staveCount; staveNumber++) {
      const staveIndex = staveNumber - 1;
      const previousStave = previousFragment?.staves[staveIndex] ?? null;

      // Assume that the measureEntries after the attributes do not need a new stave. See how MeasureFragments are
      // constructured in Measure.

      const clefType =
        attributes
          ?.getClefs()
          .find((clef) => clef.getStaveNumber() === staveNumber)
          ?.getClefType() ?? null;

      const timeSignature =
        attributes
          ?.getTimes()
          .find((time) => time.getStaveNumber() === staveNumber)
          ?.getTimeSignatures()[0] ?? null;

      const keySignature =
        attributes
          ?.getKeys()
          .find((key) => key.getStaveNumber() === staveNumber)
          ?.getKeySignature() ?? null;

      const multiRestCount =
        attributes
          ?.getMeasureStyles()
          .find((measureStyle) => measureStyle.getStaveNumber() === staveNumber)
          ?.getMultipleRestCount() ?? 0;

      const quarterNoteDivisions = attributes?.getQuarterNoteDivisions() ?? 2;

      staves[staveIndex] = Stave.create({
        config,
        clefType,
        timeSignature,
        keySignature,
        multiRestCount,
        quarterNoteDivisions,
        staveNumber,
        beginningBarStyle,
        endBarStyle,
        measureEntries: measureEntries.filter((entry) => {
          if (entry instanceof musicxml.Note) {
            return entry.getStaveNumber() === staveNumber;
          }
          return true;
        }),
        previousStave,
      });
    }

    return new MeasureFragment({
      config,
      systemId,
      beginningBarStyle,
      endBarStyle,
      staves,
    });
  }

  /** Returns the minimum required width for the Measure. */
  getMinRequiredWidth(previousMeasureFragment: MeasureFragment | null): number {
    const staveModifiersChanges = this.getChangedStaveModifiers(previousMeasureFragment);
    const staveModifiersWidth = this.getStaveModifiersWidth(staveModifiersChanges);
    return this.getMinJustifyWidth() + staveModifiersWidth;
  }

  getMultiRestCount(): number {
    // TODO: One stave could be a multi measure rest, while another one could have voices.
    return util.max(this.staves.map((stave) => stave.getMultiRestCount()));
  }

  /** Clones the MeasureFragment and updates the systemId. */
  clone(systemId: symbol): MeasureFragment {
    return new MeasureFragment({
      config: this.config,
      systemId: systemId,
      beginningBarStyle: this.beginningBarStyle,
      endBarStyle: this.endBarStyle,
      staves: this.staves.map((stave) => stave.clone()),
    });
  }

  /** Renders the MeasureFragment. */
  render(opts: {
    x: number;
    y: number;
    isLastSystem: boolean;
    targetSystemWidth: number;
    minRequiredSystemWidth: number;
    previousMeasureFragment: MeasureFragment | null;
    staveLayouts: musicxml.StaveLayout[];
  }): MeasureFragmentRendering {
    const staveRenderings = new Array<StaveRendering>();

    const width = opts.isLastSystem
      ? this.getMinRequiredWidth(opts.previousMeasureFragment)
      : this.getSystemFitWidth({
          previous: opts.previousMeasureFragment,
          minRequiredSystemWidth: opts.minRequiredSystemWidth,
          targetSystemWidth: opts.targetSystemWidth,
        });

    let y = opts.y;

    for (const stave of this.staves) {
      const staveModifiers = this.getChangedStaveModifiers(opts.previousMeasureFragment);

      const staveRendering = stave.render({
        x: opts.x,
        y,
        width,
        modifiers: staveModifiers,
      });
      staveRenderings.push(staveRendering);

      const staveDistance =
        opts.staveLayouts.find((staveLayout) => staveLayout.staveNumber === staveRendering.staveNumber)
          ?.staveDistance ?? this.config.defaultStaveDistance;

      y += staveDistance;
    }

    return {
      type: 'measurefragment',
      staves: staveRenderings,
      width,
    };
  }

  /** Returns the minimum justify width. */
  @util.memoize()
  private getMinJustifyWidth(): number {
    return util.max(this.staves.map((stave) => stave.getMinJustifyWidth()));
  }

  /** Returns the width needed to stretch to fit the target width of the System. */
  private getSystemFitWidth(opts: {
    previous: MeasureFragment | null;
    targetSystemWidth: number;
    minRequiredSystemWidth: number;
  }): number {
    const minRequiredWidth = this.getMinRequiredWidth(opts.previous);

    const widthDeficit = opts.targetSystemWidth - opts.minRequiredSystemWidth;
    const widthFraction = minRequiredWidth / opts.minRequiredSystemWidth;
    const widthDelta = widthDeficit * widthFraction;

    return minRequiredWidth + widthDelta;
  }

  /** Returns what modifiers changed _in any stave_. */
  private getChangedStaveModifiers(previousMeasureFragment: MeasureFragment | null): StaveModifier[] {
    if (!previousMeasureFragment) {
      return ['clefType', 'keySignature', 'timeSignature'];
    }

    if (this.systemId !== previousMeasureFragment.systemId) {
      return ['clefType', 'keySignature', 'timeSignature'];
    }

    const staveModifiersChanges = new Set<StaveModifier>();

    for (let index = 0; index < this.staves.length; index++) {
      const stave1 = this.staves[index];
      const stave2 = previousMeasureFragment.staves[index];
      for (const modifier of stave1.getModifierChanges(stave2)) {
        staveModifiersChanges.add(modifier);
      }
    }

    return Array.from(staveModifiersChanges);
  }

  /** Returns the modifiers width. */
  private getStaveModifiersWidth(staveModifiers: StaveModifier[]): number {
    return util.max(this.staves.map((stave) => stave.getModifiersWidth(staveModifiers)));
  }
}
