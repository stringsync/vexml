import { ChorusEntry } from './chorus';
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
  private attributes: musicxml.Attributes | null;
  private beginningBarStyle: musicxml.BarStyle;
  private endBarStyle: musicxml.BarStyle;
  private staves: Stave[];

  private constructor(opts: {
    config: Config;
    systemId: symbol;
    attributes: musicxml.Attributes | null;
    beginningBarStyle: musicxml.BarStyle;
    endBarStyle: musicxml.BarStyle;
    staves: Stave[];
  }) {
    this.config = opts.config;
    this.systemId = opts.systemId;
    this.attributes = opts.attributes;
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
      voiceData: ChorusEntry[];
      beginningBarStyle: musicxml.BarStyle;
      endBarStyle: musicxml.BarStyle;
    };
    staveCount: number;
  }): MeasureFragment {
    const config = opts.config;
    const systemId = opts.systemId;
    const attributes = opts.musicXml.attributes;
    const voiceData = opts.musicXml.voiceData;
    const staveCount = opts.staveCount;
    const beginningBarStyle = opts.musicXml.beginningBarStyle;
    const endBarStyle = opts.musicXml.endBarStyle;

    const staves = new Array<Stave>(staveCount);
    let previousStave: Stave | null = null;
    for (let staffNumber = 1; staffNumber <= staveCount; staffNumber++) {
      const staffIndex = staffNumber - 1;

      const clefType =
        attributes
          ?.getClefs()
          .find((clef) => clef.getStaffNumber() === staffNumber)
          ?.getClefType() ?? 'treble';

      const timeSignature =
        attributes
          ?.getTimes()
          .find((time) => time.getStaffNumber() === staffNumber)
          ?.getTimeSignatures()[0] ?? new musicxml.TimeSignature(4, 4);

      const keySignature =
        attributes
          ?.getKeys()
          .find((key) => key.getStaffNumber() === staffNumber)
          ?.getKeySignature() ?? 'C';

      const multiRestCount =
        attributes
          ?.getMeasureStyles()
          .find((measureStyle) => measureStyle.getStaffNumber() === staffNumber)
          ?.getMultipleRestCount() ?? 0;

      const quarterNoteDivisions = attributes?.getQuarterNoteDivisions() ?? 2;

      staves[staffIndex] = Stave.create({
        config,
        clefType,
        timeSignature,
        keySignature,
        multiRestCount,
        quarterNoteDivisions,
        staffNumber,
        beginningBarStyle,
        endBarStyle,
        chorusEntries: voiceData.filter((entry) => {
          if (entry instanceof musicxml.Note) {
            return entry.getStaffNumber() === staffNumber;
          }
          return true;
        }),
        previousStave,
      });

      previousStave = staves[staffIndex];
    }

    return new MeasureFragment({
      config,
      systemId,
      attributes,
      beginningBarStyle,
      endBarStyle,
      staves: [],
    });
  }

  /** Returns the attributes that the MeasureFrament is using. */
  getAttributes(): musicxml.Attributes | null {
    return this.attributes;
  }

  /** Returns the minimum required width for the Measure. */
  getMinRequiredWidth(previousMeasureFragment: MeasureFragment | null): number {
    const staveModifiersChanges = this.getChangedStaveModifiers(previousMeasureFragment);
    const staveModifiersWidth = this.getStaveModifiersWidth(staveModifiersChanges);
    return this.getMinJustifyWidth() + staveModifiersWidth;
  }

  /** Returns the width needed to stretch to fit the target width of the System. */
  getSystemFitWidth(opts: {
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

  /** Clones the MeasureFragment and updates the systemId. */
  clone(systemId: symbol): MeasureFragment {
    return new MeasureFragment({
      config: this.config,
      systemId: systemId,
      attributes: this.attributes,
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
    staffLayouts: musicxml.StaffLayout[];
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

      const staffDistance =
        opts.staffLayouts.find((staffLayout) => staffLayout.staffNumber === staveRendering.staffNumber)
          ?.staffDistance ?? this.config.defaultStaffDistance;

      y += staffDistance;
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
