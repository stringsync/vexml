import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';
import { Part } from './part';

type SystemCreateOptions = {
  musicXml: {
    parts: musicxml.Part[];
  };
};

type SystemRenderOptions = {
  ctx: vexflow.RenderContext;
};

export type SystemRenderResult = {
  parts: Array<{
    measures: Array<{
      components: Array<{
        vexflow: {
          stave: vexflow.Stave;
          voices: vexflow.Voice[];
        };
      }>;
    }>;
  }>;
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

  split(width: number): System[] {
    // TODO: Make real implementation.
    return [this];
  }

  render(opts: SystemRenderOptions): SystemRenderResult {
    const parts = new Array<{
      measures: Array<{
        components: Array<{
          vexflow: {
            stave: vexflow.Stave;
            voices: vexflow.Voice[];
          };
        }>;
      }>;
    }>();

    for (const part of this.parts) {
      const result = part.render({
        ctx: opts.ctx,
        x: this.x,
        y: this.x,
      });

      parts.push({ measures: result.measures });
    }

    return { parts };
  }
}
