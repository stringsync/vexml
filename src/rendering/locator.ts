import * as spatial from '@/spatial';
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
  private targets: LocatorTarget[];

  private constructor(tree: spatial.QuadTree<LocatorTarget>, targets: LocatorTarget[]) {
    this.tree = tree;
    this.targets = targets;
  }

  static fromScoreRendering(score: ScoreRendering): Locator {
    const tree = new spatial.QuadTree<LocatorTarget>(score.boundary, QUAD_TREE_THRESHOLD);
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

    for (const model of models) {
      for (const shape of model.getShapes()) {
        if (!tree.insert(shape, model)) {
          targets.push(model);
        }
      }
    }

    return new Locator(tree, targets);
  }

  /** Locates all the targets that contain the given point. */
  locate(point: spatial.Point): LocatorTarget[] {
    return [...this.tree.query(point), ...this.targets.filter((target) => target.contains(point))];
  }
}
