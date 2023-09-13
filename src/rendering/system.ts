import * as musicxml from '@/musicxml';
import { Part, PartRendering } from './part';

export type SystemRendering = {
  type: 'system';
  parts: PartRendering[];
};

/**
 * Represents a System in a musical score, a horizontal grouping of staves spanning the width
 * of the viewport or page. Each system contains a segment of musical content from one or more
 * parts, and multiple systems collectively render the entirety of those parts.
 */
export class System {
  static create(opts: { musicXml: { parts: musicxml.Part[] } }): System {
    const parts = opts.musicXml.parts.map((part) => Part.create({ musicXml: { part } }));
    return new System(parts);
  }

  private parts: Part[];

  private constructor(parts: Part[]) {
    this.parts = parts;
  }

  /**
   * Splits the system into smaller systems that fit in the width.
   */
  split(width: number): System[] {
    const systems = new Array<System>();

    // Measure index for the proposed split system, not overall measure index.
    let partMeasureIndex = 0;
    let measureStartIndex = 0;
    let remainingWidth = width;
    const measureCount = this.getMeasureCount();

    // Adds a system, then prepares local state for the next system.
    const addSystem = (measureEndIndex: number): void => {
      const parts = this.parts.map((part) => part.slice({ measureStartIndex, measureEndIndex }));
      const system = new System(parts);
      systems.push(system);

      measureStartIndex = measureEndIndex;
      remainingWidth = width;
      partMeasureIndex = 0;
    };

    // Includes the measure in the next system by doing the remainingWidth and partMeasureIndex accounting.
    const includeMeasureInNextSystem = (requiredWidth: number): void => {
      remainingWidth -= requiredWidth;
      partMeasureIndex++;
    };

    for (let measureIndex = 0; measureIndex < measureCount; measureIndex++) {
      // Measures across parts, not all measures of a given part.
      const measures = this.parts.map((part) => part.getMeasureAt(measureIndex));

      const requiredWidth = Math.max(0, ...measures.map((measure) => measure?.getWidth(partMeasureIndex) ?? 0));

      const isProcessingLastMeasure = measureIndex == measureCount - 1;
      const hasMeasures = measureIndex !== measureStartIndex;

      if (isProcessingLastMeasure && hasMeasures) {
        // When on the last measure, we need to push whatever parts+measures as the last system. If there are none left
        // we don't need to push anything.
        addSystem(measureIndex + 1);
      } else if (requiredWidth <= remainingWidth) {
        // When we have enough width budget, simply account for it by advancing the partMeasureIndex.
        includeMeasureInNextSystem(requiredWidth);
      } else {
        // Otherwise, we don't have enough width budget and we need to push another system.
        addSystem(measureIndex + 1);
        includeMeasureInNextSystem(requiredWidth);
      }
    }

    return systems;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  render(opts: { x: number; y: number; width: number }): SystemRendering {
    const partRenderings = new Array<PartRendering>();

    for (const part of this.parts) {
      const partRendering = part.render({
        x: opts.x,
        y: opts.y,
      });
      partRenderings.push(partRendering);
    }

    return { type: 'system', parts: partRenderings };
  }

  private getMeasureCount(): number {
    return Math.max(0, ...this.parts.map((part) => part.getMeasures().length));
  }
}
