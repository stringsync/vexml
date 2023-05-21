import * as vexflow from 'vexflow';
import { ClefType } from './enums';

/**
 * Builder for vexflow.Stave objects.
 *
 * This is needed because vexflow.Stave has side effects when setting some properties.
 */
export class StaveBuilder {
  private x?: number;
  private y?: number;
  private width?: number;
  private clef?: ClefType;
  private timeSignature?: string;
  private endBarType?: vexflow.BarlineType;

  setX(x: number): this {
    this.x = x;
    return this;
  }

  setY(y: number): this {
    this.y = y;
    return this;
  }

  setWidth(width: number): this {
    this.width = width;
    return this;
  }

  getWidth(): number | undefined {
    return this.width;
  }

  setClef(clef: ClefType): this {
    this.clef = clef;
    return this;
  }

  setTimeSignature(timeSignature: string): this {
    this.timeSignature = timeSignature;
    return this;
  }

  setEndBarType(endBarType: vexflow.BarlineType): this {
    this.endBarType = endBarType;
    return this;
  }

  build(): vexflow.Stave {
    const x = this.x;
    if (typeof x === 'undefined') {
      throw new Error('x must be set');
    }

    const y = this.y;
    if (typeof y === 'undefined') {
      throw new Error('y must be set');
    }

    const width = this.width;
    if (typeof width === 'undefined') {
      throw new Error('width must be set');
    }

    const clef = this.clef;
    if (typeof clef === 'undefined') {
      throw new Error('clef must be set');
    }

    const timeSignature = this.timeSignature;
    if (typeof timeSignature === 'undefined') {
      throw new Error('timeSignature must be set');
    }

    const endBarType = this.endBarType;
    if (typeof endBarType === 'undefined') {
      throw new Error('endBarType must be set');
    }

    return new vexflow.Stave(x, y, width).addClef(clef).addTimeSignature(timeSignature).setEndBarType(endBarType);
  }
}
