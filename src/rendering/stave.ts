import { Chorus, ChorusRendering } from './chorus';
import { Clef } from './clef';
import { Config } from './config';
import { KeySignature } from './keysignature';
import { MeasureEntry, StaveSignature } from './stavesignature';
import { MultiRest, MultiRestRendering } from './multirest';
import { Tablature, TablatureRendering } from './tablature';
import { TimeSignature } from './timesignature';
import * as conversions from './conversions';
import * as musicxml from '@/musicxml';
import * as util from '@/util';
import * as vexflow from 'vexflow';
import { Address } from './address';
import { Spanners } from './spanners';

const METRONOME_TOP_PADDING = 8;

/** A possible component of a Stave. */
export type StaveEntry = Chorus | MultiRest | Tablature;

/** The result of rendering a Stave entry. */
export type StaveEntryRendering = ChorusRendering | MultiRestRendering | TablatureRendering;

/** The result of rendering a Stave. */
export type StaveRendering = {
  type: 'stave';
  address: Address<'stave'>;
  staveNumber: number;
  signature: StaveSignature;
  width: number;
  vexflow: {
    stave: vexflow.Stave;
    beginningBarlineType: vexflow.BarlineType;
    endBarlineType: vexflow.BarlineType;
  };
  entry: StaveEntryRendering;
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
  private number: number;
  private musicXml: {
    beginningBarStyle: musicxml.BarStyle;
    endBarStyle: musicxml.BarStyle;
  };
  private staveSignature: StaveSignature;
  private measureEntries: MeasureEntry[];

  constructor(opts: {
    config: Config;
    number: number;
    staveSignature: StaveSignature;
    musicXml: {
      beginningBarStyle: musicxml.BarStyle;
      endBarStyle: musicxml.BarStyle;
    };
    measureEntries: MeasureEntry[];
  }) {
    this.config = opts.config;
    this.number = opts.number;
    this.staveSignature = opts.staveSignature;
    this.musicXml = opts.musicXml;
    this.measureEntries = opts.measureEntries;
  }

  /** Returns the minimum justify width for the stave in a measure context. */
  @util.memoize()
  getMinJustifyWidth(address: Address<'stave'>): number {
    const entry = this.getEntry();

    if (entry instanceof MultiRest) {
      // This is much easier being configurable. Otherwise, we would have to create a dummy context to render it, then
      // get the width via MultiMeasureRest.getBoundingBox. There is no "preCalculateMinTotalWidth" for non-voices at
      // the moment.
      return this.config.MULTI_MEASURE_REST_WIDTH;
    }

    if (entry instanceof Chorus) {
      return entry.getMinJustifyWidth(address.chorus());
    }

    return 0;
  }

  @util.memoize()
  getEntry(): StaveEntry {
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

  /** Returns the stave signature. */
  getSignature(): StaveSignature {
    return this.staveSignature;
  }

  /** Returns the stave number. */
  getNumber(): number {
    return this.number;
  }

  /** Returns the number of measures the multi rest is active for. 0 means there's no multi rest. */
  getMultiRestCount(): number {
    return this.staveSignature?.getMultiRestCount(this.number) ?? 0;
  }

  /** Returns the stave modifiers that changed. */
  getModifierChanges(opts: { previousStave: Stave | null }): StaveModifier[] {
    if (!opts.previousStave) {
      return ['clef', 'keySignature', 'timeSignature'];
    }

    const result = new Array<StaveModifier>();

    if (!this.getClef().isEqual(opts.previousStave.getClef())) {
      result.push('clef');
    }
    if (!this.getKeySignature().isEqual(opts.previousStave.getKeySignature())) {
      result.push('keySignature');
    }
    if (!this.getTimeSignature().isEqual(opts.previousStave.getTimeSignature())) {
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
    vexflow: { formatter: vexflow.Formatter };
    address: Address<'stave'>;
    spanners: Spanners;
    width: number;
    beginningModifiers: StaveModifier[];
    endModifiers: StaveModifier[];
    previousStave: Stave | null;
    nextStave: Stave | null;
  }): StaveRendering {
    const staveSignatureRendering = this.staveSignature.render({ staveNumber: this.number });

    const vfStave =
      this.getClef().getType() === 'tab'
        ? new vexflow.TabStave(opts.x, opts.y, opts.width)
        : new vexflow.Stave(opts.x, opts.y, opts.width);

    const vfBeginningBarlineType = conversions.fromBarStyleToBarlineType(this.musicXml.beginningBarStyle);
    vfStave.setBegBarType(vfBeginningBarlineType);

    const vfEndBarlineType = conversions.fromBarStyleToBarlineType(this.musicXml.endBarStyle);
    vfStave.setEndBarType(vfEndBarlineType);

    if (opts.beginningModifiers.includes('clef')) {
      vfStave.addModifier(staveSignatureRendering.clef.vexflow.clef);
    }
    if (opts.beginningModifiers.includes('keySignature')) {
      vfStave.addModifier(staveSignatureRendering.keySignature.vexflow.keySignature);
    }
    if (opts.beginningModifiers.includes('timeSignature')) {
      for (const timeSignature of staveSignatureRendering.timeSignature.vexflow.timeSignatures) {
        vfStave.addModifier(timeSignature);
      }
    }

    const nextStaveSignature = this.staveSignature.getNext();
    if (opts.endModifiers.includes('clef') && nextStaveSignature) {
      const nextStaveSignatureRendering = nextStaveSignature.render({ staveNumber: this.number });
      vfStave.addEndModifier(nextStaveSignatureRendering.clef.vexflow.clef);
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

    const staveEntryRendering = this.getEntry().render({
      address: opts.address.chorus(),
      spanners: opts.spanners,
    });

    switch (staveEntryRendering.type) {
      case 'multirest':
        staveEntryRendering.vexflow.multiMeasureRest.setStave(vfStave);
        break;
      case 'chorus':
        const vfVoices = staveEntryRendering.voices.map((voice) => voice.vexflow.voice);
        opts.vexflow.formatter.joinVoices(vfVoices);
        for (const vfVoice of vfVoices) {
          vfVoice.setStave(vfStave);
        }
        break;
    }

    return {
      type: 'stave',
      address: opts.address,
      signature: this.staveSignature,
      staveNumber: this.number,
      width: opts.width,
      vexflow: {
        stave: vfStave,
        beginningBarlineType: vfBeginningBarlineType,
        endBarlineType: vfEndBarlineType,
      },
      entry: staveEntryRendering,
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

  private getClef(): Clef {
    return this.staveSignature.getClef(this.number);
  }

  private getKeySignature(): KeySignature {
    return this.staveSignature.getKeySignature(this.number);
  }

  private getTimeSignature(): TimeSignature {
    return this.staveSignature.getTimeSignature(this.number);
  }

  private getQuarterNoteDivisions(): number {
    return this.staveSignature.getQuarterNoteDivisions();
  }
}
