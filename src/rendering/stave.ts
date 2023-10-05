import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';
import { Config } from './config';
import * as util from '@/util';
import { MultiRest, MultiRestRendering } from './multirest';
import { Chorus, ChorusRendering } from './chorus';

/** A possible component of a Stave. */
export type StaveEntry = Chorus | MultiRest;

export type StaveEntryRendering = ChorusRendering | MultiRestRendering;

/** The result of rendering a Stave. */
export type StaveRendering = {
  type: 'stave';
  staffNumber: number;
  width: number;
  vexflow: {
    stave: vexflow.Stave;
    begginningBarlineType: vexflow.BarlineType;
    endBarlineType: vexflow.BarlineType;
  };
  entry: StaveEntryRendering;
};

/** The modifiers of a stave. */
export type StaveModifier = 'clefType' | 'keySignature' | 'timeSignature';

/**
 * Represents a single stave (or staff) in a measure, providing the graphical foundation for musical symbols such as
 * notes, rests, clefs, and key signatures.
 *
 * The `Stave` class acts as a container for musical elements that are vertically aligned in a score or sheet music. It
 * typically corresponds to a specific voice or set of voices, especially in multi-staff instruments like the piano.
 */
export class Stave {
  private config: Config;
  private staffNumber: number;
  private clefType: musicxml.ClefType;
  private timeSignature: musicxml.TimeSignature;
  private keySignature: string;
  private beginningBarStyle: musicxml.BarStyle;
  private endBarStyle: musicxml.BarStyle;
  private entry: StaveEntry;

  private constructor(opts: {
    config: Config;
    staffNumber: number;
    clefType: musicxml.ClefType;
    timeSignature: musicxml.TimeSignature;
    keySignature: string;
    beginningBarStyle: musicxml.BarStyle;
    endBarStyle: musicxml.BarStyle;
    entry: StaveEntry;
  }) {
    this.config = opts.config;
    this.staffNumber = opts.staffNumber;
    this.timeSignature = opts.timeSignature;
    this.keySignature = opts.keySignature;
    this.beginningBarStyle = opts.beginningBarStyle;
    this.endBarStyle = opts.endBarStyle;
    this.clefType = opts.clefType;
    this.entry = opts.entry;
  }

  /** Creates a Stave. */
  static create(opts: {
    config: Config;
    musicXml: {
      measure: musicxml.Measure;
    };
    previousStave: Stave | null;
    staffNumber: number;
  }): Stave {
    // TODO: Properly handle multiple <attributes>.
    const attributes = opts.musicXml.measure.getAttributes();

    const clefType =
      attributes
        .flatMap((attribute) => attribute.getClefs())
        .find((clef) => clef.getStaffNumber() === opts.staffNumber)
        ?.getClefType() ??
      opts.previousStave?.clefType ??
      'treble';

    // TODO: Handle multiple time signatures.
    const timeSignature =
      attributes
        .flatMap((attribute) => attribute.getTimes())
        .find((time) => time.getStaffNumber() === opts.staffNumber)
        ?.getTimeSignatures()[0] ??
      opts.previousStave?.timeSignature ??
      new musicxml.TimeSignature(4, 4);

    const keySignature =
      attributes
        .flatMap((attribute) => attribute.getKeys())
        .find((key) => key.getStaffNumber() === opts.staffNumber)
        ?.getKeySignature() ??
      opts.previousStave?.keySignature ??
      'C';

    const begginingMeasure = opts.musicXml.measure;
    let beginningBarStyle: musicxml.BarStyle = 'regular';
    for (const barline of begginingMeasure.getBarlines()) {
      const barStyle = barline.getBarStyle();
      if (barline.getLocation() === 'left') {
        beginningBarStyle = barStyle;
      }
    }

    const endingMeasure = opts.musicXml.measure.getEndingMeasure();
    let endBarStyle: musicxml.BarStyle = 'regular';
    for (const barline of endingMeasure.getBarlines()) {
      const barStyle = barline.getBarStyle();
      if (barline.getLocation() === 'right') {
        endBarStyle = barStyle;
      }
    }

    const multiRestCount =
      opts.musicXml.measure
        .getAttributes()
        .flatMap((attribute) => attribute.getMeasureStyles())
        .find((measureStyle) => measureStyle.getStaffNumber() === opts.staffNumber)
        ?.getMultipleRestCount() ?? 0;

    const entry =
      multiRestCount > 0
        ? MultiRest.create({
            count: multiRestCount,
          })
        : Chorus.create({
            config: opts.config,
            musicXml: { measure: opts.musicXml.measure },
            staffNumber: opts.staffNumber,
            clefType,
          });

    return new Stave({
      config: opts.config,
      staffNumber: opts.staffNumber,
      clefType,
      timeSignature,
      keySignature,
      beginningBarStyle,
      endBarStyle,
      entry,
    });
  }

  /** Returns the minimum justify width for the stave in a measure context. */
  @util.memoize()
  getMinJustifyWidth(): number {
    if (this.entry instanceof MultiRest) {
      // This is much easier being configurable. Otherwise, we would have to create a dummy context to render it, then
      // get the width via MultiMeasureRest.getBoundingBox. There is no "preCalculateMinTotalWidth" for non-voices at
      // the moment.
      return this.config.multiMeasureRestWidth;
    }

    if (this.entry instanceof Chorus) {
      return this.entry.getMinJustifyWidth();
    }

    return 0;
  }

  /** Returns the width that the modifiers take up. */
  getModifiersWidth(modifiers: StaveModifier[]): number {
    let width = 0;

    if (modifiers.includes('clefType')) {
      width += this.getClefWidth();
    }
    if (modifiers.includes('keySignature')) {
      width += this.getKeySignatureWidth();
    }
    if (modifiers.includes('timeSignature')) {
      width += this.getTimeSignatureWidth();
    }

    return width;
  }

  /** Returns the number of measures the multi rest is active for. 0 means there's no multi rest. */
  getMultiRestCount(): number {
    return this.entry instanceof MultiRest ? this.entry.getCount() : 0;
  }

  /** Cleans the Stave. */
  clone(): Stave {
    return new Stave({
      config: this.config,
      staffNumber: this.staffNumber,
      clefType: this.clefType,
      timeSignature: this.timeSignature.clone(),
      keySignature: this.keySignature,
      beginningBarStyle: this.beginningBarStyle,
      endBarStyle: this.endBarStyle,
      entry: this.entry.clone(),
    });
  }

  /** Wether the staves have the same modifiers. */
  getModifierChanges(stave: Stave): StaveModifier[] {
    const result = new Array<StaveModifier>();

    if (this.clefType !== stave.clefType) {
      result.push('clefType');
    }
    if (this.keySignature !== stave.keySignature) {
      result.push('keySignature');
    }
    if (this.timeSignature.toString() !== stave.timeSignature.toString()) {
      result.push('timeSignature');
    }

    return result;
  }

  /** Renders the Stave. */
  render(opts: { x: number; y: number; width: number; modifiers: StaveModifier[] }): StaveRendering {
    const vfStave = this.toVexflowStave({
      x: opts.x,
      y: opts.y,
      width: opts.width,
      modifiers: opts.modifiers,
    });

    const staveEntryRendering = this.entry.render();

    switch (staveEntryRendering.type) {
      case 'multirest':
        staveEntryRendering.vexflow.multiMeasureRest.setStave(vfStave);
        break;
      case 'chorus':
        const vfVoices = staveEntryRendering.voices.map((voice) => voice.vexflow.voice);
        for (const vfVoice of vfVoices) {
          vfVoice.setStave(vfStave);
        }

        const vfTickables = vfVoices.flatMap((vfVoice) => vfVoice.getTickables());
        if (vfTickables.length > 0) {
          new vexflow.Formatter().joinVoices(vfVoices).formatToStave(vfVoices, vfStave);
        }
        break;
    }

    return {
      type: 'stave',
      staffNumber: this.staffNumber,
      width: opts.width,
      vexflow: {
        stave: vfStave,
        begginningBarlineType: this.getBeginningBarlineType(),
        endBarlineType: this.getEndBarlineType(),
      },
      entry: staveEntryRendering,
    };
  }

  /** Returns the width that the clef takes up. */
  @util.memoize()
  private getClefWidth(): number {
    return this.toVexflowStave({
      x: 0,
      y: 0,
      width: this.getMinJustifyWidth(),
      modifiers: ['clefType'],
    }).getNoteStartX();
  }

  /** Returns the width that the key signature takes up. */
  @util.memoize()
  private getKeySignatureWidth(): number {
    return this.keySignature === 'C'
      ? 0
      : this.toVexflowStave({
          x: 0,
          y: 0,
          width: this.getMinJustifyWidth(),
          modifiers: ['keySignature'],
        }).getNoteStartX();
  }

  /** Returns the width that the time signature takes up. */
  @util.memoize()
  private getTimeSignatureWidth(): number {
    return this.toVexflowStave({
      x: 0,
      y: 0,
      width: this.getMinJustifyWidth(),
      modifiers: ['timeSignature'],
    }).getNoteStartX();
  }

  private toVexflowStave(opts: { x: number; y: number; width: number; modifiers: StaveModifier[] }): vexflow.Stave {
    const vfStave = new vexflow.Stave(opts.x, opts.y, opts.width)
      .setBegBarType(this.getBeginningBarlineType())
      .setEndBarType(this.getEndBarlineType());

    if (opts.modifiers.includes('clefType')) {
      vfStave.addClef(this.clefType);
    }
    if (opts.modifiers.includes('keySignature')) {
      vfStave.addKeySignature(this.keySignature);
    }
    if (opts.modifiers.includes('timeSignature')) {
      vfStave.addTimeSignature(this.timeSignature.toString());
    }

    return vfStave;
  }

  private getBeginningBarlineType(): vexflow.BarlineType {
    return this.getBarlineType(this.beginningBarStyle);
  }

  private getEndBarlineType(): vexflow.BarlineType {
    return this.getBarlineType(this.endBarStyle);
  }

  private getBarlineType(barStyle: musicxml.BarStyle): vexflow.BarlineType {
    switch (barStyle) {
      case 'regular':
      case 'short':
      case 'dashed':
      case 'dotted':
      case 'heavy':
        return vexflow.BarlineType.SINGLE;
      case 'heavy-light':
      case 'heavy-heavy':
      case 'light-light':
      case 'tick':
        return vexflow.BarlineType.DOUBLE;
      case 'light-heavy':
        return vexflow.BarlineType.END;
      case 'none':
        return vexflow.BarlineType.NONE;
      default:
        return vexflow.BarlineType.NONE;
    }
  }
}
