import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';
import { Part } from './part';

type CreateOptions = {
  musicXml: {
    parts: musicxml.Part[];
  };
};

type RenderOptions = {
  ctx: vexflow.RenderContext;
};

/**
 * Represents a System in a musical score, a horizontal grouping of staves spanning the width
 * of the viewport or page. Each system contains a segment of musical content from one or more
 * parts, and multiple systems collectively render the entirety of those parts.
 */
export class System {
  static create(opts: CreateOptions): System {
    const parts = opts.musicXml.parts.map((part) => Part.create({ musicXml: { part } }));

    return new System(parts);
  }

  static fit(width: number, systems: System[]): void {
    // noop
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

  split(width: number): System[] {
    return [this];
  }

  render(opts: RenderOptions): void {
    for (const part of this.parts) {
      part.render();
    }
  }
}
