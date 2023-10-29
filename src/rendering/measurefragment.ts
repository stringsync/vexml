import { Config } from './config';
import { Stave, StaveModifier, StaveRendering } from './stave';
import * as musicxml from '@/musicxml';
import * as util from '@/util';
import * as vexflow from 'vexflow';
import * as conversions from './conversions';
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
    tuplets: vexflow.Tuplet[];
  };
  staves: StaveRendering[];
  width: number;
};

type StemmableRendering = NoteRendering | ChordRendering;

type TupletableRendering = NoteRendering | ChordRendering;

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

    const vfVoices = staveRenderings
      .map((stave) => stave.entry)
      .filter((entry): entry is ChorusRendering => entry.type === 'chorus')
      .flatMap((chorus) => chorus.voices);

    const vfBeams = vfVoices.flatMap((voice) => this.extractVfBeams(voice));

    const vfTuplets = vfVoices.flatMap((voice) => this.extractVfTuplets(voice));

    return {
      type: 'measurefragment',
      vexflow: {
        beams: vfBeams,
        tuplets: vfTuplets,
      },
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

  private extractVfBeams(voice: VoiceRendering): vexflow.Beam[] {
    const vfBeams = new Array<vexflow.Beam>();

    const stemmables = voice.entries.filter(
      (entry): entry is StemmableRendering => entry.type === 'note' || entry.type === 'chord'
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

  private extractVfTuplets(voice: VoiceRendering): vexflow.Tuplet[] {
    const vfTuplets = new Array<vexflow.Tuplet>();

    const tupletables = voice.entries.filter(
      (entry): entry is TupletableRendering => entry.type === 'note' || entry.type === 'chord'
    );

    let vfNotes = new Array<vexflow.Note>();
    let vfTupletLocation: vexflow.TupletLocation = vexflow.TupletLocation.BOTTOM;

    for (let index = 0; index < tupletables.length; index++) {
      const tupletable = tupletables[index];
      const isLast = index === tupletables.length - 1;

      let tuplet: musicxml.Tuplet | null;
      let vfNote: vexflow.Note | null;

      // TODO: Handle multiple (nested?) tuplets.
      switch (tupletable.type) {
        case 'note':
          tuplet = util.first(tupletable.tuplets);
          vfNote = tupletable.vexflow.staveNote;
          break;
        case 'chord':
          tuplet = util.first(tupletable.notes.flatMap((note) => note.tuplets));
          vfNote = util.first(tupletable.notes)?.vexflow.staveNote ?? null;
          break;
      }

      const tupletType = tuplet?.getType();
      const tupletPlacement = tuplet?.getPlacement() ?? 'below';

      if (!vfNote) {
        continue;
      } else if (tupletType === 'start') {
        vfNotes.push(vfNote);
        vfTupletLocation = conversions.fromTupletPlacementToTupletLocation(tupletPlacement);
      } else if (tupletType === 'stop') {
        vfNotes.push(vfNote);
        vfTuplets.push(new vexflow.Tuplet(vfNotes, { location: vfTupletLocation }));
        vfNotes = [];
        vfTupletLocation = vexflow.TupletLocation.BOTTOM;
      } else if (vfNotes.length > 0) {
        // Tuplets don't have an accounting mechanism of "continue" like beams. Therefore, we need to implicitly
        // continue if we've come across a "start" (denoted by the vfNotes length).
        vfNotes.push(vfNote);
      }

      if (isLast && vfNotes.length > 0) {
        vfTuplets.push(new vexflow.Tuplet(vfNotes));
      }
    }

    return vfTuplets;
  }

  /** Returns the note that determine beaming behavior. */
  private getBeamDeterminingNote(stemmable: StemmableRendering): NoteRendering {
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
