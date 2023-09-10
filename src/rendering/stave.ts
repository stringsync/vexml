import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';
import { Voice } from './voice';

type CreateOptions = {
  musicXml: {
    measure: musicxml.Measure;
  };
  staffNumber: number;
};

type ConstructorOpts = {
  staffNumber: number;
  clefType: musicxml.ClefType;
  staffType: musicxml.StaffType;
  timeSignature: musicxml.TimeSignature;
  beginningBarStyle: musicxml.BarStyle;
  endBarStyle: musicxml.BarStyle;
  voice: Voice;
};

type RenderOptions = {
  ctx: vexflow.RenderContext;
};

export class Stave {
  static create(opts: CreateOptions): Stave {
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

    const voice = Voice.create({
      musicXml: { measure: opts.musicXml.measure },
      staffNumber: opts.staffNumber,
      clefType,
    });

    return new Stave({
      staffNumber: opts.staffNumber,
      clefType,
      staffType,
      timeSignature,
      beginningBarStyle,
      endBarStyle,
      voice,
    });
  }

  private staffNumber: number;
  private staffType: musicxml.StaffType;
  private clefType: musicxml.ClefType;
  private voice: Voice;

  private constructor(opts: ConstructorOpts) {
    this.staffNumber = opts.staffNumber;
    this.staffType = opts.staffType;
    this.clefType = opts.clefType;
    this.voice = opts.voice;
  }

  render(opts: RenderOptions): void {
    // noop
  }
}
