import * as vexflow from 'vexflow';
import { ClefType } from './enums';
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
  addSystem(system: System): void {
    this.systems.push(system);
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

  /**
   * Takes the remaining/excess width, and distributes the change across all the systems of the line respecting the
   * current proportions.
   */
  fit(width: number): void {
    const isUnderspecified = this.systems.some((system) => system.getWidth() === 0);
    if (isUnderspecified) {
      throw new Error('all line systems must have a non-zero width before fit');
    }

    const totalWidth = this.getWidth();
    const remainingWidth = width - totalWidth;

    for (const system of this.systems) {
      const systemWidth = system.getWidth();

      const widthFraction = systemWidth / totalWidth;
      const deltaWidth = remainingWidth * widthFraction;
      const nextWidth = systemWidth + deltaWidth;

      system.setWidth(nextWidth);
    }
  }

  /**
   * Ensures that the first stave has the given modifiers.
   *
   * The width of the stave may change to accommodate the modifiers.
   */
  setBeginningModifiers(opts: { timeSignature?: string; clef?: ClefType }): void {
    const stave = this.getFirstSystem()?.getFirstStave();
    if (!stave) {
      return;
    }

    const modifiersWidth = stave.getModifiersWidth();
    stave.setTimeSignature(opts.timeSignature);
    stave.setClef(opts.clef);
    stave.addWidth(stave.getModifiersWidth() - modifiersWidth);
  }

  /**
   * Whether the last stave has a barline.
   */
  hasEndBarType(): boolean {
    return typeof this.getLastSystem()?.getLastStave()?.getEndBarType() !== 'undefined';
  }

  /**
   * Ensures that the last stave has a barline.
   */
  setEndBarType(barlineType: vexflow.BarlineType): void {
    this.getLastSystem()?.getLastStave()?.setEndBarType(barlineType);
  }

  /**
   * Returns the first system in the line.
   */
  getFirstSystem(): System | undefined {
    return this.systems[0];
  }

  /**
   * Returns the last system in the line.
   */
  getLastSystem(): System | undefined {
    return this.systems[this.systems.length - 1];
  }
}
