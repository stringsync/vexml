import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';
import { VoiceEntry } from './voiceentry';

type CreateOptions = {
  musicXml: {
    measure: musicxml.Measure;
  };
  staffNumber: number;
  clefType: musicxml.ClefType;
};

type RenderOptions = {
  ctx: vexflow.RenderContext;
};

export class Voice {
  static create(opts: CreateOptions): Voice {
    const entries = opts.musicXml.measure
      .getNotes()
      .filter((note) => note.getStaffNumber() === opts.staffNumber)
      .map((note) => VoiceEntry.create({ musicXml: { note }, clefType: opts.clefType }));

    return new Voice(entries);
  }

  private entries: VoiceEntry[];

  private constructor(entries: VoiceEntry[]) {
    this.entries = entries;
  }

  render(opts: RenderOptions): void {
    // noop
  }
}
