import { Address } from './address';
import * as drawables from '@/drawables';
import * as spatial from '@/spatial';

export type MessageMeasureInit = {
  /** The **absolute** measure index accounting for any previous measures that have been removed or inserted. */
  absoluteMeasureIndex: number;

  /** The message to be displayed over the measure. */
  message: string;

  /** The duration that the message measure should play for. */
  durationMs: number;

  /** The width of the messeage measure in pixels. It will be clamped to the width of the score. */
  width: number;
};

/** The result of rendering a MessageMeasure. */
export type MessageMeasureRendering = {
  type: 'messagemeasure';
  address: Address<'measure'>;
  index: number;
  width: number;
  durationMs: number;
  rect: drawables.Rect;
  text: drawables.Text;
};

/** A non-musical measure that displays a message. */
export class MessageMeasure {
  private index: number;
  private message: string;
  private durationMs: number;
  private width: number;

  constructor(opts: { index: number; message: string; durationMs: number; width: number }) {
    this.index = opts.index;
    this.message = opts.message;
    this.durationMs = opts.durationMs;
    this.width = opts.width;
  }

  render(opts: { x: number; y: number; address: Address<'measure'> }): MessageMeasureRendering {
    const rect = new drawables.Rect({
      rect: spatial.Rect.empty(),
      strokeStyle: 'black',
    });

    return {
      type: 'messagemeasure',
      address: opts.address,
      index: this.index,
      width: this.width,
      durationMs: this.durationMs,
      rect,
      text: new drawables.Text({
        content: this.message,
        x: 0,
        y: 0,
        size: '20px',
        family: 'Arial',
      }),
    };
  }
}
