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
  private id: symbol;
  private parts: Part[];

  private constructor(opts: { id: symbol; parts: Part[] }) {
    this.id = opts.id;
    this.parts = opts.parts;
  }

  static create(opts: { musicXml: { parts: musicxml.Part[] } }): System {
    const id = Symbol();
    const parts = opts.musicXml.parts.map((part) => Part.create({ systemId: id, musicXml: { part } }));
    return new System({ id, parts });
  }

  /**
   * Splits the system into smaller systems that fit in the width.
   */
  split(width: number): System[] {
    const systems = new Array<System>();
    const measureCount = this.getMeasureCount();
    let measureStartIndex = 0;
    let widthBudget = width;

    const commitSystem = (measureEndIndex: number) => {
      const systemId = Symbol();
      const parts = this.parts.map((part) =>
        part.slice({
          systemId,
          measureStartIndex,
          measureEndIndex,
        })
      );

      const system = new System({ id: systemId, parts });
      systems.push(system);

      widthBudget = width;
      measureStartIndex = measureEndIndex;
    };

    const continueSystem = (width: number) => {
      widthBudget -= width;
    };

    for (let index = 0; index < measureCount; index++) {
      const measures = this.parts.map((part) => ({
        previous: part.getMeasureAt(index - 1),
        current: part.getMeasureAt(index)!,
      }));

      let minRequiredWidth = Math.max(
        0,
        ...measures.map((measure) => measure.current.getMinRequiredWidth(measure.previous))
      );

      const isProcessingLastMeasure = index === measureCount - 1;
      if (isProcessingLastMeasure) {
        if (minRequiredWidth <= widthBudget) {
          commitSystem(index + 1);
        } else {
          commitSystem(index);
          commitSystem(index + 1);
        }
      } else if (minRequiredWidth <= widthBudget) {
        continueSystem(minRequiredWidth);
      } else {
        commitSystem(index);
        // Recalculate to reflect the new conditions of the measure being on a different system.
        // TODO: Using null breaks encapsulation, figure out another way to do this.
        minRequiredWidth = Math.max(0, ...measures.map((measure) => measure.current.getMinRequiredWidth(null)));
        continueSystem(minRequiredWidth);
      }
    }

    return systems;
  }

  render(opts: { x: number; y: number; width: number; isLastSystem: boolean }): SystemRendering {
    const partRenderings = new Array<PartRendering>();

    const minRequiredSystemWidth = this.getMinRequiredWidth();

    for (const part of this.parts) {
      const partRendering = part.render({
        x: opts.x,
        y: opts.y,
        isLastSystem: opts.isLastSystem,
        minRequiredSystemWidth,
        targetSystemWidth: opts.width,
      });
      partRenderings.push(partRendering);
    }

    return { type: 'system', parts: partRenderings };
  }

  private getMeasureCount(): number {
    return Math.max(0, ...this.parts.map((part) => part.getMeasures().length));
  }

  private getMinRequiredWidth(): number {
    const measureCount = this.getMeasureCount();
    let totalWidth = 0;

    // Iterate over each measure index, accumulating the max width from each measure "column" (across all parts).
    for (let index = 0; index < measureCount; index++) {
      // Measures across parts, not all measures of a given part.
      const measures = this.parts.map((part) => ({
        previous: part.getMeasureAt(index - 1),
        current: part.getMeasureAt(index)!,
      }));

      totalWidth += Math.max(0, ...measures.map((measure) => measure.current.getMinRequiredWidth(measure.previous)));
    }

    return totalWidth;
  }
}
