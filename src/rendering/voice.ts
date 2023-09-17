import * as musicxml from '@/musicxml';
import * as vexflow from 'vxflw-early-access';
import { Note, NoteRendering } from './note';
import { Chord, ChordRendering } from './chord';
import { Rest, RestRendering } from './rest';
import { Config } from './config';

/** A component of a Voice. */
export type VoiceEntry = Note | Chord | Rest;

/** The result rendering a VoiceEntry. */
export type VoiceEntryRendering = NoteRendering | ChordRendering | RestRendering;

/** The result rendering a Voice. */
export type VoiceRendering = {
  type: 'voice';
  vexflow: {
    voice: vexflow.Voice;
  };
  notes: VoiceEntryRendering[];
};

/**
 * Represents a musical voice within a stave, containing a distinct sequence of notes, rests, and other musical symbols.
 *
 * In Western musical notation, a voice is a particular series of musical events perceived as a single uninterrupted
 * stream. Especially in polyphonic settings, where multiple voices might exist simultaneously on a single stave, the
 * `Voice` class enables the separation and distinct representation of each of these melodic lines.
 */
export class Voice {
  private config: Config;
  private entries: VoiceEntry[];
  private timeSignature: musicxml.TimeSignature;

  private constructor(opts: { config: Config; entries: VoiceEntry[]; timeSignature: musicxml.TimeSignature }) {
    this.config = opts.config;
    this.entries = opts.entries;
    this.timeSignature = opts.timeSignature;
  }

  /** Create a Voice. */
  static create(opts: {
    config: Config;
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
      .map((note) => Voice.createVoiceEntry(opts.config, note, opts.clefType));

    const timeSignature =
      opts.musicXml.measure
        .getAttributes()
        .flatMap((attributes) => attributes.getTimes())
        .find((time) => time.getStaffNumber() === opts.staffNumber)
        ?.getTimeSignatures()[0] ?? new musicxml.TimeSignature(4, 4);

    return new Voice({ config: opts.config, entries, timeSignature });
  }

  private static canCreateVoiceEntry(note: musicxml.Note): boolean {
    return !note.isChordTail() && !note.isGrace();
  }

  private static createVoiceEntry(config: Config, note: musicxml.Note, clefType: musicxml.ClefType): VoiceEntry {
    if (note.isChordHead()) {
      return Chord.create({ config, musicXml: { note }, clefType });
    }
    if (note.isRest()) {
      return Rest.create({ config, musicXml: { note }, clefType });
    }
    return Note.create({ config, musicXml: { note }, clefType });
  }

  /** Clones the Voice. */
  clone(): Voice {
    return new Voice({
      config: this.config,
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

  /** Renders the Voice. */
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

    const vfTickables = voiceEntryRenderings.map((voiceEntryRendering) => {
      switch (voiceEntryRendering.type) {
        case 'note':
          return voiceEntryRendering.vexflow.staveNote;
        case 'chord':
          return voiceEntryRendering.notes[0].vexflow.staveNote;
        case 'rest':
          return voiceEntryRendering.vexflow.staveNote;
        default:
          throw new Error(`unexpected voice entry rendering: ${voiceEntryRendering}`);
      }
    });

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
