import { Position } from './position';
import { Size } from './size';
import { System } from './system';
import { Renderable } from './types';

/**
 * Represents a Part in a musical score, corresponding to the <part> element in MusicXML.
 * This class encompasses the entire musical content for a specific instrument or voice,
 * potentially spanning multiple systems when rendered in the viewport.
 */
export class Part implements Renderable {
  getPosition(): Position {
    return Position.zero();
  }

  getSize(): Size {
    return Size.zero();
  }

  render(): void {
    const systems = this.organizeMeasuresIntoSystems();
    for (const system of systems) {
      system.render();
    }
  }

  /**
   * Takes the measures of the part and splits them
   */
  private organizeMeasuresIntoSystems(): System[] {
    return [];
  }
}
