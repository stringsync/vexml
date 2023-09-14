import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';
import { Note, NoteRendering } from './note';
import { Chord, ChordRendering } from './chord';
import { Rest, RestRendering } from './rest';

export type VoiceEntry = Note | Chord | Rest;

export type VoiceEntryRendering = NoteRendering | ChordRendering | RestRendering;

export type VoiceRendering = {
  type: 'voice';
  vexflow: {
    voice: vexflow.Voice;
  };
  notes: VoiceEntryRendering[];
};

export class Voice {
  private entries: VoiceEntry[];
  private timeSignature: musicxml.TimeSignature;

  private constructor(opts: { entries: VoiceEntry[]; timeSignature: musicxml.TimeSignature }) {
    this.entries = opts.entries;
    this.timeSignature = opts.timeSignature;
  }

  static create(opts: {
    musicXml: {
      measure: musicxml.Measure;
    };
    staffNumber: number;
    clefType: musicxml.ClefType;
  }): Voice {
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

  clone(): Voice {
    return new Voice({
      entries: this.entries.map((entry) => {
        if (entry instanceof Note) {
          return entry.clone();
        }
        if (entry instanceof Chord) {
          return entry.clone();
        }
        if (entry instanceof Rest) {
          return entry.clone();
        }
        // If this error is thrown, this is a problem with vexml, not the musicXML document.
        throw new Error(`unexpected voice entry: ${entry}`);
      }),
      timeSignature: this.timeSignature.clone(),
    });
  }

  render(): VoiceRendering {
    const voiceEntryRenderings = this.entries.map<VoiceEntryRendering>((entry) => {
      if (entry instanceof Note) {
        return entry.render();
      }
      if (entry instanceof Chord) {
        return entry.render();
      }
      if (entry instanceof Rest) {
        return entry.render();
      }
      // If this error is thrown, this is a problem with vexml, not the musicXML document.
      throw new Error(`unexpected voice entry: ${entry}`);
    });

    const vfTickables = voiceEntryRenderings.map((voiceEntryRendering) => voiceEntryRendering.vexflow.staveNote);

    const vfVoice = this.toVexflowVoice(vfTickables);

    return {
      type: 'voice',
      vexflow: { voice: vfVoice },
      notes: voiceEntryRenderings,
    };
  }

  private toVexflowVoice(vfTickables: vexflow.Tickable[]): vexflow.Voice {
    return new vexflow.Voice({
      num_beats: this.timeSignature.getBeatsPerMeasure(),
      beat_value: this.timeSignature.getBeatValue(),
    })
      .setMode(vexflow.VoiceMode.SOFT)
      .setStrict(false)
      .addTickables(vfTickables);
  }
}
