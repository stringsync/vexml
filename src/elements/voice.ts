import * as vexflow from 'vexflow';
import * as spatial from '@/spatial';
import { Note } from './note';

export class Voice {
  constructor(private entries: Array<Note>, private vexflow: { voice: vexflow.Voice }) {}

  getRect(): spatial.Rect {
    return spatial.Rect.merge(this.entries.map((entry) => entry.getRect()));
  }

  getEntries(): Array<Note> {
    return this.entries;
  }

  setContext(ctx: vexflow.RenderContext): this {
    this.vexflow.voice.setContext(ctx);

    for (const entry of this.entries) {
      entry.setContext(ctx);
    }

    return this;
  }

  getVexflowVoice(): vexflow.Voice {
    return this.vexflow.voice;
  }

  draw(): this {
    return this;
  }
}
