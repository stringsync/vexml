import * as vexflow from 'vexflow';
import { Rect } from '@/spatial';
import { Document } from './document';

export interface Formatter {
  format(): Document;
}

export interface Renderable {
  rect: Rect;
  layer: RenderLayer;
  render(ctx: vexflow.RenderContext): void;
}

export type RenderLayer = 'background' | 'foreground';

export type PartLabelKey = {
  partIndex: number;
};

export type SystemArrangement = {
  measureIndexes: number[];
};

export type SystemKey = {
  systemIndex: number;
};

export type MeasureKey = SystemKey & {
  measureIndex: number;
};

export type MeasureEntryKey = MeasureKey & {
  measureEntryIndex: number;
};

export type PartKey = MeasureEntryKey & {
  partIndex: number;
};

export type StaveKey = PartKey & {
  staveIndex: number;
};

export type VoiceKey = StaveKey & {
  voiceIndex: number;
};

export type VoiceEntryKey = VoiceKey & {
  voiceEntryIndex: number;
};

// Copied from /node_modules/vexflow/build/types/src/rendercontext.d.ts
export declare abstract class RenderContext {
  static get CATEGORY(): string;
  abstract clear(): void;
  abstract setFillStyle(style: string): this;
  abstract setBackgroundFillStyle(style: string): this;
  abstract setStrokeStyle(style: string): this;
  abstract setShadowColor(color: string): this;
  abstract setShadowBlur(blur: number): this;
  abstract setLineWidth(width: number): this;
  abstract setLineCap(capType: CanvasLineCap): this;
  abstract setLineDash(dashPattern: number[]): this;
  abstract scale(x: number, y: number): this;
  abstract rect(x: number, y: number, width: number, height: number): this;
  abstract resize(width: number, height: number): this;
  abstract fillRect(x: number, y: number, width: number, height: number): this;
  abstract clearRect(x: number, y: number, width: number, height: number): this;
  abstract pointerRect(x: number, y: number, width: number, height: number): this;
  abstract beginPath(): this;
  abstract moveTo(x: number, y: number): this;
  abstract lineTo(x: number, y: number): this;
  abstract bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): this;
  abstract quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): this;
  abstract arc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    counterclockwise: boolean
  ): this;
  abstract fill(attributes?: any): this;
  abstract stroke(): this;
  abstract closePath(): this;
  abstract fillText(text: string, x: number, y: number): this;
  abstract save(): this;
  abstract restore(): this;
  abstract openGroup(cls?: string, id?: string): any;
  abstract closeGroup(): void;
  abstract openRotation(angleDegrees: number, x: number, y: number): void;
  abstract closeRotation(): void;
  abstract add(child: any): void;
  abstract measureText(text: string): TextMeasure;
  abstract set fillStyle(style: string | CanvasGradient | CanvasPattern);
  abstract get fillStyle(): string | CanvasGradient | CanvasPattern;
  abstract set strokeStyle(style: string | CanvasGradient | CanvasPattern);
  abstract get strokeStyle(): string | CanvasGradient | CanvasPattern;
  abstract setFont(f?: string | FontInfo, size?: string | number, weight?: string | number, style?: string): this;
  abstract getFont(): string;
  set font(f: string);
  get font(): string;
}

// Copied from /node_modules/vexflow/build/types/src/rendercontext.d.ts
interface FontInfo {
  /** CSS font-family, e.g., 'Arial', 'Helvetica Neue, Arial, sans-serif', 'Times, serif' */
  family?: string;
  /**
   * CSS font-size (e.g., '10pt', '12px').
   * For backwards compatibility with 3.0.9, plain numbers are assumed to be specified in 'pt'.
   */
  size?: number | string;
  /** `bold` or a number (e.g., 900) as inspired by CSS font-weight. */
  weight?: string | number;
  /** `italic` as inspired by CSS font-style. */
  style?: string;
}

// Copied from /node_modules/vexflow/build/types/src/rendercontext.d.ts
interface TextMeasure {
  x: number;
  y: number;
  width: number;
  height: number;
}
