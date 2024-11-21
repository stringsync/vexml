import { StaveChordRendering, TabChordRendering } from './chord';
import { StaveNoteRendering, TabNoteRendering } from './note';
import { RestRendering } from './rest';
import { ScoreRendering } from './score';

export type VoiceEntry =
  | StaveNoteRendering
  | StaveChordRendering
  | TabNoteRendering
  | TabChordRendering
  | RestRendering;

export type VoiceEntryIteration = {
  entry: VoiceEntry;
};

/** Iterates over the voice entries, accounting for repeats and multiple endings. */
export class VoiceEntryIterator {
  private voiceEntries: VoiceEntry[];

  private constructor(voiceEntries: VoiceEntry[]) {
    this.voiceEntries = voiceEntries;
  }

  /** Creates a VoiceEntryIterator from a score. */
  static create(partId: string, score: ScoreRendering) {
    // TODO: Support rests and multiple endings.
    const voiceEntries = score.systems
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
      .filter((entry): entry is VoiceEntry => {
        return (
          entry.type === 'stavenote' ||
          entry.type === 'stavechord' ||
          entry.type === 'tabnote' ||
          entry.type === 'tabchord' ||
          entry.type === 'rest'
        );
      });

    return new VoiceEntryIterator(voiceEntries);
  }

  [Symbol.iterator](): Iterator<VoiceEntryIteration> {
    let index = 0;

    return {
      next: () => {
        if (index >= this.voiceEntries.length) {
          return { done: true, value: null };
        } else {
          return { done: false, value: { entry: this.voiceEntries[index++] } };
        }
      },
    };
  }
}
