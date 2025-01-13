import * as spatial from '@/spatial';
import { Element } from './types';
import { Score } from './score';

/**
 * How many entries a quad tree node should hold before subdividing.
 *
 * This is intentionally not configurable because it is a low level detail that should not be exposed to the caller.
 */
const QUAD_TREE_THRESHOLD = 10;

/** Locates elements using spatial points. */
export class Locator {
  private constructor(
    private tree: spatial.QuadTree<Element>,
    // The elements that could not be inserted into the tree because they are too large and/or out-of-bounds.
    private unorganizedElements: Element[]
  ) {}

  static create(score: Score) {
    const unorganizedElements = new Array<Element>();

    const systems = score.getSystems();
    const measures = systems.flatMap((system) => system.getMeasures());
    const fragments = measures.flatMap((measure) => measure.getFragments());
    const parts = fragments.flatMap((fragment) => fragment.getParts());
    const staves = parts.flatMap((part) => part.getStaves());
    const voices = staves.flatMap((stave) => stave.getVoices());
    const voiceEntries = voices.flatMap((voice) => voice.getEntries());
    const elements = [score, ...systems, ...measures, ...fragments, ...parts, ...staves, ...voices, ...voiceEntries];

    const tree = new spatial.QuadTree<Element>(score.rect, QUAD_TREE_THRESHOLD);

    for (const element of elements) {
      if (!tree.insert(element.rect, element)) {
        unorganizedElements.push(element);
      }
    }
  }

  /**
   * Locates all the elements that contain the given point, sorted by descending distance to the point based on their
   * rects' centers.
   */
  locate(point: spatial.Point): Element[] {
    return [
      ...this.tree.query(point),
      ...this.unorganizedElements.filter((element) => element.rect.contains(point)),
    ].sort((a, b) => {
      const distanceA = a.rect.center().distance(point);
      const distanceB = b.rect.center().distance(point);
      return distanceA - distanceB;
    });
  }
}
