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
import { RestRendering } from './rest';

const STAVE_SIGNATURE_ONLY_MEASURE_FRAGMENT_PADDING = 8;

/** The result of rendering a measure fragment. */
export type MeasureFragmentRendering = {
  type: 'measurefragment';
  vexflow: {
    beams: vexflow.Beam[];
    tuplets: vexflow.Tuplet[];
    staveTies: vexflow.StaveTie[];
  };
  staves: StaveRendering[];
  width: number;
};

type StemmableRendering = NoteRendering | ChordRendering;

type TupletableRendering = NoteRendering | ChordRendering | RestRendering;

type TieableRendering = NoteRendering | ChordRendering | RestRendering;

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
    const vfStaveTies = vfVoices.flatMap((voice) => this.extractVfStaveTies(voice));

    return {
      type: 'measurefragment',
      vexflow: {
        beams: vfBeams,
        tuplets: vfTuplets,
        staveTies: vfStaveTies,
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
      (entry): entry is TupletableRendering => entry.type === 'note' || entry.type === 'chord' || entry.type === 'rest'
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
        case 'rest':
          tuplet = util.first(tupletable.tuplets);
          vfNote = tupletable.vexflow.staveNote;
          break;
      }

      const tupletType = tuplet?.getType();
      const tupletPlacement = tuplet?.getPlacement() ?? 'below';

      if (!vfNote) {
        continue;
      } else if (tupletType === 'start') {
        vfNotes.push(vfNote);
        vfTupletLocation = conversions.fromAboveBelowToTupletLocation(tupletPlacement);
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

  // TODO: This is broken because it only slurs notes within the same measure fragment. This will probably work most of
  // the time, but there are probably situations where notes can span measure fragments. Formalize a spanner handler,
  // probably some sort of state machine that can do these kinds of grouping calculations more gracefully.
  private extractVfStaveTies(voice: VoiceRendering): vexflow.StaveTie[] {
    const vfStaveTies = new Array<vexflow.StaveTie>();

    const tieables = voice.entries.filter(
      (entry): entry is TieableRendering => entry.type === 'note' || entry.type === 'chord' || entry.type === 'rest'
    );

    const vfSlurDataBySlurNumber: Record<number, { vfSlurDirection: number; vfNotes: Array<vexflow.Note> }> = {};

    for (let index = 0; index < tieables.length; index++) {
      // TODO: Perform reasonable default behavior when
      const tieable = tieables[index];

      const slurPlacement = this.getSlurPlacement(tieable);
      const vfSlurDirection = conversions.fromAboveBelowToVexflowSlurDirection(slurPlacement);

      let vfNote: vexflow.Note | null;
      let slurs: musicxml.Slur[];

      switch (tieable.type) {
        case 'note':
        case 'rest':
          vfNote = tieable.vexflow.staveNote;
          slurs = tieable.slurs;
          break;
        case 'chord':
          vfNote = util.first(tieable.notes)?.vexflow.staveNote ?? null;
          slurs = util.first(tieable.notes)?.slurs ?? [];
          break;
      }

      if (!vfNote) {
        continue;
      }

      for (const slur of slurs) {
        const slurNumber = slur.getNumber();
        switch (slur.getType()) {
          case 'start':
          case 'continue':
            vfSlurDataBySlurNumber[slurNumber] ??= { vfSlurDirection, vfNotes: [] };
            vfSlurDataBySlurNumber[slurNumber].vfNotes.push(vfNote);
            break;
          case 'stop':
            vfSlurDataBySlurNumber[slurNumber] ??= { vfSlurDirection, vfNotes: [] };
            vfSlurDataBySlurNumber[slurNumber].vfNotes.push(vfNote);

            const data = vfSlurDataBySlurNumber[slurNumber];
            const firstVfNote = util.first(data.vfNotes);
            const lastVfNote = util.last(data.vfNotes);
            // TODO: When vexflow supports different types of tie styles, read Slur.getLineType and translate to
            // vexflow accordingly.
            if (firstVfNote && lastVfNote) {
              vfStaveTies.push(
                new vexflow.StaveTie({
                  firstNote: firstVfNote,
                  lastNote: lastVfNote,
                  firstIndexes: [0],
                  lastIndexes: [0],
                }).setDirection(vfSlurDirection)
              );
            }

            delete vfSlurDataBySlurNumber[slurNumber];
            break;
        }
      }
    }

    return vfStaveTies;
  }

  /** Returns the note that determine beaming behavior. */
  private getBeamDeterminingNote(stemmable: StemmableRendering): NoteRendering {
    if (stemmable.type === 'note') {
      return stemmable;
    }

    // Chords are rendering using a single vexflow.StaveNote, so it's ok to just use the first one in a chord.
    const stem = util.first(
      stemmable.notes.map((note) => this.getVfStaveNote(note)).map((vfStaveNote) => this.getStem(vfStaveNote))
    );

    // In theory, all of the NoteRenderings should have the same BeamValue. But just in case that invariant is broken,
    // we look at the stem direction to determine which note should be the one to determine the beamining.
    if (stem === 'down') {
      return util.last(stemmable.notes)!;
    } else {
      return util.first(stemmable.notes)!;
    }
  }

  private getStem(vfStaveNote: vexflow.StaveNote): musicxml.Stem {
    // Calling getStemDirection will throw if there is no stem.
    // https://github.com/0xfe/vexflow/blob/7e7eb97bf1580a31171302b3bd8165f057b692ba/src/stemmablenote.ts#L118
    try {
      const stemDirection = vfStaveNote.getStemDirection();
      return conversions.fromVexflowStemDirectionToMusicXmlStem(stemDirection);
    } catch (e) {
      return 'none';
    }
  }

  private getVfStaveNote(rendering: NoteRendering | ChordRendering | RestRendering): vexflow.StaveNote {
    switch (rendering.type) {
      case 'note':
        return rendering.vexflow.staveNote;
      case 'rest':
        return rendering.vexflow.staveNote;
      case 'chord':
        return rendering.notes[0]?.vexflow.staveNote;
    }
  }

  // TODO: Account for other voices and/or consider whether the voice is ascending or descending.
  private getSlurPlacement(rendering: NoteRendering | ChordRendering | RestRendering): musicxml.AboveBelow {
    const vfStaveNote = this.getVfStaveNote(rendering);

    // If the note has a stem, first try the opposite direction.
    switch (this.getStem(vfStaveNote)) {
      case 'up':
        return 'below';
      case 'down':
        return 'above';
    }

    // Otherwise, use the note's placement relative to its stave to determine placement.
    const line = util.first(vfStaveNote.getKeyProps())?.line ?? null;
    const numLines = vfStaveNote.getStave()?.getNumLines() ?? 5;

    if (typeof line !== 'number') {
      return 'above';
    }

    if (line > numLines / 2) {
      // The note is above the halfway point on the stave.
      return 'below';
    } else {
      // The note is at or below the halfway point on the stave.
      return 'above';
    }
  }
}
