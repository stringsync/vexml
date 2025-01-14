/* eslint-disable @typescript-eslint/no-unused-vars */
import * as vexflow from 'vexflow';

export class NoopRenderContext extends vexflow.RenderContext {
  clear(): void {}
  setFillStyle(style: string): this {
    return this;
  }
  setBackgroundFillStyle(style: string): this {
    return this;
  }
  setStrokeStyle(style: string): this {
    return this;
  }
  setShadowColor(color: string): this {
    return this;
  }
  setShadowBlur(blur: number): this {
    return this;
  }
  setLineWidth(width: number): this {
    return this;
  }
  setLineCap(capType: CanvasLineCap): this {
    return this;
  }
  setLineDash(dashPattern: number[]): this {
    return this;
  }
  scale(x: number, y: number): this {
    return this;
  }
  rect(x: number, y: number, width: number, height: number): this {
    return this;
  }
  resize(width: number, height: number): this {
    return this;
  }
  fillRect(x: number, y: number, width: number, height: number): this {
    return this;
  }
  clearRect(x: number, y: number, width: number, height: number): this {
    return this;
  }
  pointerRect(x: number, y: number, width: number, height: number): this {
    return this;
  }
  beginPath(): this {
    return this;
  }
  moveTo(x: number, y: number): this {
    return this;
  }
  lineTo(x: number, y: number): this {
    return this;
  }
  bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): this {
    return this;
  }
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): this {
    return this;
  }
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise: boolean): this {
    return this;
  }
  fill(attributes?: any): this {
    return this;
  }
  stroke(): this {
    return this;
  }
  closePath(): this {
    return this;
  }
  fillText(text: string, x: number, y: number): this {
    return this;
  }
  save(): this {
    return this;
  }
  restore(): this {
    return this;
  }
  openGroup(cls?: string, id?: string) {}
  closeGroup(): void {}
  openRotation(angleDegrees: number, x: number, y: number): void {}
  closeRotation(): void {}
  add(child: any): void {}
  measureText(text: string): vexflow.TextMeasure {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  set fillStyle(style: string | CanvasGradient | CanvasPattern) {}
  get fillStyle(): string | CanvasGradient | CanvasPattern {
    return '';
  }
  set strokeStyle(style: string | CanvasGradient | CanvasPattern) {}
  get strokeStyle(): string | CanvasGradient | CanvasPattern {
    return '';
  }
  setFont(f?: string | vexflow.FontInfo, size?: string | number, weight?: string | number, style?: string): this {
    return this;
  }
  getFont(): string {
    return '';
  }
}
