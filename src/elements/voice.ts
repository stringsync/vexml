import * as vexflow from 'vexflow';
import * as spatial from '@/spatial';
import { Note } from './note';

export class Voice {
  constructor(
    private ctx: vexflow.RenderContext,
    private entries: Array<Note>,
    private vexflow: { voice: vexflow.Voice }
  ) {}

  getRect(): spatial.Rect {
    return spatial.Rect.merge(this.entries.map((entry) => entry.getRect()));
  }

  getEntries(): Array<Note> {
    return this.entries;
  }

  getVexflowVoice(): vexflow.Voice {
    return this.vexflow.voice;
  }

  draw(): this {
    return this;
  }
}
