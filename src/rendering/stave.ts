import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';
import { Voice, VoiceRendering } from './voice';

const JUSTIFY_PADDING = 100;

export type StaveRendering = {
  type: 'stave';
  staffNumber: number;
  vexflow: {
    stave: vexflow.Stave;
  };
  voices: VoiceRendering[];
};

export class Stave {
  private staffNumber: number;
  private clefType: musicxml.ClefType;
  private timeSignature: musicxml.TimeSignature;
  private keySignature: string;
  private beginningBarStyle: musicxml.BarStyle;
  private endBarStyle: musicxml.BarStyle;
  private voices: Voice[];

  private constructor(opts: {
    staffNumber: number;
    clefType: musicxml.ClefType;
    timeSignature: musicxml.TimeSignature;
    keySignature: string;
    beginningBarStyle: musicxml.BarStyle;
    endBarStyle: musicxml.BarStyle;
    voices: Voice[];
  }) {
    this.staffNumber = opts.staffNumber;
    this.timeSignature = opts.timeSignature;
    this.keySignature = opts.keySignature;
    this.beginningBarStyle = opts.beginningBarStyle;
    this.endBarStyle = opts.endBarStyle;
    this.clefType = opts.clefType;
    this.voices = opts.voices;
  }

  static create(opts: {
    musicXml: {
      measure: musicxml.Measure;
    };
    staffNumber: number;
  }): Stave {
    // TODO: Properly handle multiple <attributes>.
    const attributes = opts.musicXml.measure.getAttributes();

    const clefType =
      attributes
        .flatMap((attribute) => attribute.getClefs())
        .find((clef) => clef.getStaffNumber() === opts.staffNumber)
        ?.getClefType() ?? 'treble';

    // TODO: Handle multiple time signatures.
    const timeSignature =
      attributes
        .flatMap((attribute) => attribute.getTimes())
        .find((time) => time.getStaffNumber() === opts.staffNumber)
        ?.getTimeSignatures()[0] ?? new musicxml.TimeSignature(4, 4);

    const keySignature =
      attributes
        .flatMap((attribute) => attribute.getKeys())
        .find((key) => key.getStaffNumber() === opts.staffNumber)
        ?.getKeySignature() ?? 'C';

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
        musicXml: { measure: opts.musicXml.measure },
        staffNumber: opts.staffNumber,
        clefType,
      }),
    ];

    return new Stave({
      staffNumber: opts.staffNumber,
      clefType,
      timeSignature,
      keySignature,
      beginningBarStyle,
      endBarStyle,
      voices,
    });
  }

  getClefType(): musicxml.ClefType {
    return this.clefType;
  }

  getTimeSignature(): musicxml.TimeSignature {
    return this.timeSignature;
  }

  getKeySignature(): string {
    return this.keySignature;
  }

  getMinJustifyWidth(): number {
    if (this.voices.length === 0) {
      return 0;
    }
    const vfVoices = this.voices.map((voice) => voice.render().vexflow.voice);
    const vfFormatter = new vexflow.Formatter();
    return vfFormatter.preCalculateMinTotalWidth(vfVoices) + JUSTIFY_PADDING;
  }

  getModifiersWidth(): number {
    return this.toVexflowStave({
      x: 0,
      y: 0,
      width: this.getMinJustifyWidth(),
      renderModifiers: true,
    }).getNoteStartX();
  }

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

    return {
      type: 'stave',
      staffNumber: this.staffNumber,
      vexflow: {
        stave: vfStave,
      },
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
