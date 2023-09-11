import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';
import { Note } from './note';
import { Chord } from './chord';
import { Rest } from './rest';

export type VoiceEntry = Note | Chord | Rest;

type VoiceCreateOptions = {
  musicXml: {
    measure: musicxml.Measure;
  };
  staffNumber: number;
  clefType: musicxml.ClefType;
};

type VoiceConstructorOptions = {
  entries: VoiceEntry[];
  timeSignature: musicxml.TimeSignature;
};

type VoiceRenderOptions = Record<string, never>;

export type VoiceRenderResult = {
  vexflow: {
    voice: vexflow.Voice;
  };
};

export class Voice {
  static create(opts: VoiceCreateOptions): Voice {
    const entries = opts.musicXml.measure
      .getNotes()
      .filter((note) => note.getStaffNumber() === opts.staffNumber)
      .filter(Voice.canCreateVoiceEntry)
      .map((note) => Voice.createVoiceEntry(note, opts.clefType));

    const timeSignature =
      opts.musicXml.measure
        .getAttributes()
        .flatMap((attributes) => attributes.getTimes())
        .find((time) => time.getStaffNumber() === opts.staffNumber)
        ?.getTimeSignatures()[0] ?? new musicxml.TimeSignature(4, 4);

    return new Voice({ entries, timeSignature });
  }

  private static canCreateVoiceEntry(note: musicxml.Note): boolean {
    return !note.isChordTail() && !note.isGrace();
  }

  private static createVoiceEntry(note: musicxml.Note, clefType: musicxml.ClefType): VoiceEntry {
    if (note.isChordHead()) {
      return Chord.create({ musicXml: { note }, clefType });
    }
    if (note.isRest()) {
      return Rest.create({ musicXml: { note }, clefType });
    }
    return Note.create({ musicXml: { note }, clefType });
  }

  private entries: VoiceEntry[];
  private timeSignature: musicxml.TimeSignature;

  private constructor(opts: VoiceConstructorOptions) {
    this.entries = opts.entries;
    this.timeSignature = opts.timeSignature;
  }

  toVexflowVoice(): vexflow.Voice {
    const tickables = this.entries.map<vexflow.Tickable>((entry) => {
      if (entry instanceof Note) {
        return entry.toVexflowStaveNote();
      }
      if (entry instanceof Chord) {
        return entry.toVexflowStaveNote();
      }
      if (entry instanceof Rest) {
        return entry.toVexflowStaveNote();
      }
      // If this error is thrown, this is a problem with vexml, not the musicXML document.
      throw new Error(`unexpected voice entry: ${entry}`);
    });

    return new vexflow.Voice({
      num_beats: this.timeSignature.getBeatsPerMeasure(),
      beat_value: this.timeSignature.getBeatValue(),
    })
      .setMode(vexflow.VoiceMode.SOFT)
      .setStrict(false)
      .addTickables(tickables);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  render(opts: VoiceRenderOptions): VoiceRenderResult {
    const vfVoice = this.toVexflowVoice();

    return { vexflow: { voice: vfVoice } };
  }
}
