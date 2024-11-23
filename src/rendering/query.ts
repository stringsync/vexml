import * as rendering from '@/rendering';
import * as util from '@/util';

export type Predicate<T> = (element: T) => boolean;

export type Interactable =
  | rendering.StaveNoteRendering
  | rendering.StaveChordRendering
  | rendering.TabNoteRendering
  | rendering.TabChordRendering
  | rendering.RestRendering
  | rendering.MeasureRendering;

export type Playable = Extract<
  Interactable,
  | rendering.StaveNoteRendering
  | rendering.StaveChordRendering
  | rendering.TabNoteRendering
  | rendering.TabChordRendering
  | rendering.RestRendering
>;

type OnlyOne<T> = NonNullable<
  {
    [K in keyof T]: Record<K, T[K]> & Partial<Record<Exclude<keyof T, K>, never>>;
  }[keyof T]
>;

type Predicates = {
  system?: Predicate<rendering.SystemRendering>;
  measure?: Predicate<rendering.MeasureRendering>;
  part?: Predicate<rendering.PartRendering>;
  stave?: Predicate<rendering.StaveRendering>;
  voiceEntry?: Predicate<rendering.VoiceEntryRendering>;
};

type Selection = {
  interactable: Interactable;
  playable: Playable;
};

export class Query {
  private score: rendering.ScoreRendering;
  private systemPredicates = new Array<Predicate<rendering.SystemRendering>>();
  private measurePredicates = new Array<Predicate<rendering.MeasureRendering>>();
  private partPredicates = new Array<Predicate<rendering.PartRendering>>();
  private stavePredicates = new Array<Predicate<rendering.StaveRendering>>();
  private voiceEntryPredicates = new Array<Predicate<rendering.VoiceEntryRendering>>();

  private constructor(score: rendering.ScoreRendering) {
    this.score = score;
  }

  static of(score: rendering.ScoreRendering) {
    return new Query(score);
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

  select<T extends keyof Selection>(selection: T): Array<Selection[T]> {
    switch (selection) {
      case 'interactable':
        return this.getInteractables() as Array<Selection[T]>;
      case 'playable':
        return this.getPlayables() as Array<Selection[T]>;
      default:
        throw new Error(`invalid query selection: '${selection}'`);
    }
  }

  @util.memoize()
  private getMeasures() {
    return this.score.systems
      .flatMap((system) => system.measures)
      .filter((measure) => this.measurePredicates.every((predicate) => predicate(measure)));
  }

  @util.memoize()
  private getVoiceEntries() {
    return this.getMeasures()
      .flatMap((measure) => measure.fragments)
      .flatMap((fragment) => fragment.parts)
      .filter((part) => this.partPredicates.every((predicate) => predicate(part)))
      .flatMap((part) => part.staves)
      .filter((stave) => this.stavePredicates.every((predicate) => predicate(stave)))
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
      .filter((entry) => this.voiceEntryPredicates.every((predicate) => predicate(entry)));
  }

  private getInteractables() {
    return [...this.getVoiceEntries(), ...this.getMeasures()].filter(
      (element): element is Interactable =>
        element.type === 'stavenote' ||
        element.type === 'stavechord' ||
        element.type === 'tabnote' ||
        element.type === 'tabchord' ||
        element.type === 'rest' ||
        element.type === 'measure'
    );
  }

  private getPlayables() {
    return this.getInteractables().filter(
      (element): element is Playable =>
        element.type === 'stavenote' ||
        element.type === 'stavechord' ||
        element.type === 'tabnote' ||
        element.type === 'tabchord' ||
        element.type === 'rest'
    );
  }
}
