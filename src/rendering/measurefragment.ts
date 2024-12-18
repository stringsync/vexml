import * as debug from '@/debug';
import * as musicxml from '@/musicxml';
import * as util from '@/util';
import * as vexflow from 'vexflow';
import { Config } from '@/config';
import { MeasureEntry, StaveSignature } from './stavesignature';
import { PartScoped } from './types';
import { Address } from './address';
import { Part, PartRendering } from './part';
import { Spanners } from './spanners';
import { StaveModifier } from './stave';
import { PartName } from './partname';
import { MultiRest } from './multirest';
import { Chorus, ChorusRendering } from './chorus';
import { Barline } from './barline';

/** The result of rendering a measure fragment. */
export type MeasureFragmentRendering = {
  type: 'measurefragment';
  address: Address<'measurefragment'>;
  parts: PartRendering[];
  width: number;
  vexflow: { staveConnectors: vexflow.StaveConnector[] };
};

/** The width of a measure fragment. */
export type MeasureFragmentWidth = {
  measureIndex: number;
  measureFragmentIndex: number;
  value: number;
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
  private log: debug.Logger;
  private index: number;
  private partIds: string[];
  private partNames: PartScoped<PartName>[];
  private startBarlines: PartScoped<Barline>[];
  private endBarlines: PartScoped<Barline>[];
  private musicXML: {
    staveLayouts: musicxml.StaveLayout[];
  };
  private measureEntries: PartScoped<MeasureEntry>[];
  private staveSignatures: PartScoped<StaveSignature>[];

  constructor(opts: {
    config: Config;
    log: debug.Logger;
    index: number;
    partIds: string[];
    partNames: PartScoped<PartName>[];
    startBarlines: PartScoped<Barline>[];
    endBarlines: PartScoped<Barline>[];
    musicXML: {
      staveLayouts: musicxml.StaveLayout[];
    };
    measureEntries: PartScoped<MeasureEntry>[];
    staveSignatures: PartScoped<StaveSignature>[];
  }) {
    this.config = opts.config;
    this.log = opts.log;
    this.index = opts.index;
    this.partIds = opts.partIds;
    this.partNames = opts.partNames;
    this.startBarlines = opts.startBarlines;
    this.endBarlines = opts.endBarlines;
    this.musicXML = opts.musicXML;
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
    const previousMeasureFragment = opts.previousMeasureFragment;

    return (
      this.getStaveModifiersWidth({ address, previousMeasureFragment }) +
      this.getMinVoiceJustifyWidth({ address }) +
      this.getNonVoiceWidth()
    );
  }

  /** Returns the top padding of the fragment. */
  getTopPadding(): number {
    return util.max(this.getParts().map((part) => part.getTopPadding()));
  }

  /** Returns the number of measures the multi rest is active for. 0 means there's no multi rest. */
  getMultiRestCount(): number {
    // TODO: One stave could be a multi measure rest, while another one could have voices. Handle the discrepancy using
    // whole measure rests.
    return util.max(this.getParts().map((part) => part.getMultiRestCount()));
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
    this.log.debug('rendering measure fragment', { measureFragmentIndex: this.index });

    const partRenderings = new Array<PartRendering>();

    const x = opts.x;
    let y = opts.y;

    const beginningStaveModifiers = this.getBeginningStaveModifiers({
      address: opts.address,
      previousMeasureFragment: opts.previousMeasureFragment,
    });
    const endStaveModifiers = this.getEndStaveModifiers();

    const vfFormatter = new vexflow.Formatter();
    const vfStaveConnectors = new Array<vexflow.StaveConnector>();

    const previousParts = opts.previousMeasureFragment?.getParts() ?? [];
    const currentParts = this.getParts();
    const nextParts = opts.nextMeasureFragment?.getParts() ?? [];

    for (let partIndex = 0; partIndex < currentParts.length; partIndex++) {
      const previousPart = previousParts[partIndex] ?? null;
      const currentPart = currentParts[partIndex];
      const nextPart = nextParts[partIndex] ?? null;

      const partId = currentPart.getId();

      const partRendering = currentPart.render({
        x,
        y,
        vexflow: { formatter: vfFormatter },
        address: opts.address.part({ partId: currentPart.getId() }),
        spanners: opts.spanners,
        nextPart,
        previousPart,
        beginningStaveModifiers,
        endStaveModifiers,
        width: opts.width.value,
      });
      partRenderings.push(partRendering);

      const startBarline =
        this.startBarlines.find((barline) => barline.partId === partId)?.value ??
        new Barline({ config: this.config, log: this.log, type: 'none', location: 'left' });
      const startBarlineRendering = startBarline.render();
      for (const stave of partRendering.staves) {
        stave.vexflow.stave.setBegBarType(startBarlineRendering.vexflow.barlineType);
      }

      const endBarline =
        this.endBarlines.find((barline) => barline.partId === partId)?.value ??
        new Barline({ config: this.config, log: this.log, type: 'none', location: 'right' });
      const endBarlineRendering = endBarline.render();
      for (const stave of partRendering.staves) {
        stave.vexflow.stave.setEndBarType(endBarlineRendering.vexflow.barlineType);
      }

      const isFirstSystemMeasure = opts.address.getSystemMeasureIndex() === 0;
      const isFirstMeasureFragment = this.index === 0;

      if (partRendering.staves.length > 1) {
        const topStave = util.first(partRendering.staves)!.vexflow.stave;
        const bottomStave = util.last(partRendering.staves)!.vexflow.stave;

        if (isFirstSystemMeasure && isFirstMeasureFragment) {
          vfStaveConnectors.push(new vexflow.StaveConnector(topStave, bottomStave).setType('brace'));
        }

        const startStaveConnectorType = startBarlineRendering.vexflow.staveConnectorType;
        if (startStaveConnectorType) {
          vfStaveConnectors.push(new vexflow.StaveConnector(topStave, bottomStave).setType(startStaveConnectorType));
        }

        const endStaveConnectorType = endBarlineRendering.vexflow.staveConnectorType;
        if (endStaveConnectorType) {
          vfStaveConnectors.push(new vexflow.StaveConnector(topStave, bottomStave).setType(endStaveConnectorType));
        }
      }

      y += partRendering.height + this.config.PART_DISTANCE;
    }

    if (this.index === 0 && partRenderings.length > 0) {
      const topPart = util.first(partRenderings)!;
      const bottomPart = util.last(partRenderings)!;

      const vfTopStave = util.first(topPart.staves)?.vexflow.stave;
      const vfBottomStave = util.last(bottomPart.staves)?.vexflow.stave;

      if (vfTopStave && vfBottomStave) {
        vfStaveConnectors.push(new vexflow.StaveConnector(vfTopStave, vfBottomStave).setType('singleLeft'));
      }
    }

    const vfStave = util.first(partRenderings)?.staves[0]?.vexflow.stave ?? null;
    const vfVoices = partRenderings
      .flatMap((partRendering) => partRendering.staves)
      .map((stave) => stave.entry)
      .filter((entry): entry is ChorusRendering => entry.type === 'chorus')
      .flatMap((chorusRendering) => [...chorusRendering.voices])
      .flatMap((voice) => [voice.vexflow.voice, ...voice.placeholders.map((voice) => voice.vexflow.voice)]);

    if (vfStave && vfVoices.some((vfVoice) => vfVoice.getTickables().length > 0)) {
      vfFormatter.formatToStave(vfVoices, vfStave);
    }

    return {
      type: 'measurefragment',
      address: opts.address,
      parts: partRenderings,
      width: opts.width.value,
      vexflow: { staveConnectors: vfStaveConnectors },
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

      const partName = this.partNames.find((partName) => partName.partId === partId)?.value ?? null;
      if (!partName) {
        throw new Error(`Could not find part name for part ${partId}`);
      }

      return new Part({
        config: this.config,
        log: this.log,
        id: partId,
        name: partName,
        musicXML: {
          staveLayouts: this.musicXML.staveLayouts,
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
    const beginningStaveModifiers = this.getBeginningStaveModifiers({
      address: opts.address,
      previousMeasureFragment: opts.previousMeasureFragment,
    });

    const endStaveModifiers = this.getEndStaveModifiers();

    return util.max(
      this.getParts()
        .flatMap((part) => part.getStaves())
        .map((stave) => {
          const staveNumber = stave.getNumber();
          const staveSignature = stave.getSignature();
          const nextStaveSignature = staveSignature.getNext();
          return {
            current: {
              clef: staveSignature.getClef(staveNumber),
              keySignature: staveSignature.getKeySignature(staveNumber),
              timeSignature: staveSignature.getTimeSignature(staveNumber),
            },
            next: {
              clef: nextStaveSignature?.getClef(staveNumber) ?? null,
            },
          };
        })
        .map(({ current, next }) => {
          let width = 0;

          if (beginningStaveModifiers.includes('clef')) {
            width += current.clef.getWidth();
          }
          if (beginningStaveModifiers.includes('keySignature')) {
            width += current.keySignature.getWidth();
          }
          if (beginningStaveModifiers.includes('timeSignature')) {
            width += current.timeSignature.getWidth();
          }

          if (endStaveModifiers.includes('clef')) {
            width += next.clef?.getWidth() ?? 0;
          }

          return width;
        })
    );
  }

  /** Returns what modifiers to render at the end of the stave. */
  private getEndStaveModifiers(): StaveModifier[] {
    const result = new Set<StaveModifier>();

    for (const partId of this.partIds) {
      const staveSignature = this.staveSignatures.find((staveSignature) => staveSignature.partId === partId)?.value;
      if (!staveSignature) {
        continue;
      }

      const nextStaveSignature = staveSignature.getNext();
      if (!nextStaveSignature) {
        continue;
      }

      const isAtMeasureBoundary = staveSignature.isAtMeasureBoundary();
      const didClefChange = nextStaveSignature.getChangedStaveModifiers().includes('clef');
      if (isAtMeasureBoundary && didClefChange) {
        result.add('clef');
      }
    }

    return Array.from(result);
  }

  /** Returns what modifiers to render at the beginning of the stave. */
  private getBeginningStaveModifiers(opts: {
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

    // Avoid rendering stave modifiers that changed in the previous one.
    const previousEndStaveModifiers = opts.previousMeasureFragment?.getEndStaveModifiers() ?? [];
    for (const staveModifier of previousEndStaveModifiers) {
      staveModifiersChanges.delete(staveModifier);
    }

    return Array.from(staveModifiersChanges);
  }

  private getMinVoiceJustifyWidth(opts: { address: Address<'measurefragment'> }): number {
    const spanners = new Spanners({ config: this.config, log: this.log });
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

    return (
      vfFormatter.preCalculateMinTotalWidth(vfVoices) +
      spanners.getExtraMeasureFragmentWidth(opts.address) +
      this.config.VOICE_PADDING
    );
  }

  private getNonVoiceWidth(): number {
    const hasMultiRest = this.getParts()
      .flatMap((part) => part.getStaves())
      .some((stave) => stave.getEntry() instanceof MultiRest);

    // This is much easier being configurable. Otherwise, we would have to create a dummy context to render it, then
    // get the width via MultiMeasureRest.getBoundingBox. There is no "preCalculateMinTotalWidth" for non-voices at
    // the moment.
    return hasMultiRest ? this.config.MULTI_MEASURE_REST_WIDTH : 0;
  }
}
