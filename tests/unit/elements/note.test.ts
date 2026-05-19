import * as data from '@/data';
import * as rendering from '@/rendering';
import { Note } from '@/elements';
import { DEFAULT_CONFIG } from '@/config';
import { NoopLogger } from '@/debug';

const CONFIG = DEFAULT_CONFIG;
const LOG = new NoopLogger();

function tabPosition(partial: Partial<data.TabPosition> = {}): data.TabPosition {
  return { type: 'tabposition', fret: '0', string: 1, harmonic: false, ...partial };
}

/** Builds a Note element backed by a stubbed rendering.Document and NoteRender. */
function createNote(subtype: 'note' | 'chord', entry: Partial<data.Note> | Partial<data.Chord>): Note {
  const key = { systemIndex: 0 } as rendering.NoteRender['key'];
  const noteRender = { type: 'note', subtype, key } as rendering.NoteRender;
  const document = {
    getNote: () => entry as data.Note,
    getChord: () => entry as data.Chord,
  } as unknown as rendering.Document;
  return Note.create(CONFIG, LOG, document, noteRender);
}

describe(Note, () => {
  describe('getTabPositions', () => {
    it('returns the tab positions of a single note', () => {
      const note = createNote('note', {
        tabPositions: [tabPosition({ fret: '3', string: 2, harmonic: false })],
      });

      expect(note.getTabPositions()).toEqual([{ fret: '3', string: 2, harmonic: false }]);
    });

    it('preserves the harmonic flag', () => {
      const note = createNote('note', {
        tabPositions: [tabPosition({ fret: '12', string: 1, harmonic: true })],
      });

      expect(note.getTabPositions()).toEqual([{ fret: '12', string: 1, harmonic: true }]);
    });

    it('returns an empty array when the note has no tab positions', () => {
      const note = createNote('note', { tabPositions: [] });

      expect(note.getTabPositions()).toEqual([]);
    });

    it('flattens tab positions across all notes in a chord', () => {
      const note = createNote('chord', {
        notes: [
          { tabPositions: [tabPosition({ fret: '5', string: 4 })] },
          { tabPositions: [tabPosition({ fret: '7', string: 3 })] },
        ] as data.Chord['notes'],
      });

      expect(note.getTabPositions()).toEqual([
        { fret: '5', string: 4, harmonic: false },
        { fret: '7', string: 3, harmonic: false },
      ]);
    });

    it('does not leak the data-layer tabposition type discriminant', () => {
      const note = createNote('note', {
        tabPositions: [tabPosition({ fret: '3', string: 2 })],
      });

      expect(note.getTabPositions()[0]).not.toHaveProperty('type');
    });
  });
});
