import { Position } from './position';
import { Size } from './size';
import { Renderable } from './types';

/**
 * Represents a Measure in a musical score, corresponding to the <measure> element in MusicXML.
 * A Measure contains a specific segment of musical content, defined by its beginning and ending beats,
 * and is the primary unit of time in a score. Measures are sequenced consecutively within a system.
 */
export class Measure implements Renderable {
  private position = Position.zero();
  private size = Size.zero();

  getPosition(): Position {
    return this.position;
  }

  getSize(): Size {
    return this.size;
  }

  render(): void {
    // TODO
  }
}
