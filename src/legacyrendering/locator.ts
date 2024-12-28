import * as spatial from '@/spatial';
import * as vexflow from 'vexflow';
import * as drawing from '@/drawing';
import { ScoreRendering } from './score';
import { InteractionModel, InteractionModelType } from './interactions';
import { Query } from './query';

/**
 * How many entries a quad tree node should hold before subdividing.
 *
 * This is intentionally not configurable because it is a low level detail that should not be exposed to the caller.
 */
const QUAD_TREE_THRESHOLD = 10;
const TRANSPARENT_BLUE = 'rgba(0, 0, 255, 0.02)';
const TRANSPARENT_RED = 'rgba(255, 0, 0, 0.5)';

export class Locator {
  private tree: spatial.QuadTree<InteractionModelType>;
  // The targets that could not be inserted into the tree because they are too large and/or out-of-bounds.
  private unorganizedTargets: InteractionModelType[];

  private constructor(tree: spatial.QuadTree<InteractionModelType>, unorganizedTargets: InteractionModelType[]) {
    this.tree = tree;
    this.unorganizedTargets = unorganizedTargets;
  }

  static fromScoreRendering(score: ScoreRendering): Locator {
    const targets = new Array<InteractionModelType>();

    const models = InteractionModel.fromQuery(Query.of(score));

    // First attempt to insert all the shapes into the tree.
    const tree = new spatial.QuadTree<InteractionModelType>(score.boundary, QUAD_TREE_THRESHOLD);
    for (const model of models) {
      for (const shape of model.getShapes()) {
        if (!tree.insert(shape, model)) {
          targets.push(model);
        }
      }
    }

    return new Locator(tree, targets);
  }

  /** Locates all the targets that contain the given point, sorted by descending distance tot he point. */
  locate(point: spatial.Point): InteractionModelType[] {
    return [...this.tree.query(point), ...this.unorganizedTargets.filter((target) => target.contains(point))];
  }

  /** Sorts the targets by descending distance to the given point. */
  sort(point: spatial.Point, targets: InteractionModelType[]): InteractionModelType[] {
    return targets.sort((a, b) => {
      const distanceA = a.getNearestHandleThatContains(point)?.distance(point) ?? Infinity;
      const distanceB = b.getNearestHandleThatContains(point)?.distance(point) ?? Infinity;
      return distanceA - distanceB;
    });
  }

  draw(ctx: vexflow.RenderContext): void {
    const targets = [...this.tree.getEntries(), ...this.unorganizedTargets];

    // Clear any lingering paths.
    ctx.beginPath();

    for (const target of targets) {
      for (const shape of target.getShapes()) {
        if (shape instanceof spatial.Rect) {
          const rect = new drawing.Rect({ bounds: shape, strokeStyle: TRANSPARENT_RED, fillStyle: null });
          rect.draw(ctx);
        } else if (shape instanceof spatial.Circle) {
          const circle = new drawing.Circle({ circle: shape, strokeStyle: TRANSPARENT_RED });
          circle.draw(ctx);
        }
      }
    }

    for (const boundary of this.tree.getBoundaries()) {
      const rect = new drawing.Rect({ bounds: boundary, strokeStyle: TRANSPARENT_BLUE, fillStyle: null });
      rect.draw(ctx);
    }
  }
}
