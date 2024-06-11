import { Point } from './point';
import { LegacyRect } from './legacyrect';
import * as util from '@/util';

/**
 * Represents a region defined by a bounding box and a set of anchor points.
 *
 * The anchors are points of interest of some underlying shape. They do not necessarily define a closed polygon. They
 * should be ordered in descending importance.
 */
export class Region {
  private boundingBox: LegacyRect;
  private anchors: Point[];

  constructor(boundingBox: LegacyRect, anchors: Point[]) {
    this.boundingBox = boundingBox;
    this.anchors = anchors;

    util.assert(this.anchors.length > 0, 'must have at least one anchor');
  }

  /** Returns whether the point is contained within the region's bounding box. */
  contains(point: Point): boolean {
    return this.boundingBox.contains(point);
  }

  /** Returns the nearest anchor to a point. Picks the first one when there is a tie. */
  getNearestPoint(point: Point) {
    util.assert(this.contains(point), 'point must be inside the bounding box');

    let result = {
      anchor: this.anchors[0],
      distance: this.anchors[0].distance(point),
    };

    for (let index = 1; index < this.anchors.length; index++) {
      const anchor = this.anchors[index];
      const distance = anchor.distance(point);
      if (distance < result.distance) {
        result = { anchor, distance };
      }
    }

    return result;
  }
}
