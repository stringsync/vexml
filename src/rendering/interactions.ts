import * as spatial from '@/spatial';
import * as util from '@/util';
import { StaveNoteRendering } from './note';

/** Represents the blueprint for interacting with an object. */
export class InteractionModel<T> {
  private handles: InteractionHandle[];
  private value: T;

  private constructor(handles: InteractionHandle[], value: T) {
    this.handles = handles;
    this.value = value;
  }

  static fromStaveNoteRendering(staveNote: StaveNoteRendering): InteractionModel<StaveNoteRendering> {
    const vfStaveNote = staveNote.vexflow.staveNote;

    // TODO(jared): Break this up into a circle for the notehead, and a rectangle for the stem if present.
    const staveNoteRect = spatial.Rect.fromRectLike(vfStaveNote.getBoundingBox());
    const staveNotePoint = staveNoteRect.center();
    const staveNoteHandle = new InteractionHandle(staveNoteRect, staveNotePoint);

    return new InteractionModel([staveNoteHandle], staveNote);
  }

  /** Returns the interaction handles for this model. */
  getHandles(): InteractionHandle[] {
    return this.handles;
  }

  /** Returns the value associated with this model. */
  getValue(): T {
    return this.value;
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
