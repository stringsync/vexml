import * as musicxml from '@/musicxml';
import { Part, PartRendering } from './part';
import { Config } from './config';
import * as util from '@/util';

/** The result of rendering a System. */
export type SystemRendering = {
  type: 'system';
  parts: PartRendering[];
};

/**
 * Represents a System in a musical score, a horizontal grouping of staves spanning the width of the viewport or page.
 * Each system contains a segment of musical content from one or more parts, and multiple systems collectively render
 * the entirety of those parts.
 */
export class System {
  private config: Config;
  private id: symbol;
  private parts: Part[];

  constructor(opts: { config: Config; id: symbol; parts: Part[] }) {
    this.config = opts.config;
    this.id = opts.id;
    this.parts = opts.parts;
  }

  /** Creates a System rendering object. */
  static create(opts: {
    config: Config;
    staveLayouts: musicxml.StaveLayout[];
    musicXml: { parts: musicxml.Part[] };
  }): System {
    const id = Symbol();

    let previousPart: Part | null = null;
    const parts = new Array<Part>();
    for (const xmlPart of opts.musicXml.parts) {
      const part = Part.create({
        config: opts.config,
        systemId: id,
        musicXml: { part: xmlPart },
        previousPart,
        staveLayouts: opts.staveLayouts,
      });
      parts.push(part);
      previousPart = part;
    }

    return new System({ config: opts.config, id, parts });
  }

  /** Splits the system into smaller systems that fit in the width. */
  split(width: number): System[] {
    const systems = new Array<System>();
    const measureCount = this.getMeasureCount();
    let measureStartIndex = 0;
    let widthBudget = width;

    /** Adds a system to the return value. */
    const commitSystem = (measureEndIndex: number) => {
      const systemId = Symbol();
      const parts = this.parts.map((part) =>
        part.slice({
          systemId,
          measureStartIndex,
          measureEndIndex,
        })
      );

      const system = new System({ config: this.config, id: systemId, parts });
      systems.push(system);

      widthBudget = width;
      measureStartIndex = measureEndIndex;
    };

    /** Accounts for a system being added. */
    const continueSystem = (width: number) => {
      widthBudget -= width;
    };

    for (let index = 0; index < measureCount; index++) {
      const measures = this.parts.map((part) => ({
        previous: part.getMeasureAt(index - 1),
        current: part.getMeasureAt(index)!,
      }));

      let minRequiredWidth = util.max(measures.map((measure) => measure.current.getMinRequiredWidth(measure.previous)));

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
        // Recalculate to reflect the new conditions of the measure being on a different system, which is why null
        // is being used.
        minRequiredWidth = util.max(measures.map((measure) => measure.current.getMinRequiredWidth(null)));
        continueSystem(minRequiredWidth);
      }
    }

    return systems;
  }

  /** Renders the System. */
  render(opts: {
    x: number;
    y: number;
    width: number;
    isLastSystem: boolean;
    previousSystem: System | null;
    nextSystem: System | null;
  }): SystemRendering {
    const minRequiredSystemWidth = this.getMinRequiredWidth();

    const partRenderings = new Array<PartRendering>();

    util.forEachTriple(this.parts, ([previousPart, currentPart, nextPart], index) => {
      if (index === 0) {
        previousPart = util.last(opts.previousSystem?.parts ?? []);
      }
      if (index === this.parts.length - 1) {
        nextPart = util.first(opts.nextSystem?.parts ?? []);
      }

      const partRendering = currentPart.render({
        x: opts.x,
        y: opts.y,
        isLastSystem: opts.isLastSystem,
        minRequiredSystemWidth,
        targetSystemWidth: opts.width,
        previousPart,
        nextPart,
      });
      partRenderings.push(partRendering);
    });

    return { type: 'system', parts: partRenderings };
  }

  private getMeasureCount(): number {
    return util.max(this.parts.map((part) => part.getMeasures().length));
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

      totalWidth += util.max(measures.map((measure) => measure.current.getMinRequiredWidth(measure.previous)));
    }

    return totalWidth;
  }
}
