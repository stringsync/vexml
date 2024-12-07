import { GraceNoteRendering, StaveNoteRendering, TabGraceNoteRendering, TabNoteRendering } from './note';
import { GraceChordRendering, StaveChordRendering, TabChordRendering, TabGraceChordRendering } from './chord';
import { RestRendering } from './rest';
import { MeasureRendering } from './measure';
import { StaveRendering } from './stave';
import { SystemRendering } from './system';
import { PartRendering } from './part';
import { VoiceEntryRendering, VoiceRendering } from './voice';
import { ScoreRendering } from './score';
import { GhostNoteRendering } from './ghostnote';
import { MeasureFragmentRendering } from './measurefragment';

export type FilterableRendering = SystemRendering | PartRendering | VoiceRendering;

export type SelectableRendering =
  | SystemRendering
  | MeasureRendering
  | StaveRendering
  | StaveNoteRendering
  | StaveChordRendering
  | GraceNoteRendering
  | GraceChordRendering
  | TabNoteRendering
  | TabChordRendering
  | TabGraceNoteRendering
  | TabGraceChordRendering
  | RestRendering
  | GhostNoteRendering
  | VoiceRendering;

type FilterableRenderingType = FilterableRendering['type'];
export type FilterableRenderingWithType<T extends FilterableRenderingType> = Extract<FilterableRendering, { type: T }>;

type SelectableRenderingType = SelectableRendering['type'];
export type SelectableRenderingWithType<T extends SelectableRenderingType> = Extract<SelectableRendering, { type: T }>;

type Predicate<T = any> = (value: T) => boolean;

type OnlyOne<T> = {
  [K in keyof T]: { [P in K]: T[K] } & Partial<Record<Exclude<keyof T, K>, never>>;
}[keyof T];

type WhereArg = OnlyOne<{
  [K in FilterableRenderingType]: Predicate<FilterableRenderingWithType<K>>;
}>;

/**
 * A function that returns the measure indexes (not measure numbers) that the measures should be traversed. Indexes can
 * appear multiple times, which is common for repeats.
 */
export type MeasureSequence = (measures: MeasureRendering[]) => Iterable<number>;

export class Query {
  private score: ScoreRendering;
  private predicates = new Array<Predicate>();
  private measureSequence: MeasureSequence | null = null;

  private constructor(score: ScoreRendering) {
    this.score = score;
  }

  static of(score: ScoreRendering) {
    return new Query(score);
  }

  /** Creates a new query that filters based on the argument. */
  where(arg: WhereArg): Query {
    const query = this.clone();
    const predicates = [...this.predicates];

    for (const [type, predicate] of Object.entries(arg)) {
      // This HoF ensures that the predicate is only applied to the scoped type. Otherwise, it's ignored.
      predicates.push((value) => value.type !== type || predicate(value));
    }

    query.predicates = predicates;
    return query;
  }

  withMeasureSequence(measureSequence: MeasureSequence): Query {
    const query = this.clone();
    query.measureSequence = measureSequence;
    return query;
  }

  /** Selects the renderings that match the specified types. */
  select<T extends SelectableRenderingType>(...types: T[]): Array<SelectableRenderingWithType<T>> {
    const selection = new Selection<T>(types);
    this.walkScore(this.score, selection);
    return selection.results;
  }

  private clone(): Query {
    const query = new Query(this.score);
    query.predicates = [...this.predicates];
    query.measureSequence = this.measureSequence;
    return query;
  }

  private isInScope(value: any) {
    return this.predicates.every((predicate) => predicate(value));
  }

  private walkScore<T extends SelectableRenderingType>(score: ScoreRendering, selection: Selection<T>) {
    let measures = score.systems.flatMap((system) => system.measures);

    measures = this.measureSequence
      ? Array.from(this.measureSequence(measures)).map((index) => measures[index])
      : measures;

    let currentSystemIndex = -1;
    for (const measure of measures) {
      const systemIndex = measure.address.getSystemIndex()!;
      const didSystemChange = systemIndex !== currentSystemIndex;
      currentSystemIndex = systemIndex;
      const system = score.systems[currentSystemIndex];
      if (this.isInScope(system)) {
        if (didSystemChange) {
          selection.process(system);
        }
        this.walkMeasure(measure, selection);
      }
    }
  }

  private walkMeasure<T extends SelectableRenderingType>(measure: MeasureRendering, selection: Selection<T>) {
    if (!this.isInScope(measure)) {
      return;
    }

    selection.process(measure);

    for (const measureFragment of measure.fragments) {
      this.walkMeasureFragment(measureFragment, selection);
    }
  }

  private walkMeasureFragment<T extends SelectableRenderingType>(
    measureFragment: MeasureFragmentRendering,
    selection: Selection<T>
  ) {
    if (!this.isInScope(measureFragment)) {
      return;
    }

    selection.process(measureFragment);

    for (const part of measureFragment.parts) {
      this.walkPart(part, selection);
    }
  }

  private walkPart<T extends SelectableRenderingType>(part: PartRendering, selection: Selection<T>) {
    if (!this.isInScope(part)) {
      return;
    }

    selection.process(part);

    for (const stave of part.staves) {
      this.walkStave(stave, selection);
    }
  }

  private walkStave<T extends SelectableRenderingType>(stave: StaveRendering, selection: Selection<T>) {
    if (!this.isInScope(stave)) {
      return;
    }

    selection.process(stave);

    if (stave.entry.type !== 'chorus') {
      return;
    }

    for (const voice of stave.entry.voices) {
      this.walkVoice(voice, selection);
    }
  }

  private walkVoice<T extends SelectableRenderingType>(voice: VoiceRendering, selection: Selection<T>) {
    if (!this.isInScope(voice)) {
      return;
    }

    selection.process(voice);

    for (const voiceEntry of voice.entries) {
      this.walkVoiceEntry(voiceEntry, selection);
    }
  }

  private walkVoiceEntry<T extends SelectableRenderingType>(voiceEntry: VoiceEntryRendering, selection: Selection<T>) {
    if (this.predicates.every((predicate) => predicate(voiceEntry))) {
      selection.process(voiceEntry);
    }
  }
}

/** Helper class that facilitates type casting and rendering selection. */
class Selection<T extends SelectableRenderingType> {
  public readonly results = new Array<SelectableRenderingWithType<T>>();
  private types: Array<SelectableRenderingType>;

  constructor(types: Array<SelectableRenderingType>) {
    this.types = types;
  }

  /** Conditionally adds the rendering to the results. */
  process(rendering: { type: string }) {
    if (this.isSelected(rendering)) {
      this.results.push(rendering);
    }
  }

  private isSelected(value: any): value is SelectableRenderingWithType<T> {
    return this.types.includes(value.type);
  }
}

function forSystem(systemIndex: number): WhereArg {
  return { system: (system: SystemRendering) => system.index === systemIndex };
}

function forPart(partId: string): WhereArg {
  return { part: (part: PartRendering) => part.id === partId };
}

function forVoice(voiceId: string): WhereArg {
  return { voice: (voice: VoiceRendering) => voice.id === voiceId };
}

export const filters = {
  forSystem,
  forPart,
  forVoice,
};
