import { Measure } from './measure';
import { Position } from './position';
import { Size } from './size';
import { Renderable } from './types';

/**
 * Represents a System in a musical score, a horizontal grouping of staves spanning the width
 * of the viewport or page. Each system contains a segment of musical content from one or more
 * parts, and multiple systems collectively render the entirety of those parts.
 */
export class System implements Renderable {
  private measures = new Array<Measure>();
  private position = Position.zero();
  private size = Size.zero();

  addMeasure(measure: Measure): void {
    this.measures.push(measure);
  }

  getPosition(): Position {
    return this.position;
  }

  getSize(): Size {
    return this.size;
  }

  render(): void {
    // noop
  }
}
