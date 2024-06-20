import * as spatial from '@/spatial';
import * as util from '@/util';
import { StaveNoteRendering } from './note';
import { StaveChordRendering } from './chord';
import { ScoreRendering } from './score';

export type InteractionModelType = ReturnType<typeof InteractionModelFactory.fromScoreRendering>[number];

/** Represents the blueprint for interacting with an object. */
export class InteractionModel<T> {
  private handles: InteractionHandle[];
  public readonly value: T;

  constructor(handles: InteractionHandle[], value: T) {
    this.handles = handles;
    this.value = value;
  }

  static create(scoreRendering: ScoreRendering): InteractionModelType[] {
    return InteractionModelFactory.fromScoreRendering(scoreRendering);
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
  static fromScoreRendering(scoreRendering: ScoreRendering) {
    const models = scoreRendering.systems
      .flatMap((system) => system.measures)
      .flatMap((measure) => measure.fragments)
      .flatMap((fragment) => fragment.parts)
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
      .flatMap((voiceEntry) => {
        switch (voiceEntry.type) {
          case 'stavenote':
            return InteractionModelFactory.fromStaveNoteRendering(voiceEntry);
          case 'stavechord':
            return InteractionModelFactory.fromStaveChordRendering(voiceEntry);
          case 'gracenote':
          default:
            return [];
        }
      });

    return models;
  }

  private static fromStaveNoteRendering(staveNote: StaveNoteRendering): InteractionModel<StaveNoteRendering> {
    const handles = new Array<InteractionHandle>();

    const hasAccidental = staveNote.modifiers.some((modifier) => modifier.type === 'accidental');

    const vfStaveNote = staveNote.vexflow.staveNote;
    for (const vfNotehead of vfStaveNote.noteHeads) {
      const vfBoundingBox = vfNotehead.getBoundingBox();
      const noteheadX = hasAccidental ? vfBoundingBox.x : vfBoundingBox.x + vfBoundingBox.w / 2;
      const noteheadY = vfBoundingBox.y + vfBoundingBox.h / 2;
      const noteheadCircle = new spatial.Circle(noteheadX, noteheadY, vfBoundingBox.w);
      handles.push(new InteractionHandle(noteheadCircle, noteheadCircle.center()));
    }

    const hasStem = vfStaveNote.hasStem();
    if (hasStem) {
      const vfBoundingBox = vfStaveNote.getBoundingBox();
      const staveNoteRect = spatial.Rect.fromRectLike(vfBoundingBox);
      handles.push(new InteractionHandle(staveNoteRect, staveNoteRect.center()));
    }

    return new InteractionModel(handles, staveNote);
  }

  private static fromStaveChordRendering(staveChord: StaveChordRendering): InteractionModel<StaveChordRendering> {
    const handles = new Array<InteractionHandle>();

    const hasAccidental = staveChord.notes
      .flatMap((note) => note.modifiers)
      .some((modifier) => modifier.type === 'accidental');

    const vfStaveNote = staveChord.notes[0].vexflow.staveNote;
    for (const vfNotehead of vfStaveNote.noteHeads) {
      const vfBoundingBox = vfNotehead.getBoundingBox();
      const noteheadX = hasAccidental ? vfBoundingBox.x : vfBoundingBox.x + vfBoundingBox.w / 2;
      const noteheadY = vfBoundingBox.y + vfBoundingBox.h / 2;
      const noteheadCircle = new spatial.Circle(noteheadX, noteheadY, vfBoundingBox.w);
      handles.push(new InteractionHandle(noteheadCircle, noteheadCircle.center()));
    }

    const hasStem = vfStaveNote.hasStem();
    if (hasStem) {
      const vfBoundingBox = vfStaveNote.getBoundingBox();
      const staveNoteRect = spatial.Rect.fromRectLike(vfBoundingBox);
      handles.push(new InteractionHandle(staveNoteRect, staveNoteRect.center()));
    }

    return new InteractionModel(handles, staveChord);
  }
}
