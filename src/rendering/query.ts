import * as util from '@/util';
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

/** Describes how to traverse the sheet music. */
type WalkType = 'as-seen' | 'as-played';

type Repeat = {
  id: number;
  from: number;
  to: number;
  times: number;
  excluding: number[];
};

export class Query {
  private score: ScoreRendering;
  private predicates = new Array<Predicate>();
  private walkType: WalkType = 'as-seen';

  private constructor(score: ScoreRendering) {
    this.score = score;
  }

  static of(score: ScoreRendering) {
    return new Query(score);
  }

  /** Traverses the music in the order it is played, accounting for jump instructions. */
  asPlayed(): Query {
    const query = this.clone();
    query.walkType = 'as-played';
    return query;
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

  select<T extends SelectableRenderingType>(...types: T[]): Array<SelectableRenderingWithType<T>> {
    const selection = new Selection<T>(types);

    switch (this.walkType) {
      case 'as-seen':
        this.walkAsSeen(this.score, selection);
        break;
      case 'as-played':
        this.walkAsPlayed(this.score, selection);
        break;
    }

    return selection.results;
  }

  private clone(): Query {
    const query = new Query(this.score);
    query.predicates = [...this.predicates];
    query.walkType = this.walkType;
    return query;
  }

  private isInScope(value: any) {
    return this.predicates.every((predicate) => predicate(value));
  }

  private walkAsPlayed<T extends SelectableRenderingType>(score: ScoreRendering, selection: Selection<T>) {
    // Before processing the selection, we need to figure out the order of the measures based on their jumps. We will
    // perform filtering after we have the correct order.
    const asPlayedMeasures = new Array<MeasureRendering>();
    const measures = score.systems.flatMap((system) => system.measures);

    // Create repeats to make the data easier to work with.
    let repeatId = 1;
    const repeats = new Array<Readonly<Repeat>>();
    const startMeasureIndexes = new Array<number>();
    for (let measureIndex = 0; measureIndex < measures.length; measureIndex++) {
      const measure = measures[measureIndex];

      for (const jump of measure.jumps) {
        if (jump.type === 'repeatstart') {
          startMeasureIndexes.push(measureIndex);
        }

        if (jump.type === 'repeatend') {
          // Not all repeatends have a corresponding repeatstart. Assume they're supposed to repeat from the beginning.
          const from = startMeasureIndexes.pop() ?? 0;
          const to = measureIndex;
          const times = jump.times;
          const id = repeatId++;
          repeats.push({ id, from, to, times, excluding: [] });
        }

        if (jump.type === 'repeatending') {
          const from = startMeasureIndexes.pop() ?? 0;
          const to = measureIndex;
          const times = jump.times - 1;
          if (times > 0) {
            repeats.push({ id: repeatId++, from, to, times: times - 1, excluding: [] });
          }
          repeats.push({ id: repeatId++, from, to, times: 1, excluding: [measureIndex] });
        }
      }
    }

    // March through the measures and react to the repeats whenever we encounter them.
    let measureIndex = 0;
    const repeatStack = new Array<Repeat>();
    while (measureIndex < measures.length) {
      const measure = measures[measureIndex];

      const srcRepeat = repeats.find((repeat) => repeat.to === measureIndex);
      const activeRepeat = util.last(repeatStack);

      const isMeasureExcluded =
        !!activeRepeat && activeRepeat.times === 0 && activeRepeat.excluding.includes(measureIndex);
      if (!isMeasureExcluded) {
        asPlayedMeasures.push(measure);
      }

      if (srcRepeat && srcRepeat.id === activeRepeat?.id) {
        if (activeRepeat.times > 0) {
          activeRepeat.times--;
          measureIndex = activeRepeat.from;
        } else {
          repeatStack.pop();
          measureIndex++;
        }
        continue;
      }

      if (srcRepeat) {
        // IMPORTANT: We need to clone the repeat object to avoid modifying the original since we'll be decrementing
        // the times property. This is necessary to avoid side effects when we encounter the same repeat multiple times.
        const repeatCopy = { ...srcRepeat };
        repeatStack.push(repeatCopy);
        repeatCopy.times--;
        measureIndex = repeatCopy.from;
        continue;
      }

      measureIndex++;
    }

    // Now, we can walk the measures in the order they are played. Whenever we change systems, we'll reprocess it.
    let currentSystemIndex = -1;
    for (const measure of asPlayedMeasures) {
      const systemIndex = measure.address.getSystemIndex()!;
      if (systemIndex !== currentSystemIndex) {
        currentSystemIndex = systemIndex;
        const system = score.systems[currentSystemIndex];
        if (this.isInScope(system)) {
          selection.process(system);
        }
      }

      if (this.isInScope(measure)) {
        selection.process(measure);
        this.walkMeasureFragments(measure, selection);
      }
    }
  }

  private walkAsSeen<T extends SelectableRenderingType>(score: ScoreRendering, selection: Selection<T>) {
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
