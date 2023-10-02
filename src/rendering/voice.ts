import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';
import { Note, NoteRendering } from './note';
import { Chord, ChordRendering } from './chord';
import { Rest, RestRendering } from './rest';
import { Config } from './config';
import { NoteDurationDenominator } from './enums';

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

/** An intermediate data structure that facilitates the calculation of what notes belong to what voices. */
type VoiceNote = {
  /** Which voice the note belongs to. */
  voice: string;

  /** The note of the voice. */
  note: musicxml.Note;

  /** The _accumulated_ duration within the measure. */
  duration: number;
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

  /** Creates all the Voices derived from the Measure. */
  static createMulti(opts: {
    config: Config;
    musicXml: {
      measure: musicxml.Measure;
    };
    staffNumber: number;
    clefType: musicxml.ClefType;
  }): Voice[] {
    const quarterNoteDivisions =
      opts.musicXml.measure.getAttributes().flatMap((attribute) => attribute.getQuarterNoteDivisions())[0] ?? 1;

    const entries = opts.musicXml.measure
      .getNotes()
      .filter((note) => note.getStaffNumber() === opts.staffNumber)
      .filter(Voice.canCreateVoiceEntry)
      .map((note) =>
        Voice.createVoiceEntry({
          config: opts.config,
          note,
          quarterNoteDivisions,
          clefType: opts.clefType,
        })
      );

    const timeSignature =
      opts.musicXml.measure
        .getAttributes()
        .flatMap((attributes) => attributes.getTimes())
        .find((time) => time.getStaffNumber() === opts.staffNumber)
        ?.getTimeSignatures()[0] ?? new musicxml.TimeSignature(4, 4);

    // TODO(jared): Iterate through the measure entries and derive the voice entries (and the voices they belong to)
    // into separate voice elements. You can use ghost notes in case the second voice doesn't start at the beginning
    // of the measure. I think a state machine could work in two stages: create a mapping of voice -> duration ->
    // voice entry, then a separate process to figure out how to fill duration gaps into ghost notes. Don't assume
    // that voice 1 will always be the "anchor" voice.

    const voiceEventMachine = new VoiceEventStateMachine();
    for (const measureEntry of opts.musicXml.measure.getEntries()) {
      voiceEventMachine.process(measureEntry);
    }

    return [new Voice({ config: opts.config, entries, timeSignature })];
  }

  private static canCreateVoiceEntry(note: musicxml.Note): boolean {
    return !note.isChordTail() && !note.isGrace();
  }

  private static createVoiceEntry(opts: {
    config: Config;
    note: musicxml.Note;
    clefType: musicxml.ClefType;
    quarterNoteDivisions: number;
  }): VoiceEntry {
    const note = opts.note;
    const config = opts.config;
    const clefType = opts.clefType;
    const quarterNoteDivisions = opts.quarterNoteDivisions;
    const durationDenominator = Voice.getDurationDenominator(note, quarterNoteDivisions);

    if (note.isChordHead()) {
      return Chord.create({ config, musicXml: { note }, clefType, durationDenominator });
    }
    if (note.isRest()) {
      return Rest.create({ config, musicXml: { note }, clefType, durationDenominator });
    }
    return Note.create({ config, musicXml: { note }, clefType, durationDenominator });
  }

  private static getDurationDenominator(note: musicxml.Note, quarterNoteDivisions: number): NoteDurationDenominator {
    switch (note.getType()) {
      case '1024th':
        return '1024';
      case '512th':
        return '512';
      case '256th':
        return '256';
      case '128th':
        return '128';
      case '64th':
        return '64';
      case '32nd':
        return '32';
      case '16th':
        return '16';
      case 'eighth':
        return '8';
      case 'quarter':
        return '4';
      case 'half':
        return '2';
      case 'whole':
        return '1';
      case 'breve':
        return '1/2';
      case 'long':
        // VexFlow bug: should be '1/4' but it is not supported
        // return '1/4';
        return '1/2';
    }

    // Sometimes the <type> of the <note> is omitted. If that's the case, infer the duration denominator from the
    // <duration>.
    const duration = note.getDuration();

    switch (duration / quarterNoteDivisions) {
      case 4:
        return '1';
      case 2:
        return '2';
      case 1:
        return '4';
      case 1 / 2:
        return '8';
      case 1 / 8:
        return '32';
      case 1 / 16:
        return '64';
      case 1 / 32:
        return '128';
      case 1 / 64:
        return '256';
      case 1 / 128:
        return '512';
      case 1 / 256:
        return '1024';
    }

    return '';
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
        return entry.render({ voiceEntryCount: this.entries.length });
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
      numBeats: this.timeSignature.getBeatsPerMeasure(),
      beatValue: this.timeSignature.getBeatValue(),
    })
      .setMode(vexflow.VoiceMode.SOFT)
      .setStrict(false)
      .addTickables(vfTickables);
  }
}

/** An intermediate data structure that facilitates the calculation of what notes belong to what voices. */
type VoiceEvent = {
  voice: string;
  note: musicxml.Note;
  at: number;
};

/** A factory that transforms musicxml.MeasureEntry[] to sorted VoiceEvent[]. */
class VoiceEventStateMachine {
  private voiceEvents = new Array<VoiceEvent>();
  private beat = 0;

  process(measureEntry: musicxml.MeasureEntry): void {
    if (measureEntry instanceof musicxml.Note) {
      this.onNote(measureEntry);
    }
    if (measureEntry instanceof musicxml.Backup) {
      this.onBackup(measureEntry);
    }
    if (measureEntry instanceof musicxml.Forward) {
      this.onForward(measureEntry);
    }
  }

  /** Returns the voice events. */
  getVoiceEvents(): VoiceEvent[] {
    return this.voiceEvents;
  }

  private onNote(note: musicxml.Note): void {
    // TODO: Attach grace notes correctly.
    if (note.isGrace()) {
      return;
    }
    if (note.isChordTail()) {
      return;
    }

    this.voiceEvents.push({
      voice: note.getVoice(),
      at: this.beat,
      note: note,
    });

    this.beat += note.getDuration();
  }

  private onBackup(backup: musicxml.Backup): void {
    this.beat -= backup.getDuration();
  }

  private onForward(forward: musicxml.Forward): void {
    this.beat += forward.getDuration();
  }
}
