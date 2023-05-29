import { System } from './system';

/**
 * Line represents a group of Systems that are rendered in the same horizontal space.
 */
export class Line {
  private systems = new Array<System>();

  /**
   * Whether the line has any systems.
   */
  isEmpty(): boolean {
    return this.systems.length === 0;
  }

  /**
   * Returns the systems of the line.
   */
  getSystems(): System[] {
    return this.systems;
  }

  /**
   * Adds a system to the line.
   */
  addSystem(system: System): this {
    this.systems.push(system);
    return this;
  }

  /**
   * Returns the width of all the systems, assuming no overlap.
   */
  getWidth(): number {
    let width = 0;
    for (const system of this.systems) {
      width += system.getWidth();
    }
    return width;
  }
}
