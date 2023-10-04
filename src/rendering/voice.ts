import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';
import { Note, NoteRendering } from './note';
import { Chord, ChordRendering } from './chord';
import { Rest, RestRendering } from './rest';
import { Config } from './config';
import { NoteDurationDenominator, StemDirection } from './enums';
import { GhostNote, GhostNoteRendering } from './ghostnote';

/** A component of a Voice. */
export type VoiceEntry = Note | Chord | Rest | GhostNote;

/** The result rendering a VoiceEntry. */
export type VoiceEntryRendering = NoteRendering | ChordRendering | RestRendering | GhostNoteRendering;

/** The result rendering a Voice. */
export type VoiceRendering = {
  type: 'voice';
  vexflow: {
    voice: vexflow.Voice;
  };
  notes: VoiceEntryRendering[];
};

export type VoiceEntryData = {
  voiceId: string;
  note: musicxml.Note;
  stem: StemDirection;
  startDivision: number;
  endDivision: number;
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

  static create(opts: {
    config: Config;
    id: string;
    data: VoiceEntryData[];
    quarterNoteDivisions: number;
    timeSignature: musicxml.TimeSignature;
    clefType: musicxml.ClefType;
  }): Voice {
    const config = opts.config;
    const timeSignature = opts.timeSignature;
    const quarterNoteDivisions = opts.quarterNoteDivisions;
    const clefType = opts.clefType;

    let division = 0;
    const entries = new Array<VoiceEntry>();
    for (const entry of opts.data) {
      const ghostNoteStart = division;
      const ghostNoteEnd = entry.startDivision;
      const ghostNoteDuration = ghostNoteEnd - ghostNoteStart;

      if (ghostNoteDuration > 0) {
        entries.push(Voice.createGhostNote({ duration: ghostNoteDuration, quarterNoteDivisions }));
      }
      entries.push(Voice.createVoiceEntry({ config, clefType, entry, quarterNoteDivisions }));

      division = entry.endDivision;
    }

    return new Voice({
      config,
      timeSignature,
      entries,
    });
  }

  private static createGhostNote(opts: { duration: number; quarterNoteDivisions: number }): GhostNote {
    const duration = opts.duration;
    const quarterNoteDivisions = opts.quarterNoteDivisions;

    const durationDenominator = Voice.calculateDurationDenominator({
      duration,
      quarterNoteDivisions,
    });

    return GhostNote.create({ durationDenominator });
  }

  private static createVoiceEntry(opts: {
    config: Config;
    entry: VoiceEntryData;
    clefType: musicxml.ClefType;
    quarterNoteDivisions: number;
  }): VoiceEntry {
    const config = opts.config;
    const entry = opts.entry;
    const clefType = opts.clefType;
    const quarterNoteDivisions = opts.quarterNoteDivisions;
    const note = entry.note;
    const stem = entry.stem;

    const durationDenominator =
      Voice.toDurationDenominator(note.getType()) ??
      Voice.calculateDurationDenominator({ duration: note.getDuration(), quarterNoteDivisions });

    if (note.isChordHead()) {
      return Chord.create({
        config,
        musicXml: { note },
        stem,
        clefType,
        durationDenominator,
      });
    }

    if (note.isRest()) {
      return Rest.create({
        config,
        musicXml: { note },
        clefType,
        durationDenominator,
      });
    }

    return Note.create({
      config,
      musicXml: { note },
      stem,
      clefType,
      durationDenominator,
    });
  }

  private static toDurationDenominator(noteType: musicxml.NoteType | null): NoteDurationDenominator | null {
    switch (noteType) {
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
      default:
        return null;
    }
  }

  private static calculateDurationDenominator(opts: {
    duration: number;
    quarterNoteDivisions: number;
  }): NoteDurationDenominator {
    // Sometimes the <type> of the <note> is omitted. If that's the case, infer the duration denominator from the
    // <duration>.
    switch (opts.duration / opts.quarterNoteDivisions) {
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
        if (entry instanceof GhostNote) {
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
      if (entry instanceof GhostNote) {
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
        case 'ghostnote':
          return voiceEntryRendering.vexflow.ghostNote;
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
