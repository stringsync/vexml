import { Config } from './config';
import { Stave, StaveModifier, StaveRendering } from './stave';
import * as musicxml from '@/musicxml';
import * as util from '@/util';
import * as vexflow from 'vexflow';
import { ChorusRendering } from './chorus';
import { VoiceRendering } from './voice';
import { NoteRendering } from './note';
import { ChordRendering } from './chord';
import { MeasureEntry, StaveSignature } from './stavesignature';

const STAVE_SIGNATURE_ONLY_MEASURE_FRAGMENT_PADDING = 8;

/** The result of rendering a measure fragment. */
export type MeasureFragmentRendering = {
  type: 'measurefragment';
  vexflow: {
    beams: vexflow.Beam[];
  };
  staves: StaveRendering[];
  width: number;
};

type StemmableVoiceEntryRendering = NoteRendering | ChordRendering;

/**
 * Represents a fragment of a measure.
 *
 * A measure fragment is necessary when stave modifiers change. It is not a formal musical concept, and it is moreso an
 * outcome of vexflow's Stave implementation.
 */
export class MeasureFragment {
  private config: Config;
  private measureIndex: number;
  private measureEntries: MeasureEntry[];
  private systemId: symbol;
  private staves: Stave[];
  private staveLayouts: musicxml.StaveLayout[];

  private constructor(opts: {
    config: Config;
    measureIndex: number;
    measureEntries: MeasureEntry[];
    systemId: symbol;
    staves: Stave[];
    staveLayouts: musicxml.StaveLayout[];
  }) {
    this.config = opts.config;
    this.measureIndex = opts.measureIndex;
    this.measureEntries = opts.measureEntries;
    this.systemId = opts.systemId;
    this.staves = opts.staves;
    this.staveLayouts = opts.staveLayouts;
  }

  /** Creates a MeasureFragment. */
  static create(opts: {
    config: Config;
    measureIndex: number;
    measureFragmentIndex: number;
    systemId: symbol;
    leadingStaveSignature: StaveSignature | null;
    beginningBarStyle: musicxml.BarStyle;
    measureEntries: MeasureEntry[];
    endBarStyle: musicxml.BarStyle;
    staveCount: number;
    staveLayouts: musicxml.StaveLayout[];
    previousMeasureFragment: MeasureFragment | null;
  }): MeasureFragment {
    const config = opts.config;
    const measureIndex = opts.measureIndex;
    const measureFragmentIndex = opts.measureFragmentIndex;
    const systemId = opts.systemId;
    const leadingStaveSignature = opts.leadingStaveSignature;
    const measureEntries = opts.measureEntries;
    const staveCount = opts.staveCount;
    const staveLayouts = opts.staveLayouts;
    const beginningBarStyle = opts.beginningBarStyle;
    const endBarStyle = opts.endBarStyle;

    const staves = new Array<Stave>(staveCount);
    for (let staveNumber = 1; staveNumber <= staveCount; staveNumber++) {
      const staveIndex = staveNumber - 1;

      const previousStave = opts.previousMeasureFragment?.staves[staveIndex] ?? null;

      staves[staveIndex] = new Stave({
        config,
        staveSignature: leadingStaveSignature,
        previousStave,
        staveNumber,
        beginningBarStyle,
        endBarStyle,
        measureEntries: measureEntries.filter((entry) => {
          if (entry instanceof musicxml.Note) {
            return entry.getStaveNumber() === staveNumber;
          }
          return true;
        }),
      });
    }

    return new MeasureFragment({
      config,
      measureIndex,
      measureEntries,
      systemId,
      staves,
      staveLayouts,
    });
  }

  /** Returns the minimum required width for the measure fragment. */
  getMinRequiredWidth(previousMeasureFragment: MeasureFragment | null): number {
    const staveModifiersChanges = this.getChangedStaveModifiers(previousMeasureFragment);
    const staveModifiersWidth = this.getStaveModifiersWidth(staveModifiersChanges);
    return this.getMinJustifyWidth() + staveModifiersWidth + this.getRightPadding();
  }

  /** Returns the top padding for the measure fragment. */
  getTopPadding(): number {
    return util.max(this.staves.map((stave) => stave.getTopPadding()));
  }

  getMultiRestCount(): number {
    // TODO: One stave could be a multi measure rest, while another one could have voices.
    return util.max(this.staves.map((stave) => stave.getMultiRestCount()));
  }

  /** Clones the MeasureFragment and updates the systemId. */
  clone(systemId: symbol): MeasureFragment {
    return new MeasureFragment({
      config: this.config,
      measureIndex: this.measureIndex,
      measureEntries: this.measureEntries,
      systemId,
      staves: this.staves,
      staveLayouts: this.staveLayouts,
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
    nextMeasureFragment: MeasureFragment | null;
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

    const staveModifiers = this.getChangedStaveModifiers(opts.previousMeasureFragment);

    // Render staves.
    util.forEachTriple(this.staves, ([previousStave, currentStave, nextStave], index) => {
      if (index === 0) {
        previousStave = util.last(opts.previousMeasureFragment?.staves ?? []);
      }
      if (index === this.staves.length - 1) {
        nextStave = util.first(opts.nextMeasureFragment?.staves ?? []);
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

    const vfBeams = staveRenderings
      .map((stave) => stave.entry)
      .filter((entry): entry is ChorusRendering => entry.type === 'chorus')
      .flatMap((chorus) => chorus.voices)
      .flatMap((voice) => this.extractVfBeams(voice));

    return {
      type: 'measurefragment',
      vexflow: { beams: vfBeams },
      staves: staveRenderings,
      width,
    };
  }

  /** Returns the minimum justify width. */
  @util.memoize()
  private getMinJustifyWidth(): number {
    return util.max(this.staves.map((stave) => stave.getMinJustifyWidth()));
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
      return ['clef', 'keySignature', 'timeSignature'];
    }

    if (this.systemId !== previousMeasureFragment.systemId) {
      return ['clef', 'keySignature', 'timeSignature'];
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

  private extractVfBeams(voice: VoiceRendering): vexflow.Beam[] {
    const vfBeams = new Array<vexflow.Beam>();

    const stemmables = voice.entries.filter(
      (entry): entry is StemmableVoiceEntryRendering => entry.type === 'note' || entry.type === 'chord'
    );

    let vfStemmables = new Array<vexflow.StemmableNote>();
    for (let index = 0; index < stemmables.length; index++) {
      const stemmable = stemmables[index];
      const isLast = index === stemmables.length - 1;

      const note = this.getBeamDeterminingNote(stemmable);
      switch (note.beamValue) {
        case 'begin':
        case 'continue':
        case 'backward hook':
        case 'forward hook':
          vfStemmables.push(note.vexflow.staveNote);
          break;
        case 'end':
          vfStemmables.push(note.vexflow.staveNote);
          vfBeams.push(new vexflow.Beam(vfStemmables));
          vfStemmables = [];
          break;
      }

      if (isLast && vfStemmables.length > 0) {
        vfBeams.push(new vexflow.Beam(vfStemmables));
      }
    }

    return vfBeams;
  }

  /** Returns the note that determine beaming behavior. */
  private getBeamDeterminingNote(stemmable: StemmableVoiceEntryRendering): NoteRendering {
    if (stemmable.type === 'note') {
      return stemmable;
    }

    // Chords are rendering using a single vexflow.StaveNote, so it's ok to just use the first one in a chord.
    const vfStemDirection = util.first(stemmable.notes.map((note) => note.vexflow.staveNote.getStemDirection()));

    // In theory, all of the NoteRenderings should have the same BeamValue. But just in case that invariant is broken,
    // we look at the stem direction to determine which note should be the one to determine the beamining.
    if (vfStemDirection === vexflow.Stem.DOWN) {
      return util.last(stemmable.notes)!;
    } else {
      return util.first(stemmable.notes)!;
    }
  }
}
