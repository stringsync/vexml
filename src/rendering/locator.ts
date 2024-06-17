import * as spatial from '@/spatial';
import * as vexflow from 'vexflow';
import * as drawables from '@/drawables';
import { StaveNoteRendering } from './note';
import { InteractionModel } from './interactions';
import { ScoreRendering } from './score';

/**
 * How many entries a quad tree node should hold before subdividing.
 *
 * This is intentionally not configurable because it is a low level detail that should not be exposed to the caller.
 */
const QUAD_TREE_THRESHOLD = 10;

export type LocatorTarget = InteractionModel<StaveNoteRendering>;

export class Locator implements spatial.PointLocator<LocatorTarget> {
  private tree: spatial.QuadTree<LocatorTarget>;
  // The targets that could not be inserted into the tree because they are too large and/or out-of-bounds.
  private unorganizedTargets: LocatorTarget[];
  private allTargets: LocatorTarget[];

  private constructor(
    tree: spatial.QuadTree<LocatorTarget>,
    unorganizedTargets: LocatorTarget[],
    allTargets: LocatorTarget[]
  ) {
    this.tree = tree;
    this.unorganizedTargets = unorganizedTargets;
    this.allTargets = allTargets;
  }

  static fromScoreRendering(score: ScoreRendering): Locator {
    const targets = new Array<LocatorTarget>();

    const models = score.systems
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
            return InteractionModel.fromStaveNoteRendering(voiceEntry);
          default:
            return [];
        }
      });

    // First attempt to insert all the shapes into the tree.
    const tree = new spatial.QuadTree<LocatorTarget>(score.boundary, QUAD_TREE_THRESHOLD);
    for (const model of models) {
      for (const shape of model.getShapes()) {
        if (!tree.insert(shape, model)) {
          targets.push(model);
        }
      }
    }

    return new Locator(tree, targets, models);
  }

  /** Locates all the targets that contain the given point, sorted by descending distance tot he point. */
  locate(point: spatial.Point): LocatorTarget[] {
    return [...this.tree.query(point), ...this.unorganizedTargets.filter((target) => target.contains(point))];
  }

  /** Sorts the targets by descending distance to the given point. */
  sort(point: spatial.Point, targets: LocatorTarget[]): LocatorTarget[] {
    return targets.sort((a, b) => {
      const distanceA = a.getNearestHandleThatContains(point)?.distance(point) ?? Infinity;
      const distanceB = b.getNearestHandleThatContains(point)?.distance(point) ?? Infinity;
      return distanceA - distanceB;
    });
  }

  draw(ctx: vexflow.RenderContext): void {
    for (const target of this.allTargets) {
      for (const shape of target.getShapes()) {
        if (shape instanceof spatial.Rect) {
          const rect = new drawables.Rect({ rect: shape, strokeStyle: 'red' });
          rect.draw(ctx);
        } else if (shape instanceof spatial.Circle) {
          const circle = new drawables.Circle({ circle: shape, strokeStyle: 'red' });
          circle.draw(ctx);
        }
      }
    }
  }
}
