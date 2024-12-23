import * as spatial from '@/spatial';
import * as util from '@/util';
import { GraceChordRendering, StaveChordRendering, TabChordRendering, TabGraceChordRendering } from './chord';
import { MeasureRendering } from './measure';
import { GraceNoteRendering, StaveNoteRendering, TabGraceNoteRendering, TabNoteRendering } from './note';
import { Query, SelectableRenderingWithType } from './query';
import { RestRendering } from './rest';
import { StaveRendering } from './stave';

export const INTERACTABLE_RENDERING_TYPES = [
  'measure',
  'stavenote',
  'stavechord',
  'gracenote',
  'gracechord',
  'tabnote',
  'tabchord',
  'tabgracenote',
  'tabgracechord',
  'rest',
  'stave',
] as const;

export type InteractableRendering = SelectableRenderingWithType<(typeof INTERACTABLE_RENDERING_TYPES)[number]>;

export type InteractionModelType = InteractionModel<InteractableRendering>;

/** Represents the blueprint for interacting with an object. */
export class InteractionModel<T> {
  private handles: InteractionHandle[];
  public readonly value: T;

  constructor(handles: InteractionHandle[], value: T) {
    this.handles = handles;
    this.value = value;
  }

  static create<T extends InteractableRendering>(rendering: T): InteractionModel<T> {
    return InteractionModelFactory.create(rendering) as InteractionModel<T>;
  }

  static fromQuery(query: Query) {
    return InteractionModelFactory.fromQuery(query);
  }

  /** Returns a box that contains all the handles. */
  @util.memoize()
  getBoundingBox(): spatial.Rect {
    const rects = this.handles.map((handle) => {
      const shape = handle.getShape();
      return spatial.Rect.fromShape(shape);
    });
    return spatial.Rect.merge(rects);
  }

  /** Returns the interaction handles for this model. */
  getHandles(): InteractionHandle[] {
    return this.handles;
  }

  /** Returns the shapes that compose this model. */
  getShapes(): spatial.Shape[] {
    return this.handles.map((handle) => handle.getShape());
  }

  /** Returns whether the model contains a point. */
  contains(point: spatial.Point): boolean {
    return this.handles.some((handle) => handle.contains(point));
  }

  /**
   * Returns the nearest handle that contains the point. When there's a tie, the handle that was added first when
   * constructing is returned.
   */
  getNearestHandleThatContains(point: spatial.Point): InteractionHandle | null {
    let nearestHandle: InteractionHandle | null = null;
    let minDistance = Infinity;

    for (const handle of this.handles) {
      if (!handle.contains(point)) {
        continue;
      }

      const distance = handle.distance(point);
      if (distance >= minDistance) {
        continue;
      }

      minDistance = distance;
      nearestHandle = handle;
    }

    return nearestHandle;
  }
}

/**
 * A component of an interaction model.
 *
 * An interaction handle is composed of a characteristic shape and characteristic point within that shape. The shape is
 * the interactive region that the user can interact with. It is up to the caller to decide what the handle represents
 * (e.g. is this a handle that permits moving an object, resizing an object, rotating an object etc).
 *
 * The point is a characteristic point of interest within the shape (usually the centroid). This point is used for
 * calculations that aren't as straightforward with a shape, such as calculating distance.
 */
export class InteractionHandle {
  private shape: spatial.Shape;
  private point: spatial.Point;

  constructor(shape: spatial.Shape, point: spatial.Point) {
    util.assert(shape.contains(point), "expected the handle's shape to contain the point");
    this.shape = shape;
    this.point = point;
  }

  /** Returns the shape of the handle. */
  getShape(): spatial.Shape {
    return this.shape;
  }

  /** Returns the distance from a point. */
  distance(point: spatial.Point): number {
    return this.point.distance(point);
  }

  /** Returns whether the model contains a point. */
  contains(point: spatial.Point) {
    return this.shape.contains(point);
  }
}

class InteractionModelFactory {
  static create(rendering: InteractableRendering) {
    switch (rendering.type) {
      case 'measure':
        return InteractionModelFactory.fromMeasureRendering(rendering);
      case 'stavenote':
        return InteractionModelFactory.fromStaveNoteRendering(rendering);
      case 'stavechord':
        return InteractionModelFactory.fromStaveChordRendering(rendering);
      case 'gracenote':
        return InteractionModelFactory.fromGraceNoteRendering(rendering);
      case 'gracechord':
        return InteractionModelFactory.fromGraceChordRendering(rendering);
      case 'rest':
        return InteractionModelFactory.fromRestRendering(rendering);
      case 'tabnote':
        return InteractionModelFactory.fromTabNoteRendering(rendering);
      case 'tabchord':
        return InteractionModelFactory.fromTabChordRendering(rendering);
      case 'tabgracenote':
        return InteractionModelFactory.fromTabGraceNoteRendering(rendering);
      case 'tabgracechord':
        return InteractionModelFactory.fromTabGraceChordRendering(rendering);
      case 'stave':
        return InteractionModelFactory.fromStaveRendering(rendering);
    }
  }

  static fromQuery(query: Query) {
    return query.select(...INTERACTABLE_RENDERING_TYPES).flatMap(InteractionModelFactory.create);
  }

  private static fromMeasureRendering(measure: MeasureRendering): InteractionModel<MeasureRendering> {
    const handles = new Array<InteractionHandle>();

    const staveRects = measure.fragments
      .flatMap((fragment) => fragment.parts.flatMap((part) => part.staves))
      .flatMap((stave) => spatial.Rect.fromRectLike(stave.vexflow.stave.getBoundingBox()));

    const measureRect = spatial.Rect.merge(staveRects);
    handles.push(new InteractionHandle(measureRect, measureRect.center()));

    return new InteractionModel(handles, measure);
  }

  private static fromStaveNoteRendering(staveNote: StaveNoteRendering): InteractionModel<StaveNoteRendering> {
    const handles = new Array<InteractionHandle>();

    const vfStaveNote = staveNote.vexflow.staveNote;
    const vfBoundingBox = vfStaveNote.getBoundingBox();
    const staveNoteRect = spatial.Rect.fromRectLike(vfBoundingBox);
    handles.push(new InteractionHandle(staveNoteRect, staveNoteRect.center()));

    return new InteractionModel(handles, staveNote);
  }

  private static fromStaveChordRendering(staveChord: StaveChordRendering): InteractionModel<StaveChordRendering> {
    const handles = new Array<InteractionHandle>();

    const vfStaveNote = staveChord.notes[0].vexflow.staveNote;
    const vfBoundingBox = vfStaveNote.getBoundingBox();
    const staveNoteRect = spatial.Rect.fromRectLike(vfBoundingBox);
    handles.push(new InteractionHandle(staveNoteRect, staveNoteRect.center()));

    return new InteractionModel(handles, staveChord);
  }

  private static fromGraceNoteRendering(graceNote: GraceNoteRendering): InteractionModel<GraceNoteRendering> {
    const handles = new Array<InteractionHandle>();

    // TODO: When calling vfGraceNote.getBoundingBox(), we find that the grace note is not attached to a tick context.
    // const vfGraceNote = graceNote.vexflow.graceNote;
    // const vfBoundingBox = vfGraceNote.getBoundingBox();
    // const graceNoteRect = spatial.Rect.fromRectLike(vfBoundingBox);
    const graceNoteRect = spatial.Rect.empty();
    handles.push(new InteractionHandle(graceNoteRect, graceNoteRect.center()));

    return new InteractionModel(handles, graceNote);
  }

  private static fromGraceChordRendering(graceChord: GraceChordRendering): InteractionModel<GraceChordRendering> {
    const handles = new Array<InteractionHandle>();

    const vfGraceNote = graceChord.graceNotes[0].vexflow.graceNote;
    const vfBoundingBox = vfGraceNote.getBoundingBox();
    const graceNoteRect = spatial.Rect.fromRectLike(vfBoundingBox);
    handles.push(new InteractionHandle(graceNoteRect, graceNoteRect.center()));

    return new InteractionModel(handles, graceChord);
  }

  private static fromRestRendering(rest: RestRendering): InteractionModel<RestRendering> {
    const handles = new Array<InteractionHandle>();

    const vfBoundingBox = rest.vexflow.note.getBoundingBox();
    let restRect: spatial.Rect;
    if (rest.duration === '1' || rest.duration === '2') {
      // Whole and half rest bounding boxes are too small to interact with, so we make the interaction shape bigger.
      const scale = 2;
      const w = scale * vfBoundingBox.w;
      const h = scale * vfBoundingBox.h;
      const x = vfBoundingBox.x + (vfBoundingBox.w - w) / 2;
      const y = vfBoundingBox.y + (vfBoundingBox.h - h) / 2;
      restRect = new spatial.Rect(x, y, w, h);
    } else {
      restRect = spatial.Rect.fromRectLike(vfBoundingBox);
    }

    handles.push(new InteractionHandle(restRect, restRect.center()));

    return new InteractionModel(handles, rest);
  }

  private static fromTabNoteRendering(tabNote: TabNoteRendering): InteractionModel<TabNoteRendering> {
    const handles = new Array<InteractionHandle>();

    const vfTabNote = tabNote.vexflow.tabNote;
    const x = vfTabNote.getAbsoluteX();
    for (const y of vfTabNote.getYs()) {
      const noteheadCircle = new spatial.Circle(x, y, 10);
      handles.push(new InteractionHandle(noteheadCircle, noteheadCircle.center()));
    }

    return new InteractionModel(handles, tabNote);
  }

  private static fromTabChordRendering(tabChord: TabChordRendering): InteractionModel<TabChordRendering> {
    const handles = new Array<InteractionHandle>();

    const vfTabNote = tabChord.tabNotes[0].vexflow.tabNote;
    const x = vfTabNote.getAbsoluteX();
    for (const y of vfTabNote.getYs()) {
      const noteheadCircle = new spatial.Circle(x, y, 10);
      handles.push(new InteractionHandle(noteheadCircle, noteheadCircle.center()));
    }

    return new InteractionModel(handles, tabChord);
  }

  private static fromTabGraceNoteRendering(
    tabGraceNote: TabGraceNoteRendering
  ): InteractionModel<TabGraceNoteRendering> {
    const handles = new Array<InteractionHandle>();

    const vfGraceTabNote = tabGraceNote.vexflow.graceTabNote;
    const x = vfGraceTabNote.getAbsoluteX();
    for (const y of vfGraceTabNote.getYs()) {
      const noteheadCircle = new spatial.Circle(x, y, 10);
      handles.push(new InteractionHandle(noteheadCircle, noteheadCircle.center()));
    }

    return new InteractionModel(handles, tabGraceNote);
  }

  private static fromTabGraceChordRendering(
    tabGraceChord: TabGraceChordRendering
  ): InteractionModel<TabGraceChordRendering> {
    const handles = new Array<InteractionHandle>();

    const vfGraceTabNote = tabGraceChord.tabGraceNotes[0].vexflow.graceTabNote;
    const x = vfGraceTabNote.getAbsoluteX();
    for (const y of vfGraceTabNote.getYs()) {
      const noteheadCircle = new spatial.Circle(x, y, 10);
      handles.push(new InteractionHandle(noteheadCircle, noteheadCircle.center()));
    }

    return new InteractionModel(handles, tabGraceChord);
  }

  private static fromStaveRendering(stave: StaveRendering): InteractionModel<StaveRendering> {
    const handles = new Array<InteractionHandle>();

    const vfStave = stave.vexflow.stave;
    const vfBoundingBox = vfStave.getBoundingBox();
    const staveRect = spatial.Rect.fromRectLike(vfBoundingBox);
    handles.push(new InteractionHandle(staveRect, staveRect.center()));

    return new InteractionModel(handles, stave);
  }
}
