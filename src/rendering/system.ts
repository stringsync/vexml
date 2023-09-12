import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';
import { Part, PartRendering } from './part';

type SystemCreateOptions = {
  musicXml: {
    parts: musicxml.Part[];
  };
};

type SystemRenderOptions = Record<string, never>;

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
  static create(opts: SystemCreateOptions): System {
    const parts = opts.musicXml.parts.map((part) => Part.create({ musicXml: { part } }));

    return new System(parts);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static fit(width: number, systems: System[]): void {
    // TODO: Implement to match musicxml.Line.fit.
  }

  private parts: Part[];
  private x: number;
  private y: number;
  private width: number;

  private constructor(parts: Part[]) {
    this.parts = parts;
    this.x = 0;
    this.y = 0;
    this.width = 0;
  }

  getX(): number {
    return this.x;
  }

  setX(x: number): this {
    this.x = x;
    return this;
  }

  getY(): number {
    return this.y;
  }

  setY(y: number): this {
    this.y = y;
    return this;
  }

  getWidth(): number {
    return this.width;
  }

  setWidth(width: number): this {
    this.width = width;
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  split(width: number): System[] {
    // TODO: Make real implementation.
    return [this];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  render(opts: SystemRenderOptions): SystemRendering {
    const partRenderings = new Array<PartRendering>();

    for (const part of this.parts) {
      const partRendering = part.render({
        x: this.x,
        y: this.x,
      });
      partRenderings.push(partRendering);
    }

    return { type: 'system', parts: partRenderings };
  }
}
