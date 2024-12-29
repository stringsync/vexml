import * as vexflow from 'vexflow';
import * as spatial from '@/spatial';
import { Voice } from './voice';

export class Stave {
  constructor(
    private ctx: vexflow.RenderContext,
    private voices: Array<Voice>,
    private vexflow: { stave: vexflow.Stave }
  ) {}

  getRect(): spatial.Rect {
    return spatial.Rect.merge(this.voices.map((voice) => voice.getRect()));
  }

  getVoices(): Array<Voice> {
    return this.voices;
  }

  getVexflowStave(): vexflow.Stave {
    return this.vexflow.stave;
  }

  draw(): this {
    this.vexflow.stave.draw();
    return this;
  }
}
