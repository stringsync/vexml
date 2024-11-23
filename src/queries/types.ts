import * as rendering from '@/rendering';

export type Predicate<T> = (element: T) => boolean;

export type Queryable =
  | rendering.StaveNoteRendering
  | rendering.StaveChordRendering
  | rendering.TabNoteRendering
  | rendering.TabChordRendering
  | rendering.RestRendering
  | rendering.MeasureRendering;

export type Interactable = Queryable;

export type Playable = Extract<
  Queryable,
  | rendering.StaveNoteRendering
  | rendering.StaveChordRendering
  | rendering.TabNoteRendering
  | rendering.TabChordRendering
  | rendering.RestRendering
>;
