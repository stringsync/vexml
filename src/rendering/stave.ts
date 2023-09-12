import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';
import { Voice, VoiceRendering } from './voice';

type StaveCreateOptions = {
  musicXml: {
    measure: musicxml.Measure;
  };
  staffNumber: number;
};

type StaveConstructorOpts = {
  staffNumber: number;
  clefType: musicxml.ClefType;
  staffType: musicxml.StaffType;
  timeSignature: musicxml.TimeSignature;
  beginningBarStyle: musicxml.BarStyle;
  endBarStyle: musicxml.BarStyle;
  voices: Voice[];
};

type StaveRenderOptions = {
  x: number;
  y: number;
};

export type StaveRendering = {
  type: 'stave';
  vexflow: {
    stave: vexflow.Stave;
  };
  voices: VoiceRendering[];
};

export class Stave {
  static create(opts: StaveCreateOptions): Stave {
    // TODO: Properly handle multiple <attributes>.
    const attributes = opts.musicXml.measure.getAttributes();

    const clefType =
      attributes
        .flatMap((attribute) => attribute.getClefs())
        .find((clef) => clef.getStaffNumber() === opts.staffNumber)
        ?.getClefType() ?? 'treble';

    const staffType =
      attributes
        .flatMap((attribute) => attribute.getStaffDetails())
        .find((staffDetail) => staffDetail.getStaffNumber() === opts.staffNumber)
        ?.getStaffType() ?? 'regular';

    // TODO: Handle multiple time signatures.
    const timeSignature =
      attributes
        .flatMap((attribute) => attribute.getTimes())
        .find((time) => time.getStaffNumber() === opts.staffNumber)
        ?.getTimeSignatures()[0] ?? new musicxml.TimeSignature(4, 4);

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
      staffType,
      timeSignature,
      beginningBarStyle,
      endBarStyle,
      voices,
    });
  }

  private staffNumber: number;
  private clefType: musicxml.ClefType;
  private staffType: musicxml.StaffType;
  private timeSignature: musicxml.TimeSignature;
  private beginningBarStyle: musicxml.BarStyle;
  private endBarStyle: musicxml.BarStyle;
  private voices: Voice[];

  private constructor(opts: StaveConstructorOpts) {
    this.staffNumber = opts.staffNumber;
    this.staffType = opts.staffType;
    this.timeSignature = opts.timeSignature;
    this.beginningBarStyle = opts.beginningBarStyle;
    this.endBarStyle = opts.endBarStyle;
    this.clefType = opts.clefType;
    this.voices = opts.voices;
  }

  getWidth(): number {
    if (this.voices.length === 0) {
      return 0;
    }
    const vfVoices = this.voices.map((voice) => voice.render({}).vexflow.voice);
    const vfFormatter = new vexflow.Formatter();
    return vfFormatter.preCalculateMinTotalWidth(vfVoices);
  }

  render(opts: StaveRenderOptions): StaveRendering {
    const vfStave = new vexflow.Stave(opts.x, opts.y, this.getWidth())
      .addClef(this.clefType)
      .addTimeSignature(this.timeSignature.toString())
      .setBegBarType(this.getBarlineType(this.beginningBarStyle))
      .setEndBarType(this.getBarlineType(this.endBarStyle));

    const voiceRenderings = new Array<VoiceRendering>();
    for (const voice of this.voices) {
      const voiceRendering = voice.render({});
      voiceRenderings.push(voiceRendering);
      voiceRendering.vexflow.voice.setStave(vfStave);
    }

    const vfVoices = voiceRenderings.map((voiceRendering) => voiceRendering.vexflow.voice);
    const vfFormatter = new vexflow.Formatter();
    vfFormatter.joinVoices(vfVoices).formatToStave(vfVoices, vfStave);

    return {
      type: 'stave',
      vexflow: {
        stave: vfStave,
      },
      voices: voiceRenderings,
    };
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
