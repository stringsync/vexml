import { Chorus, ChorusRendering } from './chorus';
import { Clef, ClefRendering } from './clef';
import { Config } from './config';
import { KeySignature, KeySignatureRendering } from './keysignature';
import { MeasureEntry, StaveSignature } from './stavesignature';
import { MultiRest, MultiRestRendering } from './multirest';
import { Tablature, TablatureRendering } from './tablature';
import { TimeSignature, TimeSignatureRendering } from './timesignature';
import * as conversions from './conversions';
import * as musicxml from '@/musicxml';
import * as util from '@/util';
import * as vexflow from 'vexflow';

const METRONOME_TOP_PADDING = 8;

/** A possible component of a Stave. */
export type StaveEntry = Chorus | MultiRest | Tablature;

/** The result of rendering a Stave entry. */
export type StaveEntryRendering = ChorusRendering | MultiRestRendering | TablatureRendering;

/** The result of rendering a Stave. */
export type StaveRendering = {
  type: 'stave';
  staveNumber: number;
  width: number;
  vexflow: {
    stave: vexflow.Stave;
    beginningBarlineType: vexflow.BarlineType;
    endBarlineType: vexflow.BarlineType;
  };
  entry: StaveEntryRendering;
  clef: ClefRendering;
  keySignature: KeySignatureRendering;
  timeSignature: TimeSignatureRendering;
};

/** The modifiers of a stave. */
export type StaveModifier = 'clef' | 'keySignature' | 'timeSignature';

/**
 * Represents a single stave (or staff) in a measure, providing the graphical foundation for musical symbols such as
 * notes, rests, clefs, and key signatures.
 *
 * The `Stave` class acts as a container for musical elements that are vertically aligned in a score or sheet music. It
 * typically corresponds to a specific voice or set of voices, especially in multi-stave instruments like the piano.
 */
export class Stave {
  private config: Config;
  private staveNumber: number;
  private staveSignature: StaveSignature | null;
  private beginningBarStyle: musicxml.BarStyle;
  private endBarStyle: musicxml.BarStyle;
  private measureEntries: MeasureEntry[];
  private previousStave: Stave | null;

  constructor(opts: {
    config: Config;
    staveNumber: number;
    staveSignature: StaveSignature | null;
    beginningBarStyle: musicxml.BarStyle;
    endBarStyle: musicxml.BarStyle;
    measureEntries: MeasureEntry[];
    previousStave: Stave | null;
  }) {
    this.config = opts.config;
    this.staveNumber = opts.staveNumber;
    this.staveSignature = opts.staveSignature;
    this.beginningBarStyle = opts.beginningBarStyle;
    this.endBarStyle = opts.endBarStyle;
    this.measureEntries = opts.measureEntries;
    this.previousStave = opts.previousStave;
  }

  /** Returns the minimum justify width for the stave in a measure context. */
  @util.memoize()
  getMinJustifyWidth(): number {
    const entry = this.getEntry();

    if (entry instanceof MultiRest) {
      // This is much easier being configurable. Otherwise, we would have to create a dummy context to render it, then
      // get the width via MultiMeasureRest.getBoundingBox. There is no "preCalculateMinTotalWidth" for non-voices at
      // the moment.
      return this.config.MULTI_MEASURE_REST_WIDTH;
    }

    if (entry instanceof Chorus) {
      return entry.getMinJustifyWidth();
    }

    return 0;
  }

  /** Returns the width that the modifiers take up. */
  getModifiersWidth(modifiers: StaveModifier[]): number {
    let width = 0;

    if (modifiers.includes('clef')) {
      width += this.getClef().getWidth();
    }
    if (modifiers.includes('keySignature')) {
      width += this.getKeySignature().getWidth();
    }
    if (modifiers.includes('timeSignature')) {
      width += this.getTimeSignature().getWidth();
    }

    return width;
  }

  /** Returns the number of measures the multi rest is active for. 0 means there's no multi rest. */
  getMultiRestCount(): number {
    return this.staveSignature?.getMultiRestCount(this.staveNumber) ?? 0;
  }

  /** Returns the stave modifiers that changed. */
  getModifierChanges(): StaveModifier[] {
    if (!this.previousStave) {
      return ['clef', 'keySignature', 'timeSignature'];
    }

    const result = new Array<StaveModifier>();

    if (!this.getClef().isEqual(this.previousStave.getClef())) {
      result.push('clef');
    }
    if (!this.getKeySignature().isEqual(this.previousStave.getKeySignature())) {
      result.push('keySignature');
    }
    if (!this.getTimeSignature().isEqual(this.previousStave.getTimeSignature())) {
      result.push('timeSignature');
    }

    return result;
  }

  /** Returns the top padding of the stave. */
  getTopPadding(): number {
    let topPadding = 0;

    if (this.getMetronome()) {
      topPadding += METRONOME_TOP_PADDING;
    }

    return topPadding;
  }

  /** Renders the Stave. */
  render(opts: {
    x: number;
    y: number;
    width: number;
    modifiers: StaveModifier[];
    previousStave: Stave | null;
    nextStave: Stave | null;
  }): StaveRendering {
    const clef = this.getClef();
    const clefRendering = clef.render();

    const keySignature = this.getKeySignature();
    const keySignatureRendering = keySignature.render();

    const timeSignature = this.getTimeSignature();
    const timeSignatureRendering = timeSignature.render();

    const vfStave =
      clef.getType() === 'tab'
        ? new vexflow.TabStave(opts.x, opts.y, opts.width)
        : new vexflow.Stave(opts.x, opts.y, opts.width);

    const vfBeginningBarlineType = conversions.fromBarStyleToBarlineType(this.beginningBarStyle);
    vfStave.setBegBarType(vfBeginningBarlineType);

    const vfEndBarlineType = conversions.fromBarStyleToBarlineType(this.endBarStyle);
    vfStave.setEndBarType(vfEndBarlineType);

    if (opts.modifiers.includes('clef')) {
      vfStave.addModifier(clefRendering.vexflow.clef);
    }
    if (opts.modifiers.includes('keySignature')) {
      vfStave.addModifier(keySignatureRendering.vexflow.keySignature);
    }
    if (opts.modifiers.includes('timeSignature')) {
      for (const timeSignature of timeSignatureRendering.vexflow.timeSignatures) {
        vfStave.addModifier(timeSignature);
      }
    }

    const metronome = this.getMetronome();
    const beatsPerMinute = metronome?.getBeatsPerMinute();
    const beatUnitDotCount = metronome?.getBeatUnitDotCount();
    const beatUnit = metronome?.getBeatUnit();
    const isMetronomeMarkSupported = beatsPerMinute && beatUnitDotCount && beatUnit;
    if (isMetronomeMarkSupported) {
      vfStave.setTempo(
        {
          bpm: beatsPerMinute,
          dots: beatUnitDotCount,
          duration: conversions.fromNoteTypeToNoteDurationDenominator(beatUnit)!,
        },
        opts.y
      );
    }

    const staveEntryRendering = this.getEntry().render();

    switch (staveEntryRendering.type) {
      case 'multirest':
        staveEntryRendering.vexflow.multiMeasureRest.setStave(vfStave);
        break;
      case 'chorus':
        const vfVoices = staveEntryRendering.voices.map((voice) => voice.vexflow.voice);
        for (const vfVoice of vfVoices) {
          vfVoice.setStave(vfStave);
        }
        break;
    }

    return {
      type: 'stave',
      staveNumber: this.staveNumber,
      width: opts.width,
      vexflow: {
        stave: vfStave,
        beginningBarlineType: vfBeginningBarlineType,
        endBarlineType: vfEndBarlineType,
      },
      entry: staveEntryRendering,
      clef: clefRendering,
      keySignature: keySignatureRendering,
      timeSignature: timeSignatureRendering,
    };
  }

  @util.memoize()
  private getMetronome(): musicxml.Metronome | null {
    return util.first(
      this.measureEntries
        .filter((measureEntry): measureEntry is musicxml.Direction => measureEntry instanceof musicxml.Direction)
        .flatMap((direction) => direction.getTypes())
        .map((directionType) => directionType.getContent())
        .filter((content): content is musicxml.MetronomeDirectionTypeContent => content.type === 'metronome')
        .map((content) => content.metronome)
        // Select the first renderable metronome, since there can be only one per vexflow.Stave.
        .filter((metronome) => metronome.isSupported())
    );
  }

  @util.memoize()
  private getClef(): Clef {
    return this.staveSignature?.getClef(this.staveNumber) ?? Clef.treble();
  }

  @util.memoize()
  private getKeySignature(): KeySignature {
    return this.staveSignature?.getKeySignature(this.staveNumber) ?? KeySignature.Cmajor();
  }

  @util.memoize()
  private getTimeSignature(): TimeSignature {
    return this.staveSignature?.getTimeSignature(this.staveNumber) ?? TimeSignature.common();
  }

  @util.memoize()
  private getQuarterNoteDivisions(): number {
    return this.staveSignature?.getQuarterNoteDivisions() ?? 2;
  }

  @util.memoize()
  private getEntry(): StaveEntry {
    const config = this.config;
    const timeSignature = this.getTimeSignature();
    const clef = this.getClef();
    const multiRestCount = this.getMultiRestCount();
    const measureEntries = this.measureEntries;
    const quarterNoteDivisions = this.getQuarterNoteDivisions();
    const keySignature = this.getKeySignature();

    if (multiRestCount === 1) {
      return Chorus.wholeRest({ config, clef, timeSignature });
    }

    if (multiRestCount > 1) {
      return new MultiRest({ count: multiRestCount });
    }

    if (this.getClef().getType() === 'tab') {
      // TODO: Render tablature correctly.
      return new Tablature();
    }

    return Chorus.multiVoice({
      config,
      measureEntries,
      quarterNoteDivisions,
      keySignature,
      clef,
      timeSignature,
    });
  }
}
