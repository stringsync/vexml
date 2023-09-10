import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';
import { Voice } from './voice';

type CreateOptions = {
  musicXml: {
    measure: musicxml.Measure;
  };
  clefType: musicxml.ClefType;
  staffType: musicxml.StaffType;
  staffNumber: number;
};

type ConstructorOpts = {
  staffNumber: number;
  clefType: musicxml.ClefType;
  staffType: musicxml.StaffType;
  voice: Voice;
};

type RenderOptions = {
  ctx: vexflow.RenderContext;
};

export class Stave {
  static create(opts: CreateOptions): Stave {
    const voice = Voice.create({
      musicXml: { measure: opts.musicXml.measure },
      staffNumber: opts.staffNumber,
    });

    return new Stave({
      staffNumber: opts.staffNumber,
      clefType: opts.clefType,
      staffType: opts.staffType,
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
