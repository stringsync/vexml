import { Part } from './part';
import { Position } from './position';
import { Size } from './size';
import { Renderable } from './types';

/**
 * Represents a Score in a musical composition, serving as the top-level container
 * for all musical elements and metadata. The Score encompasses the entirety of a piece,
 * housing individual parts, systems, and other musical components. It also provides
 * contextual information like title, composer, and other pertinent details.
 */
export class Score implements Renderable {
  private parts: Part[];

  fromMusicXml(): Score {
    return new Score([]);
  }

  private constructor(parts: Part[]) {
    this.parts = parts;
  }

  getPosition(): Position {
    return Position.zero();
  }

  getSize(): Size {
    return Size.zero();
  }

  render(): void {
    // noop
  }
}
