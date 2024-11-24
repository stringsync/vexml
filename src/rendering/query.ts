/* eslint-disable @typescript-eslint/member-ordering */
import * as util from '@/util';
import { StaveNoteRendering, TabNoteRendering } from './note';
import { StaveChordRendering, TabChordRendering } from './chord';
import { RestRendering } from './rest';
import { MeasureRendering } from './measure';
import { StaveRendering } from './stave';
import { SystemRendering } from './system';
import { PartRendering } from './part';
import { VoiceEntryRendering } from './voice';
import { ScoreRendering } from './score';

export type Predicate<T> = (element: T) => boolean;

export type InteractableRendering =
  | StaveNoteRendering
  | StaveChordRendering
  | TabNoteRendering
  | TabChordRendering
  | RestRendering
  | MeasureRendering
  | StaveRendering;

export type PlayableRendering = Extract<
  InteractableRendering,
  StaveNoteRendering | StaveChordRendering | TabNoteRendering | TabChordRendering | RestRendering
>;

type OnlyOne<T> = NonNullable<
  {
    [K in keyof T]: Record<K, T[K]> & Partial<Record<Exclude<keyof T, K>, never>>;
  }[keyof T]
>;

type Predicates = {
  system?: Predicate<SystemRendering>;
  measure?: Predicate<MeasureRendering>;
  part?: Predicate<PartRendering>;
  stave?: Predicate<StaveRendering>;
  voiceEntry?: Predicate<VoiceEntryRendering>;
};

export class Query {
  private score: ScoreRendering;
  private systemPredicates = new Array<Predicate<SystemRendering>>();
  private measurePredicates = new Array<Predicate<MeasureRendering>>();
  private partPredicates = new Array<Predicate<PartRendering>>();
  private stavePredicates = new Array<Predicate<StaveRendering>>();
  private voiceEntryPredicates = new Array<Predicate<VoiceEntryRendering>>();

  private constructor(score: ScoreRendering) {
    this.score = score;
  }

  static of(score: ScoreRendering) {
    return new Query(score);
  }

  static forPart(partId: string): OnlyOne<Predicates> {
    return { part: (part) => part.id === partId };
  }

  static inSystem(systemIndex: number): OnlyOne<Predicates> {
    return { system: (system) => system.index === systemIndex };
  }

  static isPlayable(value: any): value is PlayableRendering {
    return (
      value.type === 'stavenote' ||
      value.type === 'stavechord' ||
      value.type === 'tabnote' ||
      value.type === 'tabchord' ||
      value.type === 'rest'
    );
  }

  static isInteractable(value: any): value is InteractableRendering {
    return Query.isPlayable(value) || value.type === 'measure' || value.type === 'stave';
  }

  where(predicates: OnlyOne<Predicates>) {
    if (predicates.system) {
      this.systemPredicates.push(predicates.system);
    }
    if (predicates.measure) {
      this.measurePredicates.push(predicates.measure);
    }
    if (predicates.part) {
      this.partPredicates.push(predicates.part);
    }
    if (predicates.stave) {
      this.stavePredicates.push(predicates.stave);
    }
    if (predicates.voiceEntry) {
      this.voiceEntryPredicates.push(predicates.voiceEntry);
    }
    return this;
  }

  @util.memoize()
  getMeasures() {
    return this.score.systems
      .flatMap((system) => system.measures)
      .filter((measure) => this.measurePredicates.every((predicate) => predicate(measure)));
  }

  @util.memoize()
  getStaves() {
    return this.getMeasures()
      .flatMap((measure) => measure.fragments)
      .flatMap((fragment) => fragment.parts)
      .filter((part) => this.partPredicates.every((predicate) => predicate(part)))
      .flatMap((part) => part.staves)
      .filter((stave) => this.stavePredicates.every((predicate) => predicate(stave)));
  }

  @util.memoize()
  getVoices() {
    return this.getStaves()
      .flatMap((stave) => stave.entry)
      .flatMap((staveEntry) => {
        switch (staveEntry.type) {
          case 'chorus':
            return staveEntry.voices;
          default:
            return [];
        }
      });
  }

  @util.memoize()
  getVoiceEntries() {
    return this.getVoices()
      .flatMap((voice) => voice.entries)
      .filter((entry) => this.voiceEntryPredicates.every((predicate) => predicate(entry)));
  }

  getInteractables() {
    return [...this.getVoiceEntries(), ...this.getStaves(), ...this.getMeasures()].filter(Query.isInteractable);
  }

  getPlayables() {
    return this.getInteractables().filter(Query.isPlayable);
  }
}
