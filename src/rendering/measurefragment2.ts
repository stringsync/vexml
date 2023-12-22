import * as musicxml from '@/musicxml';
import * as util from '@/util';
import * as vexflow from 'vexflow';
import { Config } from './config';
import { MeasureEntry, StaveSignature } from './stavesignature';
import { MeasureFragmentWidth, PartScoped } from './types';
import { Address } from './address';
import { Part, PartRendering } from './part2';
import { Chorus } from './chorus';
import { Spanners } from './spanners';
import { StaveModifier } from './stave';

const STAVE_SIGNATURE_ONLY_MEASURE_FRAGMENT_PADDING = 8;
const STAVE_CONNECTOR_BRACE_WIDTH = 16;

/** The result of rendering a measure fragment. */
export type MeasureFragmentRendering = {
  type: 'measurefragment';
  address: Address<'measurefragment'>;
  parts: PartRendering[];
  width: number;
};

/**
 * Represents a fragment of a measure.
 *
 * A measure fragment is necessary when stave modifiers change. It is not a formal musical concept, and it is moreso an
 * outcome of vexflow's Stave implementation.
 *
 * Measure fragments format all measure parts against the first stave.
 */
export class MeasureFragment {
  private config: Config;
  private index: number;
  private partIds: string[];
  private musicXml: {
    staveLayouts: musicxml.StaveLayout[];
    beginningBarStyles: PartScoped<musicxml.BarStyle>[];
    endBarStyles: PartScoped<musicxml.BarStyle>[];
  };
  private measureEntries: PartScoped<MeasureEntry>[];
  private staveSignatures: PartScoped<StaveSignature>[];

  constructor(opts: {
    config: Config;
    index: number;
    partIds: string[];
    musicXml: {
      staveLayouts: musicxml.StaveLayout[];
      beginningBarStyles: PartScoped<musicxml.BarStyle>[];
      endBarStyles: PartScoped<musicxml.BarStyle>[];
    };
    measureEntries: PartScoped<MeasureEntry>[];
    staveSignatures: PartScoped<StaveSignature>[];
  }) {
    this.config = opts.config;
    this.index = opts.index;
    this.partIds = opts.partIds;
    this.musicXml = opts.musicXml;
    this.measureEntries = opts.measureEntries;
    this.staveSignatures = opts.staveSignatures;
  }

  /** Returns the index of the measure fragment, which is relative to its parent measure. */
  getIndex(): number {
    return this.index;
  }

  /** Returns the minimum required width for the measure fragment. */
  getMinRequiredWidth(opts: {
    address: Address<'measurefragment'>;
    previousMeasureFragment: MeasureFragment | null;
  }): number {
    const address = opts.address;

    return (
      this.getStaveModifiersWidth({ address, previousMeasureFragment: opts.previousMeasureFragment }) +
      this.getMinVoiceJustifyWidth({ address }) +
      this.getLeftPadding({ address }) +
      this.getRightPadding()
    );
  }

  /** Returns the top padding of the fragment. */
  getTopPadding(): number {
    return util.max(this.getParts().map((part) => part.getTopPadding()));
  }

  /** Renders the measure fragment. */
  render(opts: {
    x: number;
    y: number;
    address: Address<'measurefragment'>;
    spanners: Spanners;
    width: MeasureFragmentWidth;
    previousMeasureFragment: MeasureFragment | null;
    nextMeasureFragment: MeasureFragment | null;
  }): MeasureFragmentRendering {
    return {
      type: 'measurefragment',
      address: opts.address,
      parts: [],
      width: opts.width.value,
    };
  }

  @util.memoize()
  private getParts(): Part[] {
    return this.partIds.map((partId) => {
      const measureEntries = this.measureEntries
        .filter((measureEntry) => measureEntry.partId === partId)
        .map((measureEntry) => measureEntry.value);

      const staveSignature = this.staveSignatures.find((staveSignature) => staveSignature.partId === partId)?.value;
      if (!staveSignature) {
        throw new Error(`Could not find stave signature for part ${partId}`);
      }

      const beginningBarStyle = this.musicXml.beginningBarStyles.find((barStyle) => barStyle.partId === partId)?.value;
      if (!beginningBarStyle) {
        throw new Error(`Could not find beginning bar style for part ${partId}`);
      }

      const endBarStyle = this.musicXml.endBarStyles.find((barStyle) => barStyle.partId === partId)?.value;
      if (!endBarStyle) {
        throw new Error(`Could not find end bar style for part ${partId}`);
      }

      return new Part({
        config: this.config,
        id: partId,
        musicXml: {
          staveLayouts: this.musicXml.staveLayouts,
          beginningBarStyle,
          endBarStyle,
        },
        measureEntries,
        staveSignature,
      });
    });
  }

  private getStaveModifiersWidth(opts: {
    address: Address<'measurefragment'>;
    previousMeasureFragment: MeasureFragment | null;
  }): number {
    const staveModifiers = this.getStaveModifiers({
      address: opts.address,
      previousMeasureFragment: opts.previousMeasureFragment,
    });

    return util.max(
      this.getParts()
        .flatMap((part) => part.getStaves())
        .map((stave) => stave.getModifiersWidth(staveModifiers))
    );
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

    for (const partId of this.partIds) {
      const staveSignature = this.staveSignatures.find((staveSignature) => staveSignature.partId === partId)?.value;
      if (!staveSignature) {
        continue;
      }

      const staveCount = staveSignature.getStaveCount();

      for (let staveIndex = 0; staveIndex < staveCount; staveIndex++) {
        const currentStave =
          this.getParts()
            ?.find((part) => part.getId() === partId)
            ?.getStaves()[staveIndex] ?? null;

        const previousStave =
          opts.previousMeasureFragment
            ?.getParts()
            .find((part) => part.getId() === partId)
            ?.getStaves()[staveIndex] ?? null;

        const staveModifiers = currentStave?.getModifierChanges({ previousStave }) ?? [];

        for (const staveModifier of staveModifiers) {
          staveModifiersChanges.add(staveModifier);
        }
      }
    }

    return Array.from(staveModifiersChanges);
  }

  private getMinVoiceJustifyWidth(opts: { address: Address<'measurefragment'> }): number {
    const spanners = new Spanners();
    const vfFormatter = new vexflow.Formatter();
    const vfVoices = new Array<vexflow.Voice>();

    for (const part of this.getParts()) {
      const partAddress = opts.address.part({ partId: part.getId() });

      for (const stave of part.getStaves()) {
        const entry = stave.getEntry();

        let vfPartStaveVoices = new Array<vexflow.Voice>();

        if (entry instanceof Chorus) {
          const address = partAddress.stave({ staveNumber: stave.getNumber() }).chorus();
          const chorusRendering = entry.render({ address, spanners });
          vfPartStaveVoices = chorusRendering.voices.map((voice) => voice.vexflow.voice);
        }

        if (vfPartStaveVoices.length > 0) {
          vfFormatter.joinVoices(vfPartStaveVoices);
        }

        vfVoices.push(...vfPartStaveVoices);
      }
    }

    if (vfVoices.length === 0) {
      return 0;
    }

    return vfFormatter.preCalculateMinTotalWidth(vfVoices) + spanners.getPadding() + this.config.VOICE_PADDING;
  }

  private getLeftPadding(opts: { address: Address<'measurefragment'> }): number {
    let padding = 0;

    const hasStaveConnectorBrace =
      opts.address.getSystemMeasureIndex() === 0 &&
      this.index === 0 &&
      this.staveSignatures.some((staveSignature) => staveSignature.value.getStaveCount() > 1);
    if (hasStaveConnectorBrace) {
      padding += STAVE_CONNECTOR_BRACE_WIDTH;
    }

    return padding;
  }

  private getRightPadding(): number {
    let padding = 0;

    if (this.measureEntries.length === 1 && this.measureEntries[0] instanceof StaveSignature) {
      padding += STAVE_SIGNATURE_ONLY_MEASURE_FRAGMENT_PADDING;
    }

    return padding;
  }
}
