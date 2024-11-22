import { StaveChordRendering, TabChordRendering } from '../rendering/chord';
import { StaveNoteRendering, TabNoteRendering } from '../rendering/note';
import { RestRendering } from '../rendering/rest';
import { ScoreRendering } from '../rendering/score';

export type SequenceEntry =
  | StaveNoteRendering
  | StaveChordRendering
  | TabNoteRendering
  | TabChordRendering
  | RestRendering;

export type SequenceEntryIteration = {
  entry: SequenceEntry;
  // TODO: Add repeat and multiple ending information.
};

/** Iterates over the playable elements in a score, accounting for repeats and multiple endings. */
export class SequenceEntryIterator {
  private sequenceEntries: SequenceEntry[];

  private constructor(sequenceEntries: SequenceEntry[]) {
    this.sequenceEntries = sequenceEntries;
  }

  /** Creates a VoiceEntryIterator from a score. */
  static create(partId: string, score: ScoreRendering) {
    // TODO: Support rests and multiple endings.
    const sequenceEntries = score.systems
      .flatMap((system) => system.measures)
      .flatMap((measure) => measure.fragments)
      .flatMap((fragment) => fragment.parts)
      .filter((part) => part.id === partId)
      .flatMap((part) => part.staves)
      .flatMap((stave) => stave.entry)
      .flatMap((staveEntry) => {
        switch (staveEntry.type) {
          case 'chorus':
            return staveEntry.voices;
          default:
            return [];
        }
      })
      .flatMap((voice) => voice.entries)
      .filter((entry): entry is SequenceEntry => {
        return (
          entry.type === 'stavenote' ||
          entry.type === 'stavechord' ||
          entry.type === 'tabnote' ||
          entry.type === 'tabchord' ||
          entry.type === 'rest'
        );
      });

    return new SequenceEntryIterator(sequenceEntries);
  }

  [Symbol.iterator](): Iterator<SequenceEntryIteration> {
    let index = 0;

    return {
      next: () => {
        if (index >= this.sequenceEntries.length) {
          return { done: true, value: null };
        } else {
          return { done: false, value: { entry: this.sequenceEntries[index++] } };
        }
      },
    };
  }
}
