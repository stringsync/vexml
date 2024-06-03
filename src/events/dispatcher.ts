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
  /** The HTML Element that hosts the native event listeners. */
  private host: Element;

  /** The data structure that provides efficient spatial lookup of vexflow.Elements. */
  private tree: spatial.QuadTree<vexflow.Element>;

  private constructor(host: Element, tree: spatial.QuadTree<vexflow.Element>) {
    this.host = host;
    this.tree = tree;
  }

  /** Creates an instance from a rendering.ScoreRendering. */
  static fromScoreRendering(scoreRendering: rendering.ScoreRendering) {
    const source = Dispatcher.getHost(scoreRendering.container);
    const boundary = spatial.Rectangle.origin(source.clientWidth, source.clientHeight);
    const tree = new spatial.QuadTree<vexflow.Element>(boundary, ELEMENT_QUAD_TREE_CAPACITY);
    return new Dispatcher(source, tree);
  }

  /** Returns the element that will host the event listeners. */
  private static getHost(container: HTMLDivElement | HTMLCanvasElement): Element {
    if (container instanceof HTMLDivElement) {
      const svg = container.firstChild;
      if (!(svg instanceof SVGElement)) {
        throw new Error('ScoreRendering does not contain a rendered SVG element, did it get deleted?');
      }
      return svg;
    } else if (container instanceof HTMLCanvasElement) {
      return container;
    } else {
      throw new Error('Invalid container element type, is the ScoreRendering authentic and untampered?');
    }
  }
}
