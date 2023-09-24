import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';
import { Voice, VoiceRendering } from './voice';
import { Config } from './config';
import * as util from '@/util';
import { Text } from './text';

const STAVE_LABEL_OFFSET_X = 0;
const STAVE_LABEL_OFFSET_Y = 24;
const STAVE_LABEL_FONT_SIZE = 8;
const STAVE_LABEL_COLOR = '#aaaaaa';

/** The result of rendering a Stave. */
export type StaveRendering = {
  type: 'stave';
  staffNumber: number;
  width: number;
  vexflow: {
    stave: vexflow.Stave;
  };
  label: Text;
  voices: VoiceRendering[];
};

/**
 * Represents a single stave (or staff) in a measure, providing the graphical foundation for musical symbols such as
 * notes, rests, clefs, and key signatures.
 *
 * The `Stave` class acts as a container for musical elements that are vertically aligned in a score or sheet music. It
 * typically corresponds to a specific voice or set of voices, especially in multi-staff instruments like the piano.
 */
export class Stave {
  private config: Config;
  private label: string;
  private staffNumber: number;
  private clefType: musicxml.ClefType;
  private timeSignature: musicxml.TimeSignature;
  private keySignature: string;
  private beginningBarStyle: musicxml.BarStyle;
  private endBarStyle: musicxml.BarStyle;
  private voices: Voice[];

  private constructor(opts: {
    config: Config;
    label: string;
    staffNumber: number;
    clefType: musicxml.ClefType;
    timeSignature: musicxml.TimeSignature;
    keySignature: string;
    beginningBarStyle: musicxml.BarStyle;
    endBarStyle: musicxml.BarStyle;
    voices: Voice[];
  }) {
    this.config = opts.config;
    this.label = opts.label;
    this.staffNumber = opts.staffNumber;
    this.timeSignature = opts.timeSignature;
    this.keySignature = opts.keySignature;
    this.beginningBarStyle = opts.beginningBarStyle;
    this.endBarStyle = opts.endBarStyle;
    this.clefType = opts.clefType;
    this.voices = opts.voices;
  }

  /** Creates a Stave. */
  static create(opts: {
    config: Config;
    label: string;
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

    let beginningBarStyle: musicxml.BarStyle = 'regular';
    let endBarStyle: musicxml.BarStyle = 'regular';
    for (const barline of opts.musicXml.measure.getBarlines()) {
      const barStyle = barline.getBarStyle();
      switch (barline.getLocation()) {
        case 'left':
          beginningBarStyle = barStyle;
          break;
        case 'right':
          endBarStyle = barStyle;
          break;
      }
    }

    // TODO: Support multiple voices per stave.
    const voices = [
      Voice.create({
        config: opts.config,
        musicXml: { measure: opts.musicXml.measure },
        staffNumber: opts.staffNumber,
        clefType,
      }),
    ];

    return new Stave({
      config: opts.config,
      label: opts.label,
      staffNumber: opts.staffNumber,
      clefType,
      timeSignature,
      keySignature,
      beginningBarStyle,
      endBarStyle,
      voices,
    });
  }

  /** Returns the minimum justify width for the stave in a measure context. */
  @util.memoize()
  getMinJustifyWidth(): number {
    if (this.voices.length === 0) {
      return 0;
    }
    const vfVoices = this.voices.map((voice) => voice.render().vexflow.voice);
    const vfFormatter = new vexflow.Formatter();
    return vfFormatter.preCalculateMinTotalWidth(vfVoices) + this.config.measureSpacingBuffer;
  }

  /** Returns the width that the modifiers take up. */
  @util.memoize()
  getModifiersWidth(): number {
    return this.toVexflowStave({
      x: 0,
      y: 0,
      width: this.getMinJustifyWidth(),
      renderModifiers: true,
    }).getNoteStartX();
  }

  /** Cleans the Stave. */
  clone(): Stave {
    return new Stave({
      config: this.config,
      label: this.label,
      staffNumber: this.staffNumber,
      clefType: this.clefType,
      timeSignature: this.timeSignature.clone(),
      keySignature: this.keySignature,
      beginningBarStyle: this.beginningBarStyle,
      endBarStyle: this.endBarStyle,
      voices: this.voices.map((voice) => voice.clone()),
    });
  }

  /** Wether the staves have the same modifiers. */
  hasEqualModifiers(stave: Stave): boolean {
    return (
      this.clefType === stave.clefType &&
      this.timeSignature.toString() === stave.timeSignature.toString() &&
      this.keySignature === stave.keySignature
    );
  }

  /** Renders the Stave. */
  render(opts: { x: number; y: number; width: number; renderModifiers: boolean }): StaveRendering {
    const vfStave = this.toVexflowStave({
      x: opts.x,
      y: opts.y,
      width: opts.width,
      renderModifiers: opts.renderModifiers,
    });

    const voiceRenderings = new Array<VoiceRendering>();
    for (const voice of this.voices) {
      const voiceRendering = voice.render();
      voiceRenderings.push(voiceRendering);
      voiceRendering.vexflow.voice.setStave(vfStave);
    }

    const vfVoices = voiceRenderings.map((voiceRendering) => voiceRendering.vexflow.voice);
    const vfFormatter = new vexflow.Formatter();
    vfFormatter.joinVoices(vfVoices).formatToStave(vfVoices, vfStave);

    const label = new Text({
      content: this.label,
      italic: true,
      x: opts.x + STAVE_LABEL_OFFSET_X,
      y: opts.y + STAVE_LABEL_OFFSET_Y,
      color: STAVE_LABEL_COLOR,
      size: STAVE_LABEL_FONT_SIZE,
    });

    return {
      type: 'stave',
      staffNumber: this.staffNumber,
      width: opts.width,
      vexflow: {
        stave: vfStave,
      },
      label,
      voices: voiceRenderings,
    };
  }

  private toVexflowStave(opts: { x: number; y: number; width: number; renderModifiers: boolean }): vexflow.Stave {
    const vfStave = new vexflow.Stave(opts.x, opts.y, opts.width)
      .setBegBarType(this.getBarlineType(this.beginningBarStyle))
      .setEndBarType(this.getBarlineType(this.endBarStyle));

    if (opts.renderModifiers) {
      vfStave.addClef(this.clefType).addTimeSignature(this.timeSignature.toString());
    }

    return vfStave;
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
