import * as spatial from '@/spatial';
import * as rendering from '@/rendering';
import * as vexflow from 'vexflow';

/**
 * The number of vexflow.Elements per node.
 *
 * NOTE: This is just a standard number. Callers should not have to tune this value. The performance differences would
 * be negligible for the number of elements we are dealing with (order of thousands).
 */
const ELEMENT_QUAD_TREE_CAPACITY = 4;

/** Broadcasts UI interaction events from a vexml rendering. */
export class Dispatcher {
  private tree: spatial.QuadTree<vexflow.Element>;

  private constructor(tree: spatial.QuadTree<vexflow.Element>) {
    this.tree = tree;
  }

  /** Creates an instance from a rendering.ScoreRendering. */
  static fromScoreRendering(scoreRendering: rendering.ScoreRendering) {
    const boundary = Dispatcher.getBoundary(scoreRendering.container);
    const tree = new spatial.QuadTree<vexflow.Element>(boundary, ELEMENT_QUAD_TREE_CAPACITY);
    return new Dispatcher(tree);
  }

  private static getBoundary(container: HTMLDivElement | HTMLCanvasElement): spatial.Rectangle {
    if (container instanceof HTMLDivElement) {
      const svg = container.firstChild;
      if (!(svg instanceof SVGElement)) {
        throw new Error('ScoreRendering does not contain a rendered SVG element, did it get deleted?');
      }
      return spatial.Rectangle.origin(svg.clientWidth, svg.clientHeight);
    } else if (container instanceof HTMLCanvasElement) {
      return spatial.Rectangle.origin(container.clientWidth, container.clientHeight);
    } else {
      throw new Error('Invalid container element type');
    }
  }
}
