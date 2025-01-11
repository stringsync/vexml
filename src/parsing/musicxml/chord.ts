import * as data from '@/data';
import * as musicxml from '@/musicxml';
import * as util from '@/util';
import { Note } from './note';
import { VoiceContext } from './contexts';

export class Chord {
  constructor(private notes: Note[]) {}

  static create(measureBeat: util.Fraction, duration: util.Fraction, musicXML: { note: musicxml.Note }): Chord {
    util.assert(musicXML.note.isChordHead(), 'Expected note to be a chord head');
    const notes = [musicXML.note, ...musicXML.note.getChordTail()].map((note) =>
      Note.create(measureBeat, duration, { note })
    );
    return new Chord(notes);
  }

  parse(voiceCtx: VoiceContext): data.Chord {
    const parsed = this.notes.map((note) => note.parse(voiceCtx));

    const notes = parsed.map<data.ChordNote>((note) => ({
      type: 'chordnote',
      accidental: note.accidental,
      curveIds: note.curveIds,
      head: note.head,
      pitch: note.pitch,
    }));

    const annotations = parsed.flatMap((note) => note.annotations);

    const tupletIds = parsed.flatMap((note) => note.tupletIds);

    const graceEntries = parsed.flatMap((note) => note.graceEntries);

    const first = parsed.at(0);
    util.assertDefined(first);

    return {
      type: 'chord',
      notes,
      annotations,
      tupletIds,
      beamId: first.beamId,
      dotCount: first.dotCount,
      duration: first.duration,
      durationType: first.durationType,
      measureBeat: first.measureBeat,
      stemDirection: first.stemDirection,
      graceEntries,
      wedgeId: first.wedgeId,
      pedalMark: first.pedalMark,
      octaveShiftId: first.octaveShiftId,
    };
  }
}
