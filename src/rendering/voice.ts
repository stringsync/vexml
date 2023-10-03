import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';
import * as util from '@/util';
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

type NoteData = {
  type: 'note';
  voice: string;
  note: musicxml.Note;
  start: number;
  end: number;
  stem: StemDirection;
};

type GhostNoteData = {
  type: 'ghost';
  voice: string;
  start: number;
  end: number;
};

type VoiceEntryData = NoteData | GhostNoteData;

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
    const clefType = opts.clefType;
    const config = opts.config;

    const timeSignature =
      opts.musicXml.measure
        .getAttributes()
        .flatMap((attributes) => attributes.getTimes())
        .find((time) => time.getStaffNumber() === opts.staffNumber)
        ?.getTimeSignatures()[0] ?? new musicxml.TimeSignature(4, 4);

    const factory = new VoiceEntryDataFactory();
    opts.musicXml.measure
      .getEntries()
      .filter(
        (measureEntry) =>
          (measureEntry instanceof musicxml.Note && measureEntry.getStaffNumber() === opts.staffNumber) ||
          measureEntry instanceof musicxml.Forward ||
          measureEntry instanceof musicxml.Backup
      )
      .forEach((measureEntry) => {
        factory.add(measureEntry);
      });

    return factory.createVoiceEntryData().map(
      (entries) =>
        new Voice({
          config: opts.config,
          timeSignature,
          entries: entries.map((entry) =>
            this.createVoiceEntry({
              config,
              clefType,
              entry,
              quarterNoteDivisions,
            })
          ),
        })
    );
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

    if (entry.type === 'ghost') {
      return GhostNote.create({
        durationDenominator: Voice.getDurationDenominator({
          duration: entry.end - entry.start,
          quarterNoteDivisions,
        }),
      });
    }

    const note = entry.note;
    const stem = entry.stem;
    const durationDenominator = Voice.getDurationDenominator({
      noteType: note.getType(),
      duration: note.getDuration(),
      quarterNoteDivisions,
    });

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

  private static getDurationDenominator(opts: {
    noteType?: musicxml.NoteType | null;
    duration: number;
    quarterNoteDivisions: number;
  }): NoteDurationDenominator {
    switch (opts.noteType) {
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

/** A state machine that takes musicxml.MeasureEntry[] as events to produce VoiceEntry[][]. */
class VoiceEntryDataFactory {
  private data: { [voice: string]: VoiceEntryData[] } = {};
  private divisions: number = 0;

  /** Adds a measure entry to the data. */
  add(measureEntry: musicxml.MeasureEntry): void {
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

  /** Creates the voice entry groups based on the data provided. */
  createVoiceEntryData(): VoiceEntryData[][] {
    // NOTE: Copy the data and copy its values so we can mutate entries without affecting the original.
    const data = Object.entries(this.data).reduce<{ [voice: string]: VoiceEntryData[] }>((data, [key, value]) => {
      data[key] = value.map((v) => ({ ...v }));
      return data;
    }, {});

    const voices = Object.keys(data);

    // Return note data that corresponds to audible notes. This is useful in this context because we don't want to
    // account for rests when determining stems.
    const isNonRestNoteData = (entry: VoiceEntryData): entry is NoteData =>
      entry.type === 'note' && !entry.note.isRest();

    // Get the first non-rest note data.
    const notes = new Array<NoteData>();
    for (const voice of voices) {
      const note = data[voice].find(isNonRestNoteData);
      if (note) {
        notes.push(note);
      }
    }

    // Sort the notes by descending line based on the entry's highest note. This allows us to figure out which voice
    // should be on top, middle, and bottom easier.
    util.sortBy(notes, (entry) => -this.toStaveNoteLine(entry.note));

    if (notes.length > 1) {
      const stems: { [voice: string]: StemDirection } = {};

      const top = util.first(notes)!;
      const middle = notes.slice(1, -1);
      const bottom = util.last(notes)!;

      stems[top.voice] = 'up';
      stems[bottom.voice] = 'down';
      for (const note of middle) {
        stems[note.voice] = 'none';
      }

      const setStem = (stem: StemDirection, notes: NoteData[]): void =>
        notes
          // Only change stems that haven't been explicitly specified.
          .filter((note) => note.stem === 'auto')
          .forEach((note) => {
            note.stem = stem;
          });

      for (const voice of voices) {
        setStem(stems[voice], data[voice].filter(isNonRestNoteData));
      }
    }

    return Object.values(data);
  }

  private onNote(note: musicxml.Note): void {
    // TODO: Attach grace notes correctly.
    if (note.isGrace()) {
      return;
    }

    if (note.isChordTail()) {
      return;
    }

    const voice = note.getVoice();
    this.data[voice] ??= [];

    const ghostNoteStart = util.last(this.data[voice])?.end ?? 0;
    const ghostNoteEnd = this.divisions;
    const ghostNoteDuration = ghostNoteEnd - ghostNoteStart;

    if (ghostNoteDuration > 0) {
      this.data[voice].push({
        type: 'ghost',
        voice,
        start: ghostNoteStart,
        end: ghostNoteEnd,
      });
    }

    const noteDuration = note.getDuration();
    const noteStart = this.divisions;
    const noteEnd = noteStart + noteDuration;

    this.data[voice].push({
      type: 'note',
      voice,
      note,
      start: noteStart,
      end: noteEnd,
      stem: this.getStem(note),
    });

    this.divisions += noteDuration;
  }

  private onBackup(backup: musicxml.Backup): void {
    this.divisions -= backup.getDuration();
  }

  private onForward(forward: musicxml.Forward): void {
    this.divisions += forward.getDuration();
  }

  private getStem(note: musicxml.Note): StemDirection {
    switch (note.getStem()) {
      case 'up':
        return 'up';
      case 'down':
        return 'down';
      case 'none':
        return 'none';
      default:
        return 'auto';
    }
  }

  private toStaveNoteLine(note: musicxml.Note): number {
    return new vexflow.StaveNote({
      duration: '4',
      keys: [note, ...note.getChordTail()].map((note) => {
        let key = note.getPitch();

        const suffix = note.getNoteheadSuffix();
        if (suffix) {
          key += `/${suffix}`;
        }

        return key;
      }),
    }).getKeyLine(0);
  }
}
