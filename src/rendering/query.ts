import { GraceNoteRendering, StaveNoteRendering, TabGraceNoteRendering, TabNoteRendering } from './note';
import { GraceChordRendering, StaveChordRendering, TabChordRendering, TabGraceChordRendering } from './chord';
import { RestRendering } from './rest';
import { MeasureRendering } from './measure';
import { StaveRendering } from './stave';
import { SystemRendering } from './system';
import { PartRendering } from './part';
import { VoiceRendering } from './voice';
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

export class Query {
  private score: ScoreRendering;
  private predicates = new Array<Predicate>();

  private constructor(score: ScoreRendering) {
    this.score = score;
  }

  static of(score: ScoreRendering) {
    return new Query(score);
  }

  /** Creates a new query that filters based on the argument. */
  where(arg: WhereArg): Query {
    const query = new Query(this.score);
    const predicates = [...this.predicates];

    for (const [type, predicate] of Object.entries(arg)) {
      // This HoF ensures that the predicate is only applied to the scoped type. Otherwise, it's ignored.
      predicates.push((value) => value.type !== type || predicate(value));
    }

    query.predicates = predicates;
    return query;
  }

  select<T extends SelectableRenderingType>(...types: T[]): Array<SelectableRenderingWithType<T>> {
    const selection = new Selection<T>(types);
    this.walkSystems(this.score, selection);
    return selection.results;
  }

  private isInScope(value: any) {
    return this.predicates.every((predicate) => predicate(value));
  }

  private walkSystems<T extends SelectableRenderingType>(score: ScoreRendering, selection: Selection<T>) {
    for (const system of score.systems) {
      if (this.isInScope(system)) {
        selection.process(system);
        this.walkMeasures(system, selection);
      }
    }
  }

  private walkMeasures<T extends SelectableRenderingType>(system: SystemRendering, selection: Selection<T>) {
    for (const measure of system.measures) {
      if (this.isInScope(measure)) {
        selection.process(measure);
        this.walkMeasureFragments(measure, selection);
      }
    }
  }

  private walkMeasureFragments<T extends SelectableRenderingType>(measure: MeasureRendering, selection: Selection<T>) {
    for (const measureFragment of measure.fragments) {
      if (this.isInScope(measureFragment)) {
        selection.process(measureFragment);
        this.walkParts(measureFragment, selection);
      }
    }
  }

  private walkParts<T extends SelectableRenderingType>(
    measureFragment: MeasureFragmentRendering,
    selection: Selection<T>
  ) {
    for (const part of measureFragment.parts) {
      if (this.isInScope(part)) {
        selection.process(part);
        this.walkStaves(part, selection);
      }
    }
  }

  private walkStaves<T extends SelectableRenderingType>(part: PartRendering, selection: Selection<T>) {
    for (const stave of part.staves) {
      if (this.isInScope(stave)) {
        selection.process(stave);
        this.walkVoices(stave, selection);
      }
    }
  }

  private walkVoices<T extends SelectableRenderingType>(stave: StaveRendering, selection: Selection<T>) {
    if (stave.entry.type === 'chorus') {
      for (const voice of stave.entry.voices) {
        if (this.isInScope(voice)) {
          selection.process(voice);
          this.walkVoiceEntries(voice, selection);
        }
      }
    }
  }

  private walkVoiceEntries<T extends SelectableRenderingType>(voice: VoiceRendering, selection: Selection<T>) {
    for (const voiceEntry of voice.entries) {
      if (this.predicates.every((predicate) => predicate(voiceEntry))) {
        selection.process(voiceEntry);
      }
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
